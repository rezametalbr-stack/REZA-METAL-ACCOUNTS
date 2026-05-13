import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, handleFirestoreError, OperationType } from '../../lib/utils';
import { motion } from 'motion/react';
import { Users, TrendingUp, DollarSign, Award, Target, Activity } from 'lucide-react';

interface SalespersonPerformanceData {
  id: string;
  name: string;
  totalSales: number;
  transactionsCount: number;
  totalCommission: number;
  avgCommission: number;
}

export default function SalespersonPerformance() {
  const [data, setData] = useState<SalespersonPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const salespeopleSnap = await getDocs(collection(db, 'salespeople'));
        const commissionsSnap = await getDocs(collection(db, 'commissions'));
        const salesSnap = await getDocs(collection(db, 'sales'));

        const salespeopleMap = new Map();
        salespeopleSnap.docs.forEach(doc => {
          salespeopleMap.set(doc.id, {
            id: doc.id,
            name: doc.data().name || 'Unknown',
            totalSales: 0,
            transactionsCount: 0,
            totalCommission: 0
          });
        });

        // Process sales
        salesSnap.docs.forEach(doc => {
          const sale = doc.data();
          if (sale.salespersonId && salespeopleMap.has(sale.salespersonId)) {
            const entry = salespeopleMap.get(sale.salespersonId);
            entry.totalSales += sale.totalAmount || 0;
            entry.transactionsCount += 1;
          }
        });

        // Process commissions
        commissionsSnap.docs.forEach(doc => {
          const comm = doc.data();
          if (comm.salespersonId && salespeopleMap.has(comm.salespersonId)) {
            const entry = salespeopleMap.get(comm.salespersonId);
            entry.totalCommission += comm.amount || 0;
          }
        });

        const performanceData: SalespersonPerformanceData[] = Array.from(salespeopleMap.values())
          .map((entry: any) => ({
            ...entry,
            avgCommission: entry.transactionsCount > 0 ? entry.totalCommission / entry.transactionsCount : 0
          }))
          .filter(d => d.totalSales > 0 || d.totalCommission > 0)
          .sort((a, b) => b.totalSales - a.totalSales);

        setData(performanceData);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'reports/salesperson-performance');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Processing Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={80} className="text-emerald-500" />
          </div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Total Sales Volume</h3>
          <p className="text-4xl font-black text-white tracking-tighter tabular-nums">
            {formatCurrency(data.reduce((sum, d) => sum + d.totalSales, 0))}
          </p>
          <div className="mt-6 flex items-center gap-2 text-[9px] text-emerald-500 font-black uppercase tracking-widest">
            <TrendingUp size={12} />
            Cumulative Performance
          </div>
        </div>

        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity size={80} className="text-amber-500" />
          </div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Total Transactions</h3>
          <p className="text-4xl font-black text-white tracking-tighter tabular-nums">
            {data.reduce((sum, d) => sum + d.transactionsCount, 0)}
          </p>
          <div className="mt-6 flex items-center gap-2 text-[9px] text-amber-500 font-black uppercase tracking-widest">
            <Target size={12} />
            Execution Velocity
          </div>
        </div>

        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award size={80} className="text-indigo-500" />
          </div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Avg Commission per Sale</h3>
          <p className="text-4xl font-black text-white tracking-tighter tabular-nums">
            {formatCurrency(data.length > 0 ? data.reduce((sum, d) => sum + d.totalCommission, 0) / data.reduce((sum, d) => sum + d.transactionsCount, 0) : 0)}
          </p>
          <div className="mt-6 flex items-center gap-2 text-[9px] text-indigo-500 font-black uppercase tracking-widest">
            <Award size={12} />
            Agent Worth Metric
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Visualization */}
        <div className="bg-[#161B22] p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Performer Benchmarks</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Sales Comparison</p>
            </div>
            <Users className="text-slate-700" size={24} />
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#4b5563" 
                  fontSize={10} 
                  fontWeight={900}
                  width={80}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ 
                    backgroundColor: '#0B0D11', 
                    borderRadius: '1.5rem', 
                    border: '1px solid #1f2937',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                    padding: '16px'
                  }}
                  itemStyle={{ fontWeight: 'black', fontSize: '12px' }}
                  formatter={(value: any) => [formatCurrency(value), 'Total Sales']}
                />
                <Bar dataKey="totalSales" radius={[0, 8, 8, 0]} barSize={32}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="bg-[#161B22] rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-800 bg-[#0F1218]">
            <h2 className="text-xl font-black text-white tracking-tight">Agent Audit Trail</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Numerical breakdown of operations</p>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0B0D11]/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <tr>
                  <th className="px-8 py-6">Salesperson</th>
                  <th className="px-8 py-6 text-center">TX Count</th>
                  <th className="px-8 py-6 text-right">Revenue</th>
                  <th className="px-8 py-6 text-right text-amber-500">Avg Comm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.map((agent, index) => (
                  <tr key={agent.id} className="hover:bg-slate-800/10 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-amber-500 group-hover:text-black transition-all">
                          {index + 1}
                        </div>
                        <span className="font-black text-white uppercase tracking-tight">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-black text-slate-400">
                        {agent.transactionsCount}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-white tracking-tighter tabular-nums">
                      {formatCurrency(agent.totalSales)}
                    </td>
                    <td className="px-8 py-6 text-right font-black text-amber-500 tracking-tighter tabular-nums">
                      {formatCurrency(agent.avgCommission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
