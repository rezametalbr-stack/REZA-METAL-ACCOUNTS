import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  X,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  DollarSign,
  PieChart,
  Briefcase
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType, cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subType?: string;
  description?: string;
  balance: number;
  isActive: boolean;
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Asset' as Account['type'],
    subType: '',
    description: '',
    isActive: true,
    balance: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('code', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'accounts');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const docRef = doc(db, 'accounts', editingAccount.id);
        await updateDoc(docRef, formData);
      } else {
        await addDoc(collection(db, 'accounts'), formData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'accounts');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await deleteDoc(doc(db, 'accounts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'accounts');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'Asset',
      subType: '',
      description: '',
      isActive: true,
      balance: 0
    });
    setEditingAccount(null);
  };

  const handleEdit = (acc: Account) => {
    setEditingAccount(acc);
    setFormData({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      subType: acc.subType || '',
      description: acc.description || '',
      isActive: acc.isActive,
      balance: acc.balance
    });
    setIsModalOpen(true);
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         acc.code.includes(searchTerm);
    const matchesType = selectedType === 'All' || acc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Asset': return <DollarSign size={16} />;
      case 'Liability': return <TrendingUp size={16} className="rotate-180" />;
      case 'Equity': return <PieChart size={16} />;
      case 'Revenue': return <TrendingUp size={16} />;
      case 'Expense': return <Briefcase size={16} />;
      default: return <BookOpen size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Asset': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Liability': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'Equity': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Revenue': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Expense': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <BookOpen className="text-indigo-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Chart of Accounts</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Global Financial Structure & Ledger Mapping</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none w-full md:w-72 transition-all font-sans font-medium"
            />
          </div>
          <button 
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] px-8 py-5 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            New Account
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-3">
        {['All', ...ACCOUNT_TYPES].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={cn(
              "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
              selectedType === type 
                ? "bg-slate-100 text-black border-white shadow-lg" 
                : "bg-[#161B22] text-slate-500 border-slate-800 hover:border-slate-600"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Accounts List */}
      <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11]">
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Code</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Account Name</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Type</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Sub-Type</th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Balance</th>
                <th className="text-center py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Ledger...</td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No accounts found in current scope</td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <span className="font-mono text-sm font-black text-indigo-400">{acc.code}</span>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{acc.name}</span>
                        {acc.description && <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{acc.description}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        getTypeColor(acc.type)
                      )}>
                        {getTypeIcon(acc.type)}
                        {acc.type}
                      </div>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <span className="text-xs text-slate-400 font-medium">{acc.subType || '---'}</span>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50 text-right">
                      <span className="font-mono text-sm font-black text-slate-300">{formatCurrency(acc.balance)}</span>
                    </td>
                    <td className="py-4 px-8">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(acc)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-500 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(acc.id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
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

      {/* Account Modal */}
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-[#161B22] rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                      <BookOpen className="text-indigo-500" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter">
                        {editingAccount ? 'Edit Account' : 'New Account Definition'}
                      </h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Maintain accounting integrity</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Code</label>
                      <input
                        required
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all font-mono font-bold"
                        placeholder="1000"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Account Name</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all font-bold"
                        placeholder="Cash at Bank"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Account Type</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all font-bold"
                      >
                        {ACCOUNT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Sub-Type</label>
                      <input
                        type="text"
                        value={formData.subType}
                        onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all font-bold"
                        placeholder="Current Asset"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description (Optional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all font-sans h-24 resize-none"
                      placeholder="Purpose of this account..."
                    />
                  </div>

                  <div className="flex items-center gap-3 bg-[#0B0D11] p-4 rounded-2xl border border-slate-800">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-bold text-slate-300">Account is active and available for entries</label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl transition-all shadow-xl shadow-indigo-500/10 active:scale-[0.98] mt-4"
                  >
                    {editingAccount ? 'Update Definition' : 'Synchronize Account'}
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
