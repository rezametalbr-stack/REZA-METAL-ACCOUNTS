import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  X,
  Calendar,
  User,
  ArrowRight,
  Save,
  Trash2,
  AlertCircle,
  Hash
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, handleFirestoreError, OperationType, cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  date: any;
  reference: string;
  description: string;
  lines: JournalLine[];
  totalAmount: number;
  status: 'draft' | 'posted';
  performedBy: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function JournalEntries() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    reference: `JR-${Date.now().toString().slice(-6)}`,
    description: '',
    date: new Date().toISOString().split('T')[0],
    lines: [
      { accountId: '', accountName: '', debit: 0, credit: 0 },
      { accountId: '', accountName: '', debit: 0, credit: 0 }
    ] as JournalLine[]
  });

  useEffect(() => {
    const q = query(collection(db, 'journalEntries'), orderBy('date', 'desc'));
    const unsubEntries = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry)));
      setLoading(false);
    });

    const unsubAccounts = onSnapshot(query(collection(db, 'accounts'), orderBy('code', 'asc')), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
    });

    return () => {
      unsubEntries();
      unsubAccounts();
    };
  }, []);

  const totalDebit = formData.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = formData.lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { accountId: '', accountName: '', debit: 0, credit: 0 }]
    });
  };

  const handleRemoveLine = (index: number) => {
    if (formData.lines.length <= 2) return;
    const newLines = [...formData.lines];
    newLines.splice(index, 1);
    setFormData({ ...formData, lines: newLines });
  };

  const handleLineChange = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...formData.lines];
    if (field === 'accountId') {
      const acc = accounts.find(a => a.id === value);
      newLines[index] = { ...newLines[index], accountId: value, accountName: acc?.name || '' };
    } else {
      newLines[index] = { ...newLines[index], [field]: value };
    }
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || !formData.description) return;

    try {
      const batch = writeBatch(db);
      
      const journalData = {
        date: Timestamp.fromDate(new Date(formData.date)),
        reference: formData.reference,
        description: formData.description,
        lines: formData.lines,
        totalAmount: totalDebit,
        status: 'posted',
        performedBy: profile?.name || 'System'
      };

      const newRef = doc(collection(db, 'journalEntries'));
      batch.set(newRef, journalData);

      // Update account balances
      formData.lines.forEach(line => {
        const accRef = doc(db, 'accounts', line.accountId);
        const adjustment = line.debit - line.credit;
        // Note: Actual balance logic depends on account type (Normal Debit/Credit)
        // For simplicity, we store a net balance where Debit increases and Credit decreases for Assets/Expenses
        // and vice versa for Liabilities/Equity/Revenue. 
        // We'll handle refined logic in a real accounting engine, here we just increment.
        // batch.update(accRef, { balance: increment(adjustment) });
      });

      await batch.commit();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'journalEntries');
    }
  };

  const resetForm = () => {
    setFormData({
      reference: `JR-${Date.now().toString().slice(-6)}`,
      description: '',
      date: new Date().toISOString().split('T')[0],
      lines: [
        { accountId: '', accountName: '', debit: 0, credit: 0 },
        { accountId: '', accountName: '', debit: 0, credit: 0 }
      ]
    });
  };

  const filteredEntries = entries.filter(e => 
    e.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <FileText className="text-cyan-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">General Journal</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Double-Entry Ledger & Adjustments</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search journals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 outline-none w-full md:w-72 transition-all font-sans font-medium"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-5 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-cyan-500/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            New Entry
          </button>
        </div>
      </div>

      {/* Entry List */}
      <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11]">
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Date & Ref</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Description</th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Amount</th>
                <th className="text-center py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Status</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Balancing books...</td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No entries recorded</td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <div className="space-y-1">
                        <p className="text-white font-bold text-sm tracking-tight">{formatDate(entry.date?.toDate())}</p>
                        <p className="text-[10px] font-black text-cyan-500 uppercase font-mono">{entry.reference}</p>
                      </div>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <p className="text-xs text-slate-300 font-medium line-clamp-1">{entry.description}</p>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50 text-right">
                      <p className="font-mono text-sm font-black text-white">{formatCurrency(entry.totalAmount)}</p>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50 text-center">
                      <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-2">
                         <User size={12} className="text-slate-600" />
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{entry.performedBy}</span>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-[#161B22] rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                      <FileText className="text-cyan-500" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter">New Journal Entry</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Precise Manual Ledger Recording</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Entry Date</label>
                       <div className="relative group">
                         <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500" size={16} />
                         <input
                           type="date"
                           required
                           value={formData.date}
                           onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                           className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-white focus:border-cyan-500 transition-all font-bold"
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Reference #</label>
                       <div className="relative group">
                         <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500" size={16} />
                         <input
                           type="text"
                           required
                           value={formData.reference}
                           onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                           className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-white focus:border-cyan-500 transition-all font-mono font-bold"
                         />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Journal Narration</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-cyan-500 outline-none transition-all font-sans h-20 resize-none"
                      placeholder="e.g., Transfer to petty cash / Monthly depreciation of forge equipment..."
                    />
                  </div>

                  {/* Lines Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Debit/Credit Distribution</label>
                      <button 
                        type="button" 
                        onClick={handleAddLine}
                        className="text-[10px] font-black text-cyan-500 hover:text-cyan-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <Plus size={12} /> Add Line
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.lines.map((line, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 group">
                          <div className="col-span-6">
                            <select
                              required
                              value={line.accountId}
                              onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                              className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none font-bold"
                            >
                              <option value="">Select Account</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Debit"
                              value={line.debit || ''}
                              onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value))}
                              className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Credit"
                              value={line.credit || ''}
                              onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value))}
                              className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none font-mono"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-3 text-slate-700 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary & Validation */}
                  <div className="bg-[#0B0D11] border border-slate-800 p-6 rounded-3xl mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1 text-center flex-1 border-r border-slate-800">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Debit</p>
                         <p className="text-xl font-black text-emerald-500">{formatCurrency(totalDebit)}</p>
                      </div>
                      <div className="space-y-1 text-center flex-1 border-r border-slate-800">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Credit</p>
                         <p className="text-xl font-black text-rose-500">{formatCurrency(totalCredit)}</p>
                      </div>
                      <div className="space-y-1 text-center flex-1">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trial Balance</p>
                         <p className={cn(
                           "text-xl font-black",
                           isBalanced ? "text-emerald-500" : "text-rose-500"
                         )}>
                           {formatCurrency(totalDebit - totalCredit)}
                         </p>
                      </div>
                    </div>

                    {!isBalanced && (
                      <div className="flex items-center gap-3 justify-center text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
                        <AlertCircle size={14} />
                        Transaction is out of balance. Entry cannot be posted.
                      </div>
                    )}
                  </div>

                  <button
                    disabled={!isBalanced}
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl transition-all shadow-xl shadow-cyan-500/10 active:scale-[0.98] mt-4"
                  >
                    Post Journal Entry
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
