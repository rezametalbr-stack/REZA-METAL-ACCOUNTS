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
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Download,
  Filter,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  Upload,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy, query, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, cn, handleFirestoreError, OperationType, CURRENCY_SYMBOL } from '../lib/utils';
import { downloadCSV } from '../lib/csvExport';
import { motion, AnimatePresence } from 'motion/react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  accountId: string;
  accountName: string;
  date: any;
  status: 'paid' | 'unpaid';
  receiptUrl?: string;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.defaultExpenseAccountId) {
            setDefaultAccountId(data.defaultExpenseAccountId);
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();

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

  const filteredExpenses = expenses
    .filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.accountName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || e.accountId === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = a.date?.toDate?.() || new Date(0);
      const dateB = b.date?.toDate?.() || new Date(0);
      return sortOrder === 'desc' 
        ? dateB.getTime() - dateA.getTime() 
        : dateA.getTime() - dateB.getTime();
    });

  const handleExport = () => {
    setIsExporting(true);
    const headers = {
      description: 'Description',
      amount: `Amount (${CURRENCY_SYMBOL})`,
      accountName: 'Category',
      date: 'Date',
      status: 'Status'
    };

    const data = filteredExpenses.map(e => ({
      description: e.description,
      amount: e.amount,
      accountName: e.accountName,
      date: e.date ? formatDate(e.date.toDate()) : 'N/A',
      status: e.status
    }));

    downloadCSV(data, 'Expense_Report', headers);
    setTimeout(() => setIsExporting(false), 500);
  };

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
      receiptUrl: receiptUrl
    };

    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), data);
      } else {
        await addDoc(collection(db, 'expenses'), data);
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      handleFirestoreError(error, editingExpense ? OperationType.UPDATE : OperationType.CREATE, editingExpense ? `expenses/${editingExpense.id}` : 'expenses');
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setReceiptUrl(expense.receiptUrl || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setReceiptUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) { // 800KB limit
      alert("Receipt image is too large. Please select an image under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
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
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-[#161B22] border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-700 font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
          >
            <Download size={14} strokeWidth={3} className={cn(isExporting && "animate-bounce")} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(244,63,94,0.2)] active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            Record Expense
          </button>
        </div>
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
              Records in {CURRENCY_SYMBOL}
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

        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#161B22]/50 p-2 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="text" 
                placeholder="Search expenses by description or category..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0B0D11]/50 border border-slate-800/50 rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500/30 transition-all text-white placeholder:text-slate-700 font-medium outline-none text-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="relative group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-rose-500 transition-colors" size={14} />
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#0B0D11] border border-slate-800 rounded-xl py-2 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-700 outline-none transition-all appearance-none"
                >
                  <option value="all">All Categories</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={12} />
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#0B0D11] rounded-xl border border-slate-800">
                {(['all', 'paid', 'unpaid'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    statusFilter === filter 
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

          <div className="bg-[#161B22] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0F1218] text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-5">Expense Details</th>
                    <th className="px-6 py-5">Account Category</th>
                    <th className="px-6 py-5 text-center">Receipt</th>
                    <th className="px-6 py-5">
                      <button 
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        Date
                        {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                      </button>
                    </th>
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
                        <td className="px-6 py-5 text-center">
                          {e.receiptUrl ? (
                            <button 
                              onClick={() => setViewingReceipt(e.receiptUrl!)}
                              className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500 hover:text-amber-400 hover:border-amber-500/50 transition-all mx-auto group/receipt shadow-lg shadow-amber-500/5"
                            >
                              <FileText size={14} className="group-hover/receipt:scale-110 transition-transform" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest italic">No Receipt</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-slate-500 text-xs font-semibold">
                          {e.date ? formatDate(e.date.toDate()) : 'N/A'}
                        </td>
                        <td className="px-6 py-5 font-black text-rose-500 text-right text-lg tracking-tighter tabular-nums">{formatCurrency(e.amount)}</td>
                        <td className="px-6 py-5 text-center">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditModal(e)}
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-600 hover:text-emerald-500 hover:border-emerald-500 transition-all active:scale-90"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(e.id)}
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-600 hover:text-rose-500 hover:border-rose-500 transition-all active:scale-90"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 bg-[#0F1218] border-b border-slate-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                    {editingExpense ? 'Modify Outflow' : 'Record Outflow'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    {editingExpense ? 'Updating existing record' : 'Expense log entry'}
                  </p>
                </div>
                <button onClick={closeModal} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Description / Narration</label>
                      <input 
                        name="description" 
                        placeholder="e.g. Electricity bill, Raw material purchase" 
                        defaultValue={editingExpense?.description}
                        required 
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all placeholder:text-slate-700 font-medium" 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Transaction Amount</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">{CURRENCY_SYMBOL}</div>
                          <input 
                            type="number" 
                            name="amount" 
                            step="0.01" 
                            defaultValue={editingExpense?.amount}
                            required 
                            className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-rose-500 font-black text-lg focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all tracking-tighter tabular-nums" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Expense Account</label>
                        <select 
                          key={editingExpense?.id || 'new'}
                          name="accountId" 
                          required 
                          defaultValue={editingExpense?.accountId || defaultAccountId}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all font-bold"
                        >
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
                        <input 
                          type="date" 
                          name="date" 
                          required 
                          defaultValue={editingExpense?.date ? new Date(editingExpense.date.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all font-bold" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payment Status</label>
                        <select 
                          name="status" 
                          defaultValue={editingExpense?.status || 'paid'}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all font-bold"
                        >
                          <option value="paid">Paid</option>
                          <option value="unpaid">Unpaid / Pending</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Receipt Attachment (Optional)</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-[#0B0D11] border border-slate-800 border-dashed rounded-xl text-slate-400 hover:text-white hover:border-amber-500 transition-all font-bold group"
                          >
                            <Upload size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs uppercase tracking-widest font-black">Choose Image</span>
                          </button>
                          {receiptUrl && (
                            <button 
                              type="button" 
                              onClick={() => setReceiptUrl('')}
                              className="w-12 h-12 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        
                        {receiptUrl && (
                          <div className="relative aspect-video rounded-xl border border-slate-800 overflow-hidden group/preview">
                            <img 
                              src={receiptUrl} 
                              alt="Receipt Preview" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                type="button"
                                onClick={() => setViewingReceipt(receiptUrl)}
                                className="p-2 bg-white/10 backdrop-blur-md rounded-lg text-white hover:bg-white/20 transition-all"
                              >
                                <Search size={20} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 px-4 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-rose-500/10 active:scale-95">
                      {editingExpense ? 'Update Record' : 'Submit Record'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingReceipt(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
            >
              <button 
                onClick={() => setViewingReceipt(null)}
                className="absolute -top-12 right-0 text-white hover:text-rose-500 transition-colors flex items-center gap-2 font-black uppercase tracking-widest text-xs"
              >
                Close Receipt <X size={20} />
              </button>
              <div className="bg-[#161B22] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
                <img 
                  src={viewingReceipt} 
                  alt="Full Receipt" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: Expense['status'] }) {
  const configs = {
    paid: { 
      icon: CheckCircle2, 
      class: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]", 
      label: "Paid" 
    },
    unpaid: { 
      icon: AlertCircle, 
      class: "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]", 
      label: "Pending" 
    },
  };

  const { icon: Icon, class: className, label } = configs[status];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border transition-all mx-auto",
      className
    )}>
      <span className="relative flex h-2 w-2">
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          status === 'paid' ? "bg-emerald-400" : "bg-amber-400"
        )}></span>
        <span className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          status === 'paid' ? "bg-emerald-500" : "bg-amber-500"
        )}></span>
      </span>
      {label}
    </span>
  );
}
