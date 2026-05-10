import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TrendingUp, 
  Search,
  Filter,
  Printer,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
}

export default function ItemReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => {
      unsubProducts();
      unsubSales();
    };
  }, []);

  // Calculate item performance
  const itemPerformance = products.map(p => {
    const itemSales = sales.reduce((acc, s) => {
      const saleItem = s.items?.find((item: any) => item.productId === p.id);
      if (saleItem) {
        acc.quantity += saleItem.quantity;
        acc.revenue += saleItem.total;
      }
      return acc;
    }, { quantity: 0, revenue: 0 });

    const totalCost = itemSales.quantity * p.cost;
    const profit = itemSales.revenue - totalCost;
    const margin = itemSales.revenue > 0 ? (profit / itemSales.revenue) * 100 : 0;

    return {
      ...p,
      sold: itemSales.quantity,
      revenue: itemSales.revenue,
      profit,
      margin
    };
  });

  const topSellers = [...itemPerformance].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const filteredItems = itemPerformance.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <Box className="text-cyan-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Product Intelligence</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">SKU Performance & Margin Velocity</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 print:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs text-white placeholder:text-slate-700 focus:border-cyan-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={handlePrint}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden print:bg-white print:text-black">
          <div className="p-8 border-b border-slate-800 bg-[#0F1218] print:hidden">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Aggregate Performance Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0B0D11] text-left">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Specifications</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Unit Volume</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Revenue</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredItems.map((p) => (
                  <tr key={p.id} className="hover:bg-[#0B0D11]/30 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-white print:text-black uppercase tracking-tight">{p.name}</p>
                      <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-0.5">{p.category}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-black text-white print:text-black tabular-nums">{p.sold}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-sm font-black text-white print:text-black tabular-nums">{formatCurrency(p.revenue)}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-sm font-black text-cyan-500 tabular-nums">{formatCurrency(p.profit)}</span>
                      <p className="text-[10px] font-bold text-slate-600">{(p).margin.toFixed(1)}% margin</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8 print:hidden">
          <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden relative">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8">Top Volume Assets</h3>
            <div className="space-y-6">
              {topSellers.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-lg bg-[#0B0D11] border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">{idx + 1}</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white uppercase">{p.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <div className="h-1 flex-1 bg-[#0B0D11] rounded-full mr-4 overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(p.sold / (topSellers[0]?.sold || 1)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">{p.sold} Units</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
