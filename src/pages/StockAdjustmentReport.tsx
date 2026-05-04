import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Package, 
  User, 
  AlertCircle,
  X,
  History,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, Timestamp, increment, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, handleFirestoreError, OperationType, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  type: 'addition' | 'deduction';
  reason: string;
  date: any;
  performedBy: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

export default function StockAdjustmentReport() {
  const { profile } = useAuth();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    productId: '',
    type: 'deduction' as 'addition' | 'deduction',
    quantity: 0,
    reason: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'stockAdjustments'), orderBy('date', 'desc'));
    const unsubAdjustments = onSnapshot(q, (snapshot) => {
      setAdjustments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockAdjustment)));
      setLoading(false);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    return () => {
      unsubAdjustments();
      unsubProducts();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || formData.quantity <= 0 || !formData.reason) return;

    const product = products.find(p => p.id === formData.productId);
    if (!product) return;

    const adjustmentAmount = formData.type === 'addition' ? formData.quantity : -formData.quantity;

    try {
      const batch = writeBatch(db);
      
      // 1. Create adjustment record
      const adjustmentData = {
        adjustmentNumber: `ADJ-${Date.now().toString().slice(-6)}`,
        productId: formData.productId,
        productName: product.name,
        quantity: adjustmentAmount,
        type: formData.type,
        reason: formData.reason,
        date: Timestamp.now(),
        performedBy: profile?.name || 'Unknown User'
      };
      
      const newAdjRef = doc(collection(db, 'stockAdjustments'));
      batch.set(newAdjRef, adjustmentData);

      // 2. Update product stock
      const productRef = doc(db, 'products', formData.productId);
      batch.update(productRef, {
        stock: increment(adjustmentAmount)
      });

      await batch.commit();
      setIsModalOpen(false);
      setFormData({ productId: '', type: 'deduction', quantity: 0, reason: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'stockAdjustments');
    }
  };

  const filteredAdjustments = adjustments.filter(adj => 
    adj.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adj.adjustmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adj.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <RefreshCcw className="text-orange-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Stock Adjustments</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Inventory Recon & Lifecycle Log</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search adjustments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none w-full md:w-72 transition-all font-sans font-medium"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-5 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-orange-500/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Log Adjustment
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800/50 flex items-center gap-6">
          <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
            <History size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Logs</p>
            <p className="text-3xl font-black text-white tracking-tighter">{adjustments.length}</p>
          </div>
        </div>
        <div className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800/50 flex items-center gap-6">
          <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Additions</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              {adjustments.filter(a => a.type === 'addition').length}
            </p>
          </div>
        </div>
        <div className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800/50 flex items-center gap-6">
          <div className="h-14 w-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Deductions</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              {adjustments.filter(a => a.type === 'deduction').length}
            </p>
          </div>
        </div>
      </div>

      {/* Adjustment Ledger */}
      <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#0F1218]">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
            <ClipboardList size={18} className="text-orange-500" />
            Adjustment History
          </h3>
          <button className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
            <Download size={14} />
            Download Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11]">
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Date & Ref</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Product</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Action</th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Qty</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Reason</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing intelligence...</td>
                </tr>
              ) : filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No adjustments found</td>
                </tr>
              ) : (
                filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <div className="space-y-1">
                        <p className="text-white font-bold text-sm tracking-tight">{formatDate(adj.date?.toDate())}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase font-mono">{adj.adjustmentNumber}</p>
                      </div>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 border border-slate-800">
                          <Package size={14} />
                        </div>
                        <span className="font-bold text-slate-300 text-sm">{adj.productName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        adj.type === 'addition' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        {adj.type}
                      </span>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50 text-right">
                      <span className={cn(
                        "font-mono text-sm font-black",
                        adj.type === 'addition' ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {adj.type === 'addition' ? '+' : ''}{adj.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-8 border-r border-slate-800/50">
                       <p className="text-xs text-slate-400 font-medium line-clamp-1">{adj.reason}</p>
                    </td>
                    <td className="py-4 px-8">
                       <div className="flex items-center gap-2">
                         <User size={12} className="text-slate-600" />
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{adj.performedBy}</span>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Adjustment Modal */}
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
                    <div className="h-12 w-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
                      <RefreshCcw className="text-orange-500" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter">Log Manual Adjustment</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Override system inventory levels</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Select Product</label>
                    <select
                      required
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-orange-500 outline-none transition-all font-bold"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Adjustment Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'addition' | 'deduction' })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-orange-500 outline-none transition-all font-bold"
                      >
                        <option value="deduction">Deduction (-)</option>
                        <option value="addition">Addition (+)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Quantity</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-orange-500 outline-none transition-all font-bold"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Reason for Adjustment</label>
                    <textarea
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-orange-500 outline-none transition-all font-sans h-32 resize-none"
                      placeholder="e.g. Damascus pipe damaged during transit / Quarterly cycle count correction..."
                    />
                  </div>

                  <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-2xl flex items-start gap-4">
                    <AlertCircle className="text-orange-500 shrink-0" size={20} />
                    <p className="text-[11px] text-orange-200/70 font-medium leading-relaxed">
                      <strong>Critical:</strong> This action will immediately modify global inventory levels and cannot be undone through standard transaction flows. All logs are permanent and tied to your user ID.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl transition-all shadow-xl shadow-orange-500/10 active:scale-[0.98] mt-4"
                  >
                    Commit Stock Adjustment
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
