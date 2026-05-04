import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  DollarSign,
  X
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, handleFirestoreError, OperationType, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    balance: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), formData);
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...formData,
          balance: Number(formData.balance)
        });
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', balance: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'suppliers');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      balance: supplier.balance
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'suppliers');
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Truck className="text-amber-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Suppliers</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Vendor Network & Procurement</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all font-sans font-medium"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-amber-500/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Onboard Vendor
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161B22] p-6 rounded-3xl border border-slate-800/50">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Vendors</p>
          <p className="text-3xl font-black text-white tracking-tighter">{suppliers.length}</p>
        </div>
        <div className="bg-[#161B22] p-6 rounded-3xl border border-slate-800/50">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Total Payable</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(suppliers.reduce((acc, s) => acc + s.balance, 0))}
          </p>
        </div>
      </div>

      <div className="bg-[#161B22] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#0F1218]">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Supplier Ledger</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Filter vendors..."
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
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Company Name</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Primary Contact</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Phone</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Email</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Location</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Payable</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No vendor records found</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3 px-6 border-r border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 font-black text-xs border border-amber-500/20">
                          {supplier.name.charAt(0)}
                        </div>
                        <span className="font-bold text-white text-sm truncate max-w-[150px]">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans">{supplier.contactPerson || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans">{supplier.phone || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans truncate max-w-[150px]">{supplier.email || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans truncate max-w-[150px]">{supplier.address || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-right">
                      <span className={cn(
                        "font-mono text-sm font-bold",
                        supplier.balance > 0 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {formatCurrency(supplier.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(supplier)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-500 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(supplier.id)}
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
              className="relative w-full max-w-xl bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                      <Truck className="text-amber-500" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter">
                        {editingSupplier ? 'Modify Vendor' : 'New Vendor'}
                      </h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Provider Relationship Details</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vendor/Company Name</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans font-bold"
                        placeholder="e.g. Zenith Metals Ltd."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contact Person</label>
                        <input
                          type="text"
                          value={formData.contactPerson}
                          onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Physical Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans h-24 resize-none"
                      />
                    </div>

                    {!editingSupplier && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-1">Initial Opening Balance (Payable)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                          <input
                            type="number"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                            className="w-full bg-[#0B0D11] font-black text-xl border border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-rose-500 focus:border-rose-500/50 outline-none transition-all font-sans"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl transition-all shadow-xl shadow-amber-500/10 active:scale-[0.98] mt-4"
                  >
                    {editingSupplier ? 'Update Vendor Profile' : 'Confirm Vendor Onboarding'}
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
