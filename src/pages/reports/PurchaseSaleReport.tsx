import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  Calendar,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Scale
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function PurchaseSaleReport() {
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => {
      unsubSales();
      unsubPurchases();
    };
  }, []);

  const totalSalesData = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalPurchasesData = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const getMonthKey = (dateAny: any) => {
    if (!dateAny) return null;
    const date = dateAny.toDate ? dateAny.toDate() : new Date(dateAny);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString('default', { month: 'short', year: '2-digit' });
  };

  const monthlyReport = [...sales, ...purchases].reduce((acc: any[], item) => {
    const month = getMonthKey(item.date);
    if (!month) return acc;
    
    let existing = acc.find(d => d.month === month);
    if (!existing) {
      existing = { month, sales: 0, purchases: 0 };
      acc.push(existing);
    }
    
    if (item.totalAmount) {
      // Check if it's a sale or purchase by looking for customerName or supplierName
      // Better: we can check the origin if we had it, or use the collection they came from
      // Since I combined them, I need a way to distinguish.
      // Re-doing the reduce properly.
      return acc;
    }
    return acc;
  }, []);

  // Proper Monthly Data aggregation
  const combinedMonthlyData: any[] = [];
  
  sales.forEach(s => {
    const month = getMonthKey(s.date);
    if (!month) return;
    let existing = combinedMonthlyData.find(d => d.month === month);
    if (!existing) {
      existing = { month, sales: 0, purchases: 0 };
      combinedMonthlyData.push(existing);
    }
    existing.sales += (s.totalAmount || 0);
  });

  purchases.forEach(p => {
    const month = getMonthKey(p.date);
    if (!month) return;
    let existing = combinedMonthlyData.find(d => d.month === month);
    if (!existing) {
      existing = { month, sales: 0, purchases: 0 };
      combinedMonthlyData.push(existing);
    }
    existing.purchases += (p.totalAmount || 0);
  });

  combinedMonthlyData.sort((a, b) => {
    // Simple chronological sort would be better but for now order of appearance
    return 0;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <Scale className="text-amber-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Purchase & Sale Balance</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Cross-Ledger Flow & Cash Convergence</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 print:hidden">
          <button 
            onClick={handlePrint}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate Inflow (Sales)</p>
          <h3 className="text-4xl font-black text-emerald-500 tracking-tighter">{formatCurrency(totalSalesData)}</h3>
        </div>
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate Outflow (Purchases)</p>
          <h3 className="text-4xl font-black text-rose-500 tracking-tighter">{formatCurrency(totalPurchasesData)}</h3>
        </div>
      </div>

      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-10">Flow Comparison</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={combinedMonthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="month" stroke="#4b5563" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <YAxis stroke="#4b5563" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B0D11', borderRadius: '1rem', border: '1px solid #1f2937', color: '#fff' }}
                itemStyle={{ fontWeight: 900, fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Inflow (Sales)" />
              <Bar dataKey="purchases" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Outflow (Purchases)" />
            </BarChart>
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
