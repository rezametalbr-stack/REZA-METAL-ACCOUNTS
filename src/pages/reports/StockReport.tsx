import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Download, 
  Printer,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface Product {
  id: string;
  name: string;
  skuCode?: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock?: number;
}

export default function StockReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const categories = ['All', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.skuCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalValue = filteredProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0);
  const totalItems = filteredProducts.length;
  const lowStockItems = filteredProducts.filter(p => p.stock <= (p.minStock || 0)).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <Package className="text-purple-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Inventory Valuation</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Real-time Stock Assets & Logistics Audit</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 print:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs text-white placeholder:text-slate-700 focus:border-purple-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={handlePrint}
            className="bg-purple-500 hover:bg-purple-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl overflow-hidden relative">
           <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
             <Layers size={100} className="text-purple-500" />
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Portfolio Asset Value</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalValue)}</h3>
           <p className="mt-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Based on weighted average cost</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl overflow-hidden relative">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate SKUs</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{totalItems}</h3>
           <p className="mt-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
             <TrendingUp size={14} /> 100% SKU Integrity
           </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className={cn(
          "p-8 rounded-[2rem] border shadow-xl overflow-hidden relative",
          lowStockItems > 0 ? "bg-rose-500/5 border-rose-500/20" : "bg-[#161B22] border-slate-800"
        )}>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Critical Alerts</p>
           <h3 className={cn("text-4xl font-black tracking-tighter", lowStockItems > 0 ? "text-rose-500" : "text-white")}>{lowStockItems}</h3>
           <p className={cn("mt-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2", lowStockItems > 0 ? "text-rose-500" : "text-slate-600")}>
             {lowStockItems > 0 ? <AlertTriangle size={14} /> : null}
             {lowStockItems > 0 ? 'Replenishment needed' : 'All levels optimum'}
           </p>
        </motion.div>
      </div>

      {/* Stock Table */}
      <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden print:bg-white print:text-black print:border-0 print:shadow-none">
        <div className="p-8 border-b border-slate-800 bg-[#0F1218] flex justify-between items-center print:hidden">
          <div className="flex gap-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                  categoryFilter === cat 
                    ? "bg-purple-500 text-black border-purple-500 shadow-lg shadow-purple-500/20" 
                    : "bg-[#0B0D11] border-slate-800 text-slate-500 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11] text-left print:bg-slate-50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Specifications</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">In-Stock</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Avg. Cost</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total Net Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#0B0D11]/30 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-slate-500 uppercase font-mono group-hover:text-purple-500 transition-colors mb-1">{p.skuCode || '---'}</p>
                    <p className="text-sm font-bold text-white print:text-black uppercase tracking-tight">{p.name}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-slate-600 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 print:bg-slate-100 print:border-slate-200 uppercase tracking-widest">{p.category}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={cn(
                      "text-sm font-black tabular-nums",
                      p.stock <= (p.minStock || 0) ? "text-rose-500" : "text-white print:text-black"
                    )}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right text-xs font-bold font-mono text-slate-400 print:text-slate-600">
                    {formatCurrency(p.cost)}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-sm font-black text-white print:text-black tabular-nums">{formatCurrency(p.stock * p.cost)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#0B0D11]/50 print:bg-slate-50">
              <tr className="font-black">
                <td colSpan={4} className="px-8 py-6 text-[10px] text-slate-500 uppercase tracking-[0.2em] text-right">Aggregate Valuation Report Total</td>
                <td className="px-8 py-6 text-right text-xl text-white print:text-black tracking-tighter">
                  {formatCurrency(totalValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          header, aside { display: none !important; }
          #root > div > div { gap: 0 !important; }
        }
      `}} />
    </div>
  );
}
