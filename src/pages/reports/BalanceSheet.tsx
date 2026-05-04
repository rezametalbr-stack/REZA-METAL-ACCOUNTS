import React, { useState, useEffect } from 'react';
import { 
  Library, 
  ArrowRight, 
  Download, 
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  PieChart,
  ArrowUpRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

export default function BalanceSheet() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
      setLoading(false);
    });
    return () => unsubAccounts();
  }, []);

  const assets = accounts.filter(a => a.type === 'Asset');
  const liabilities = accounts.filter(a => a.type === 'Liability');
  const equity = accounts.filter(a => a.type === 'Equity');

  const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalEquity = equity.reduce((sum, a) => sum + (a.balance || 0), 0);

  const balanceGap = totalAssets - (totalLiabilities + totalEquity);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-slate-500/10 rounded-2xl flex items-center justify-center border border-slate-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <Library className="text-slate-400" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Balance Sheet</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Industrial Asset & Equity Auditor</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center gap-3 bg-[#0B0D11] border border-slate-800 px-4 py-2 rounded-2xl">
            <Calendar size={14} className="text-slate-500" />
            <input 
              type="date" 
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black text-white shadow-none focus:ring-0 uppercase tracking-widest cursor-pointer" 
            />
          </div>
          <button className="bg-white hover:bg-slate-200 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl active:scale-95">
            <Download size={16} strokeWidth={3} />
            Export Statement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Assets</p>
           <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalAssets)}</h3>
           <div className="mt-8 flex items-center gap-2">
             <ShieldCheck className="text-emerald-500" size={16} />
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified Value</span>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Liabilities & Debt</p>
           <h3 className="text-4xl font-black text-rose-500 tracking-tighter">{formatCurrency(totalLiabilities)}</h3>
           <div className="mt-8 flex items-center gap-2">
             <TrendingUp className="text-slate-600" size={16} />
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Obligations</span>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-emerald-500 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
           <p className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-2">Shareholder Equity</p>
           <h3 className="text-4xl font-black text-black tracking-tighter">{formatCurrency(totalEquity)}</h3>
           <div className="mt-8 flex items-center gap-2">
             <Layers className="text-black/40" size={16} />
             <span className="text-[10px] font-black text-black/60 uppercase tracking-widest">Owner Investment</span>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assets List */}
        <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-800 bg-[#0F1218] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Asset Ledger</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest italic">Current & Fixed Assets</p>
            </div>
            <ArrowUpRight className="text-emerald-500" size={24} />
          </div>
          <div className="p-8 space-y-6 flex-1">
            {assets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 py-20">
                <p className="text-xs font-bold uppercase tracking-widest italic">No asset data available</p>
              </div>
            ) : (
              assets.map((acc) => (
                <div key={acc.id} className="flex justify-between items-center pb-4 border-b border-slate-800/30 group hover:border-slate-700 transition-colors">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 group-hover:text-emerald-500 transition-colors uppercase font-mono">{acc.code}</p>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">{acc.name}</p>
                  </div>
                  <span className="text-sm font-black text-white font-mono">{formatCurrency(acc.balance || 0)}</span>
                </div>
              ))
            )}
          </div>
          <div className="p-10 bg-[#0B0D11] border-t border-slate-800 flex justify-between items-center">
            <span className="text-white text-xs font-black uppercase tracking-widest">Total Corporate Assets</span>
            <span className="text-xl font-black text-emerald-500">{formatCurrency(totalAssets)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Liabilities & Equity */}
          <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-800 bg-[#0F1218]">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Financing & Obligations</h3>
            </div>
            <div className="p-8 space-y-8 flex-1">
              <section className="space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Liabilities</p>
                {liabilities.map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">{acc.name}</span>
                    <span className="text-xs font-bold text-white font-mono">{formatCurrency(acc.balance || 0)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-800/30 flex justify-between items-center font-bold">
                  <span className="text-[10px] text-slate-500 uppercase italic">Total Liabilities</span>
                  <span className="text-sm text-slate-300 font-mono italic">{formatCurrency(totalLiabilities)}</span>
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Equity</p>
                {equity.map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">{acc.name}</span>
                    <span className="text-xs font-bold text-white font-mono">{formatCurrency(acc.balance || 0)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-800/30 flex justify-between items-center font-bold">
                  <span className="text-[10px] text-slate-500 uppercase italic">Total Equity</span>
                  <span className="text-sm text-slate-300 font-mono italic">{formatCurrency(totalEquity)}</span>
                </div>
              </section>
            </div>
            <div className="p-10 bg-[#0B0D11] border-t border-slate-800 flex justify-between items-center">
              <span className="text-white text-xs font-black uppercase tracking-widest">Total Liabilities & Equity</span>
              <span className="text-xl font-black text-white">{formatCurrency(totalLiabilities + totalEquity)}</span>
            </div>
          </div>

          {/* Statement of Health */}
          <div className={cn(
             "p-8 rounded-[2.5rem] border shadow-2xl flex items-center justify-between",
             Math.abs(balanceGap) < 0.01 
               ? "bg-emerald-500/5 border-emerald-500/20" 
               : "bg-rose-500/5 border-rose-500/20"
          )}>
            <div className="flex items-center gap-6">
               <div className={cn(
                 "h-14 w-14 rounded-2xl flex items-center justify-center",
                 Math.abs(balanceGap) < 0.01 ? "bg-emerald-500 text-black" : "bg-rose-500 text-black"
               )}>
                 <ShieldCheck size={28} />
               </div>
               <div>
                 <h4 className="text-xl font-black text-white tracking-tighter">
                   {Math.abs(balanceGap) < 0.01 ? 'Books are Balanced' : 'Imbalance Detected'}
                 </h4>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                   {Math.abs(balanceGap) < 0.01 ? 'Corporate integrity verified' : `Gap: ${formatCurrency(balanceGap)}`}
                 </p>
               </div>
            </div>
            <button className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest flex items-center gap-2">
              View Audit Log <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
