import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface Partner {
  id: string;
  name: string;
  balance: number;
  totalPaid: number;
  type: 'customer' | 'supplier';
}

export default function SupplierCustomerReport() {
  const [customers, setCustomers] = useState<Partner[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'customer' } as Partner)));
    });
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'supplier' } as Partner)));
      setLoading(false);
    });
    return () => {
      unsubCustomers();
      unsubSuppliers();
    };
  }, []);

  const partners = activeTab === 'customer' ? customers : suppliers;
  const filteredPartners = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalBalance = filteredPartners.reduce((acc, p) => acc + (p.balance || 0), 0);
  const totalPaid = filteredPartners.reduce((acc, p) => acc + (p.totalPaid || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <Users className="text-blue-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Network Intelligence</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Partner Balances & Credential Audit</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 print:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs text-white placeholder:text-slate-700 focus:border-blue-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={handlePrint}
            className="bg-blue-500 hover:bg-blue-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      <div className="bg-[#161B22] p-1.5 rounded-[2rem] border border-slate-800 flex print:hidden">
        <button 
          onClick={() => setActiveTab('customer')}
          className={cn(
            "flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'customer' ? "bg-blue-500 text-black shadow-xl" : "text-slate-500 hover:text-white"
          )}
        >
          Customer Portfolio
        </button>
        <button 
          onClick={() => setActiveTab('supplier')}
          className={cn(
            "flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'supplier' ? "bg-blue-500 text-black shadow-xl" : "text-slate-500 hover:text-white"
          )}
        >
          Vendor Network
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden relative">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate Liability</p>
          <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalBalance)}</h3>
          <p className="mt-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowDownRight size={14} /> Outstanding due
          </p>
        </div>
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden relative">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Settlement</p>
          <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalPaid)}</h3>
          <p className="mt-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowUpRight size={14} /> Total inflow/outflow
          </p>
        </div>
      </div>

      <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden print:bg-white print:text-black">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0B0D11] text-left print:bg-slate-50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity Specifications</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Settled Amount</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pending Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredPartners.map((p) => (
              <tr key={p.id} className="hover:bg-[#0B0D11]/30 transition-colors">
                <td className="px-8 py-6">
                  <p className="text-sm font-bold text-white print:text-black uppercase tracking-tight">{p.name}</p>
                  <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-0.5">UID: {p.id.slice(-8)}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className="text-sm font-black text-emerald-500 tabular-nums">{formatCurrency(p.totalPaid || 0)}</span>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className={cn(
                    "text-sm font-black tabular-nums",
                    (p.balance || 0) > 0 ? "text-rose-500" : "text-slate-600"
                  )}>
                    {formatCurrency(p.balance || 0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
