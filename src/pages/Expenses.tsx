import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Plus, 
  Trash2,
  Calendar,
  Tag,
  DollarSign,
  X,
  Receipt as ReceiptIcon
} from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  accountId: string;
  accountName: string;
  date: any;
  status: 'paid' | 'unpaid';
}

interface Account {
  id: string;
  name: string;
  type: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubExpenses = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      setExpenses(docs);
      setLoading(false);
    });

    const unsubAccounts = onSnapshot(query(collection(db, 'accounts'), orderBy('name', 'asc')), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Account[];
      setAccounts(docs.filter(acc => acc.type === 'Expense'));
    });

    return () => {
      unsubExpenses();
      unsubAccounts();
    };
  }, []);

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.accountName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const accountId = formData.get('accountId') as string;
    const account = accounts.find(a => a.id === accountId);

    const data = {
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      accountId: accountId,
      accountName: account?.name || 'Uncategorized',
      date: Timestamp.fromDate(new Date(formData.get('date') as string)),
      status: formData.get('status') as 'paid' | 'unpaid',
    };

    try {
      await addDoc(collection(db, 'expenses'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
      }
    }
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Expense Tracking</h1>
          <p className="text-slate-500 font-medium">Monitor business costs and accounts payable</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(244,63,94,0.2)] active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Record Expense
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#161B22] p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ReceiptIcon size={64} className="text-rose-500" />
            </div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Monthly Outflow</h3>
            <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalExpenses)}</p>
            <div className="mt-6 flex items-center gap-2 text-[10px] text-rose-500 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl font-black uppercase tracking-widest">
              <DollarSign size={14} strokeWidth={3} />
              Verified records
            </div>
          </div>
          
          <div className="bg-[#0F1218] p-8 rounded-3xl border border-slate-800/50 text-white shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-6">Accounting Tips</h3>
            <ul className="space-y-6 text-sm">
              <li className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                <p className="text-slate-400 font-medium leading-relaxed">Scan and attach digital copies of all receipts for tax compliance.</p>
              </li>
              <li className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                <p className="text-slate-400 font-medium leading-relaxed">Categorize expenses to generate accurate P&L statements.</p>
              </li>
              <li className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <p className="text-slate-400 font-medium leading-relaxed">Audit unpaid expenses every Friday to maintain healthy cashflow.</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="text" 
              placeholder="Search expenses by description or category..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161B22] border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all text-white placeholder:text-slate-700 font-medium outline-none"
            />
          </div>

          <div className="bg-[#161B22] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0F1218] text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-5">Expense Details</th>
                    <th className="px-6 py-5">Account Category</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5 text-right">Amount</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-500 uppercase font-black text-xs tracking-widest">Loading records...</td></tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-600 uppercase font-black text-xs tracking-widest">No expense records found</td></tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-5">
                          <p className="font-bold text-white group-hover:text-rose-400 transition-colors">{e.description}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-800">
                            <Tag size={10} />
                            {e.accountName || 'Expense'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-slate-500 text-xs font-semibold">
                          {e.date ? formatDate(e.date.toDate()) : 'N/A'}
                        </td>
                        <td className="px-6 py-5 font-black text-rose-500 text-right text-lg tracking-tighter tabular-nums">{formatCurrency(e.amount)}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all",
                            e.status === 'paid' 
                              ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" 
                              : "text-amber-500 bg-amber-500/5 border-amber-500/10"
                          )}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-600 hover:text-rose-500 hover:border-rose-500 transition-all active:scale-90"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-[#0F1218] border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">Record Outflow</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Expense log entry</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Description / Narration</label>
                    <input name="description" placeholder="e.g. Electricity bill, Raw material purchase" required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all placeholder:text-slate-700 font-medium" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Transaction Amount</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">Tk</div>
                        <input type="number" name="amount" step="0.01" required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-rose-500 font-black text-lg focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all tracking-tighter tabular-nums" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Expense Account</label>
                      <select name="accountId" required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all font-bold">
                        <option value="">Select Category</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Expense Date</label>
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payment Status</label>
                      <select name="status" className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all font-bold">
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid / Pending</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-rose-500/10 active:scale-95">
                    Submit Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
