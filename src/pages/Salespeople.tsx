import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2,
  X,
  Phone,
  Mail,
  Award
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Salesperson {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
}

export default function Salespeople() {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState<Salesperson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'salespeople'), 
      (snapshot) => {
        setSalespeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salesperson)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'salespeople')
    );
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      status: formData.get('status') as 'active' | 'inactive',
    };

    try {
      if (editingSalesperson) {
        await updateDoc(doc(db, 'salespeople', editingSalesperson.id), data);
      } else {
        await addDoc(collection(db, 'salespeople'), data);
      }
      setIsModalOpen(false);
      setEditingSalesperson(null);
    } catch (error) {
      handleFirestoreError(error, editingSalesperson ? OperationType.UPDATE : OperationType.CREATE, 'salespeople');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this salesperson record?')) {
      try {
        await deleteDoc(doc(db, 'salespeople', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `salespeople/${id}`);
      }
    }
  };

  const filteredSalespeople = salespeople.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Sales Team</h1>
          <p className="text-slate-500 font-medium">Manage agents and commission tracking</p>
        </div>
        <button 
          onClick={() => {
            setEditingSalesperson(null);
            setIsModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95"
        >
          <UserPlus size={18} strokeWidth={3} />
          Add Salesperson
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#161B22] border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-amber-500/20 transition-all text-white placeholder:text-slate-700 font-medium outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-600 font-black uppercase text-xs tracking-widest">Loading team members...</div>
        ) : filteredSalespeople.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-700 font-black uppercase text-xs tracking-widest">No salespeople found</div>
        ) : (
          filteredSalespeople.map((s) => (
            <motion.div 
              layout
              key={s.id}
              className="bg-[#161B22] border border-slate-800 rounded-3xl p-6 shadow-xl relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Award size={80} className="text-amber-500" />
              </div>
              
              <div className="flex items-start justify-between mb-6">
                <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                  <Award size={24} />
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                  s.status === 'active' 
                    ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" 
                    : "text-slate-500 bg-slate-900 border-slate-800"
                )}>
                  {s.status}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">{s.name}</h3>
              
              <div className="space-y-3 text-sm text-slate-400 mb-8 font-medium">
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-slate-600" />
                  {s.phone || 'No phone recorded'}
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-slate-600" />
                  {s.email || 'No email recorded'}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingSalesperson(s);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 bg-slate-900 border border-slate-800 hover:border-amber-500 text-slate-500 hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Edit2 size={14} className="inline mr-2" /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="px-4 bg-slate-900 border border-slate-800 hover:border-rose-500 text-slate-500 hover:text-rose-500 py-2.5 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                    {editingSalesperson ? 'Edit Representative' : 'Register Salesperson'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    Commission agent details
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Full Name</label>
                    <input name="name" defaultValue={editingSalesperson?.name} required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 outline-none transition-all font-bold" placeholder="e.g. Abdur Rahman" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Contact Number</label>
                      <input name="phone" defaultValue={editingSalesperson?.phone} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 outline-none transition-all font-medium" placeholder="01712..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Email Address</label>
                      <input name="email" type="email" defaultValue={editingSalesperson?.email} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 outline-none transition-all font-medium" placeholder="rahman@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Engagement Status</label>
                    <select name="status" defaultValue={editingSalesperson?.status || 'active'} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 outline-none transition-all font-bold">
                      <option value="active">Active Agent</option>
                      <option value="inactive">Inactive / On Leave</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-4 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95">
                    {editingSalesperson ? 'Update Profile' : 'Register Member'}
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
