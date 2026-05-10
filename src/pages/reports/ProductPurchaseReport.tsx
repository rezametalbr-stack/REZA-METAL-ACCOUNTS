import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  Calendar,
  Download,
  Printer,
  ArrowUpRight,
  ChevronRight,
  Target
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface Purchase {
  id: string;
  totalAmount: number;
  date: any;
  supplierName: string;
}

export default function ProductPurchaseReport() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'purchases'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalExpense = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalOrders = purchases.length;
  const averageOrderValue = totalOrders > 0 ? totalExpense / totalOrders : 0;

  const monthlyData = purchases.reduce((acc: any[], p) => {
    if (!p.date) return acc;
    let date: Date;
    if (typeof p.date.toDate === 'function') {
      date = p.date.toDate();
    } else {
      date = new Date(p.date);
    }
    
    if (isNaN(date.getTime())) return acc;
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    const existing = acc.find(d => d.month === month);
    if (existing) {
      existing.expense += p.totalAmount;
      existing.orders += 1;
    } else {
      acc.push({ month, expense: p.totalAmount, orders: 1 });
    }
    return acc;
  }, []).reverse();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <ShoppingBag className="text-indigo-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Purchase Intelligence</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Stock Inflow Analysis & Vendor Spend</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 print:hidden">
          <button 
            onClick={handlePrint}
            className="bg-indigo-500 hover:bg-indigo-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl group overflow-hidden relative">
           <div className="absolute -right-4 -top-4 text-indigo-500/5 rotate-12 group-hover:rotate-0 transition-transform">
             <Target size={120} />
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Procurement Spend</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalExpense)}</h3>
           <p className="mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Inventory investment</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl group">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Order Volume</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{totalOrders}</h3>
           <p className="mt-6 text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
             <ArrowUpRight size={14} /> Aggregate purchases
           </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl group">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Average Order Value</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(averageOrderValue)}</h3>
           <p className="mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Vendor contract mean</p>
        </motion.div>
      </div>

      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-10">Expenditure Trend</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="month" stroke="#4b5563" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#4b5563" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B0D11', borderRadius: '1rem', border: '1px solid #1f2937', color: '#fff' }}
                itemStyle={{ color: '#6366f1', fontWeight: 900, fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="expense" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" />
            </AreaChart>
          </ResponsiveContainer>
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
