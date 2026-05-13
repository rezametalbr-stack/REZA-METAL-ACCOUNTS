import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  X,
  Filter,
  Calendar as CalendarIcon,
  User,
  ShoppingBag,
  Package,
  CheckCircle,
  Edit2
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: any;
  status: 'pending' | 'completed';
  relatedTo?: {
    type: 'customer' | 'supplier' | 'inventory';
    id: string;
    name: string;
  };
  createdAt: any;
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'customer' | 'supplier' | 'inventory'>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    relatedType: 'customer' as 'customer' | 'supplier' | 'inventory' | '',
    relatedId: '',
    relatedName: ''
  });

  // For looking up entities to relate to
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Helper to get local ISO string for datetime-local input
  const getLocalISOString = (date: Date) => {
    if (!date) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      dueDate: getLocalISOString(new Date())
    }));

    const q = query(collection(db, 'reminders'), orderBy('dueDate', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reminder[];
      setReminders(docs);
      setLoading(false);
    });

    const unsubC = onSnapshot(collection(db, 'customers'), (s) => setCustomers(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubS = onSnapshot(collection(db, 'suppliers'), (s) => setSuppliers(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubP = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => {
      unsub();
      unsubC();
      unsubS();
      unsubP();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = new Date();
    const selectedDate = new Date(formData.dueDate);
    
    if (selectedDate < now) {
      alert("Please select a future date and time for the reminder.");
      return;
    }

    try {
      const reminderData: any = {
        title: formData.title,
        description: formData.description,
        dueDate: Timestamp.fromDate(new Date(formData.dueDate)),
        status: editingReminder ? editingReminder.status : 'pending',
        updatedAt: Timestamp.now()
      };

      if (!editingReminder) {
        reminderData.createdAt = Timestamp.now();
      }

      if (formData.relatedType && formData.relatedId) {
        reminderData.relatedTo = {
          type: formData.relatedType,
          id: formData.relatedId,
          name: formData.relatedName
        };
      }

      if (editingReminder) {
        await updateDoc(doc(db, 'reminders', editingReminder.id), reminderData);
      } else {
        await addDoc(collection(db, 'reminders'), reminderData);
      }

      setIsModalOpen(false);
      setEditingReminder(null);
      setFormData({
        title: '',
        description: '',
        dueDate: getLocalISOString(new Date()),
        relatedType: '',
        relatedId: '',
        relatedName: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (r: Reminder) => {
    setEditingReminder(r);
    setFormData({
      title: r.title,
      description: r.description,
      dueDate: getLocalISOString(r.dueDate.toDate()),
      relatedType: r.relatedTo?.type || '',
      relatedId: r.relatedTo?.id || '',
      relatedName: r.relatedTo?.name || ''
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (reminder: Reminder) => {
    try {
      await updateDoc(doc(db, 'reminders', reminder.id), {
        status: reminder.status === 'pending' ? 'completed' : 'pending'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReminder = async (id: string) => {
    if (window.confirm('Delete this reminder?')) {
      try {
        await deleteDoc(doc(db, 'reminders', id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredReminders = reminders.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.relatedTo?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filter === 'all' || r.status === filter;
    const matchesCategory = categoryFilter === 'all' || r.relatedTo?.type === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getEntityIcon = (type?: string) => {
    switch (type) {
      case 'customer': return <User size={12} className="text-emerald-500" />;
      case 'supplier': return <ShoppingBag size={12} className="text-amber-500" />;
      case 'inventory': return <Package size={12} className="text-cyan-500" />;
      default: return <Bell size={12} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 bg-amber-500 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
              <Bell size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">Follow-ups</h1>
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] ml-1">Task Management & Reminders</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-amber-500/10"
        >
          <Plus size={18} strokeWidth={3} />
          <span>New Reminder</span>
        </button>
      </div>

      <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between pb-6 border-b border-slate-800/50 mb-6 font-sans">
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-amber-500" size={18} />
            <input 
              type="text" 
              placeholder="Search tasks, descriptions or contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-slate-700" 
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex bg-[#0B0D11] p-1 rounded-xl border border-slate-800">
              {(['all', 'pending', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === s ? "bg-amber-500 text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-slate-800 mx-1 hidden lg:block" />

            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-[#0B0D11] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">Every Category</option>
                <option value="customer">Customers</option>
                <option value="supplier">Suppliers</option>
                <option value="inventory">Inventory</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <div className="inline-block h-8 w-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-600 font-black uppercase text-xs tracking-widest">Loading reminders...</p>
              </div>
            ) : filteredReminders.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-3xl">
                <Bell size={48} className="mx-auto text-slate-800 mb-4 opacity-20" />
                <p className="text-slate-600 font-black uppercase text-xs tracking-widest">No reminders found</p>
              </div>
            ) : (
              filteredReminders.map((r) => {
                const isOverdue = new Date(r.dueDate.toDate()) < new Date() && r.status === 'pending';
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      "group p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden",
                      r.status === 'completed' 
                        ? "bg-[#0B0D11]/40 border-slate-800/50 opacity-60" 
                        : isOverdue 
                          ? "bg-rose-500/5 border-rose-500/20 shadow-lg shadow-rose-500/5"
                          : "bg-[#1C2128] border-slate-800 hover:border-slate-700 shadow-xl"
                    )}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button 
                        onClick={() => openEditModal(r)}
                        className="p-2 text-slate-500 hover:text-amber-500 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteReminder(r.id)}
                        className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <button 
                        onClick={() => toggleStatus(r)}
                        className={cn(
                          "mt-1 flex-shrink-0 transition-colors",
                          r.status === 'completed' ? "text-emerald-500" : "text-slate-700 hover:text-amber-500"
                        )}
                      >
                        {r.status === 'completed' ? <CheckCircle2 size={24} /> : <div className="h-6 w-6 rounded-full border-2 border-current" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h3 className={cn(
                          "font-black text-sm uppercase tracking-tight mb-1 truncate",
                          r.status === 'completed' ? "text-slate-600 line-through" : "text-white"
                        )}>
                          {r.title}
                        </h3>
                        <p className={cn(
                          "text-xs leading-relaxed line-clamp-2",
                          r.status === 'completed' ? "text-slate-700" : "text-slate-400"
                        )}>
                          {r.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-800/50">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight",
                        isOverdue ? "bg-rose-500/10 text-rose-500" : "bg-slate-800 text-slate-400"
                      )}>
                        <Clock size={12} />
                        {new Date(r.dueDate.toDate()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {r.relatedTo && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 text-[10px] font-black uppercase tracking-tight text-slate-500 border border-slate-800">
                          {getEntityIcon(r.relatedTo.type)}
                          <span className="truncate max-w-[80px]">{r.relatedTo.name}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
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
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#1c2128]">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">{editingReminder ? 'Edit Reminder' : 'New Reminder'}</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{editingReminder ? 'Update follow-up details' : 'Add follow-up task'}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-[#0B0D11] text-slate-500 hover:text-white rounded-2xl transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Task Title</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-800" 
                      placeholder="e.g., Call customer for delivery status" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-800 min-h-[100px]" 
                      placeholder="Add more details about the follow-up..." 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Due Date & Time</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          required
                          type="datetime-local" 
                          min={getLocalISOString(new Date())}
                          value={formData.dueDate}
                          onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white focus:border-amber-500 outline-none transition-all" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Related To</label>
                      <select 
                        value={formData.relatedType}
                        onChange={(e) => setFormData({...formData, relatedType: e.target.value as any, relatedId: '', relatedName: ''})}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-amber-500 outline-none transition-all"
                      >
                        <option value="">No Relation</option>
                        <option value="customer">Customer</option>
                        <option value="supplier">Supplier</option>
                        <option value="inventory">Inventory</option>
                      </select>
                    </div>
                  </div>

                  {formData.relatedType && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10"
                    >
                      <label className="block text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2 px-1 italic">Select {formData.relatedType}:</label>
                      <select 
                        required
                        value={formData.relatedId}
                        onChange={(e) => {
                          const id = e.target.value;
                          let name = '';
                          if (formData.relatedType === 'customer') name = customers.find(c => c.id === id)?.name || '';
                          if (formData.relatedType === 'supplier') name = suppliers.find(s => s.id === id)?.name || '';
                          if (formData.relatedType === 'inventory') name = products.find(p => p.id === id)?.name || '';
                          setFormData({...formData, relatedId: id, relatedName: name});
                        }}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-amber-500"
                      >
                        <option value="">-- Search {formData.relatedType} --</option>
                        {formData.relatedType === 'customer' && customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        {formData.relatedType === 'supplier' && suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        {formData.relatedType === 'inventory' && products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </motion.div>
                  )}
                </div>

                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingReminder(null); }} className="flex-1 px-4 py-4 bg-[#0B0D11] text-slate-500 font-bold uppercase tracking-widest text-[10px] rounded-2xl border border-slate-800">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-4 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-95">{editingReminder ? 'Update Task' : 'Set Task'}</button>
                  </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
