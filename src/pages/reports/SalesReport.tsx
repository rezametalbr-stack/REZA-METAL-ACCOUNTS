import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Target,
  Layers
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface Sale {
  id: string;
  totalAmount: number;
  date: any;
  customerName: string;
  items: any[];
}

export default function SalesReport() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Aggregation Logic
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalTransactions = sales.length;
  const averageValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Monthly Grouping
  const monthlyData = sales.reduce((acc: any[], sale) => {
    if (!sale.date) return acc;
    let date: Date;
    if (typeof sale.date.toDate === 'function') {
      date = sale.date.toDate();
    } else {
      date = new Date(sale.date);
    }
    
    if (isNaN(date.getTime())) return acc;
    
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    const existing = acc.find(d => d.month === month);
    if (existing) {
      existing.revenue += sale.totalAmount;
      existing.transactions += 1;
    } else {
      acc.push({ month, revenue: sale.totalAmount, transactions: 1 });
    }
    return acc;
  }, []).reverse(); // Reverse for chronological order

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <BarChart3 className="text-rose-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Sales Performance</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Lifecycle Tracking & Revenue Intel</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 print:hidden">
          <button className="bg-[#0B0D11] hover:bg-slate-800 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] px-6 py-4 rounded-2xl border border-slate-800 transition-all flex items-center gap-3">
            <Calendar size={16} />
            YTD 2024
          </button>
          <button 
            onClick={handlePrint}
            className="bg-rose-500 hover:bg-rose-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95"
          >
            <Download size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl group overflow-hidden relative">
           <div className="absolute -right-4 -top-4 text-rose-500/5 rotate-12 group-hover:rotate-0 transition-transform">
             <Target size={120} />
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate Revenue</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalRevenue)}</h3>
           <div className="mt-6 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-rose-500 w-3/4 rounded-full" />
           </div>
           <p className="mt-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">75% of quarterly target</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl group">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Volume</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{totalTransactions}</h3>
           <p className="mt-6 text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
             <TrendingUp size={14} />
             +14% volume vs last month
           </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl group">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg. Basket Size</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(averageValue)}</h3>
           <p className="mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Calculated per transaction</p>
        </motion.div>
      </div>

      {/* Main Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Revenue Growth</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Monthly aggregate data</p>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              <div className="h-2 w-2 rounded-full bg-slate-800" />
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#4b5563" 
                  fontSize={10} 
                  fontWeight={900} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#4b5563" 
                  fontSize={10} 
                  fontWeight={900} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0D11', borderRadius: '1rem', border: '1px solid #1f2937', color: '#fff' }}
                  itemStyle={{ color: '#f43f5e', fontWeight: 900, fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f43f5e" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-800 bg-[#0F1218]">
             <h3 className="text-sm font-black text-white uppercase tracking-widest text-center">Volume Dispersion</h3>
          </div>
          <div className="p-8 space-y-8 flex-1 overflow-y-auto">
            {monthlyData.map((data, idx) => (
              <div key={idx} className="flex items-center gap-6">
                <div className="h-10 w-10 rounded-xl bg-[#0B0D11] border border-slate-800 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase">{data.month.split(' ')[0]}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-white">{data.transactions} sales</span>
                    <span className="text-[10px] font-black text-rose-500">{formatCurrency(data.revenue)}</span>
                  </div>
                  <div className="h-1 w-full bg-[#0B0D11] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full" 
                      style={{ width: `${(data.revenue / totalRevenue) * 200}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-[#0B0D11] border-t border-slate-800 text-center">
            <button className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
              Inspect Transaction Ledger <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
