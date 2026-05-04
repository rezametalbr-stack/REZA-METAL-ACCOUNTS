import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Calendar,
  Award,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, handleFirestoreError, OperationType, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface CommissionRecord {
  id: string;
  salespersonId: string;
  saleId: string;
  amount: number;
  date: any;
  status: 'pending' | 'paid';
}

interface SalespersonSummary {
  id: string;
  name: string;
  totalEarned: number;
  pendingAmount: number;
}

export default function Commissions() {
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [summaries, setSummaries] = useState<SalespersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'commissions'), orderBy('date', 'desc'), limit(100));
    const unsub = onSnapshot(q, async (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionRecord));
      setCommissions(records);
      
      // Calculate summaries
      const salespeopleSnap = await getDocs(collection(db, 'salespeople'));
      const salespeopleMap = new Map();
      salespeopleSnap.docs.forEach(doc => salespeopleMap.set(doc.id, doc.data().name));

      const summaryMap = new Map<string, SalespersonSummary>();
      
      // Initialize with all salespeople
      salespeopleSnap.docs.forEach(doc => {
        summaryMap.set(doc.id, {
          id: doc.id,
          name: doc.data().name,
          totalEarned: 0,
          pendingAmount: 0
        });
      });

      records.forEach(r => {
        const s = summaryMap.get(r.salespersonId);
        if (s) {
          s.totalEarned += r.amount;
          if (r.status === 'pending') {
            s.pendingAmount += r.amount;
          }
        }
      });

      setSummaries(Array.from(summaryMap.values()).filter(s => s.totalEarned > 0));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'commissions'));

    return unsub;
  }, []);

  const totalCommissions = commissions.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Commission Ledger</h1>
          <p className="text-slate-500 font-medium">Tracking performance-based rewards for sales team</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#161B22] p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-amber-500" />
          </div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Total Payout Volume</h3>
          <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(totalCommissions)}</p>
          <div className="mt-8 flex items-center gap-2 text-[10px] text-amber-500 bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl font-black uppercase tracking-widest">
            <Award size={16} strokeWidth={3} />
            Performance Rewards Active
          </div>
        </div>

        <div className="bg-[#0F1218] p-8 rounded-3xl border border-slate-800/50 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Active Agents</h3>
            <p className="text-3xl font-black text-white tracking-tighter">{summaries.length}</p>
          </div>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">Earning current cycle</p>
        </div>

        <div className="bg-[#0F1218] p-8 rounded-3xl border border-slate-800/50 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Pending Total</h3>
            <p className="text-3xl font-black text-rose-500 tracking-tighter">
              {formatCurrency(commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0))}
            </p>
          </div>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">Unsettled accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161B22] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-[#0F1218] flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Commission Records</h3>
              <div className="relative w-48 transition-all focus-within:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  type="text" 
                  placeholder="Filter records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold text-white outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0B0D11]/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-5">Agent</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5 text-right">Reward</th>
                    <th className="px-6 py-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-600 font-black uppercase text-xs tracking-widest">Loading ledger...</td></tr>
                  ) : commissions.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-700 font-black uppercase text-xs tracking-widest">No commissions recorded</td></tr>
                  ) : (
                    commissions.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/10 transition-colors group">
                        <td className="px-6 py-5">
                          <p className="font-bold text-white group-hover:text-amber-500 transition-colors">{summaries.find(s => s.id === r.salespersonId)?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-600 font-mono mt-1">SALE-{r.saleId.slice(0, 8)}</p>
                        </td>
                        <td className="px-6 py-5 text-slate-500 text-xs font-semibold">
                          {r.date ? formatDate(r.date.toDate()) : 'N/A'}
                        </td>
                        <td className="px-6 py-5 text-right font-black text-amber-500 text-lg tracking-tighter tabular-nums">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                            r.status === 'paid' 
                              ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" 
                              : "text-amber-500 bg-amber-500/5 border-amber-500/10"
                          )}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#161B22] p-8 rounded-3xl border border-slate-800 shadow-2xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 border-b border-slate-800 pb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-500" />
              Agent Performance
            </h3>
            <div className="space-y-8">
              {summaries.map((s) => (
                <div key={s.id} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Accumulated Rewards</p>
                    </div>
                    <p className="text-xl font-black text-amber-500 tracking-tighter tabular-nums">{formatCurrency(s.totalEarned)}</p>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (s.totalEarned / totalCommissions) * 100)}%` }}
                      className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-600">Share of total</span>
                    <span className="text-amber-500/50">{Math.round((s.totalEarned / totalCommissions) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0F1218] p-8 rounded-3xl border border-slate-800/50 text-white shadow-xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-6 flex items-center gap-2">
              <CheckCircle2 size={16} strokeWidth={3} />
              Policy Summary
            </h3>
            <ul className="space-y-6 text-sm">
              <li className="flex gap-4">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                <p className="text-slate-400 font-medium leading-relaxed">Commission is calculated based on individual product rates defined in the catalog.</p>
              </li>
              <li className="flex gap-4">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                <p className="text-slate-400 font-medium leading-relaxed">Rewards are recorded instantly upon sale completion.</p>
              </li>
              <li className="flex gap-4">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                <p className="text-slate-400 font-medium leading-relaxed">Payout status must be manually updated by an administrator.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
