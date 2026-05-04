import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  X
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
      setCustomers(docs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      balance: Number(formData.get('balance')) || 0,
    };

    if (editingCustomer) {
      try {
        await updateDoc(doc(db, 'customers', editingCustomer.id), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `customers/${editingCustomer.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'customers'), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'customers');
      }
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Customer Directory</h1>
          <p className="text-slate-500 font-medium">Manage client relations and accounts receivable</p>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setIsModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Add Customer
        </button>
      </div>

      <div className="bg-[#161B22] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#0F1218]">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Customer Accounts</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Filter spreadsheet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none w-64 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11]">
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Name</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Phone</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Email</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Address</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Balance</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Loading ledger...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No records found</td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3 px-6 border-r border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 font-black text-xs border border-amber-500/20">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-bold text-white text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans">{c.phone || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans">{c.email || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans truncate max-w-[200px]">{c.address || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-right">
                      <span className={cn(
                        "font-mono text-sm font-bold",
                        c.balance > 0 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {formatCurrency(c.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingCustomer(c);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-500 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
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

      {/* Modal */}
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
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {editingCustomer ? 'EDIT CLIENT' : 'NEW CLIENT'}
                  </h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                    {editingCustomer ? 'Update details' : 'Registration form'}
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Customer Full Name</label>
                    <input name="name" defaultValue={editingCustomer?.name} required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700" placeholder="e.g. John Doe" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Phone Number</label>
                      <input name="phone" defaultValue={editingCustomer?.phone} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700" placeholder="+880..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Email Address</label>
                      <input type="email" name="email" defaultValue={editingCustomer?.email} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700" placeholder="client@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Office/Home Address</label>
                    <textarea name="address" defaultValue={editingCustomer?.address} rows={3} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700 resize-none" placeholder="Full street address..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Initial Balance (Debit)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Tk</div>
                      <input type="number" name="balance" defaultValue={editingCustomer?.balance || 0} step="0.01" className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all font-bold tracking-tight" />
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-xl font-bold uppercase tracking-widest text-xs transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                    {editingCustomer ? 'Update Client' : 'Add Client'}
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
