import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface Payment {
  id: string;
  amount: number;
  date: any;
  customerName?: string;
  saleId?: string;
  paymentMethod: string;
}

export default function SalePaymentReport() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Assuming we have a collection of payments or we extract from sales
    // For this implementation, I'll look for payments in a 'payments' collection
    // and filter for 'sale' type or similar if applicable.
    // If not, i'll use the 'sales' collection to show 'paidAmount'.
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Extract payment info from sales
      setPayments(allSales.map(s => ({
        id: s.id,
        amount: s.paidAmount || 0,
        date: s.date,
        customerName: s.customerName,
        saleId: s.id,
        paymentMethod: 'Standard'
      })));
    });
    return () => unsubscribe();
  }, []);

  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const filteredPayments = payments.filter(p => p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-teal-500/10 rounded-2xl flex items-center justify-center border border-teal-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <CreditCard className="text-teal-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Sale Collections</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Cash Inflow & Revenue Settlement Audit</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 print:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs text-white placeholder:text-slate-700 focus:border-teal-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={handlePrint}
            className="bg-teal-500 hover:bg-teal-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-teal-500/20 hover:scale-105 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate Collections</p>
        <h3 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalPaid)}</h3>
      </div>

      <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden print:bg-white print:text-black">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0B0D11] text-left print:bg-slate-50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer / Reference</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Settled Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredPayments.map((p, idx) => (
              <tr key={idx} className="hover:bg-[#0B0D11]/30 transition-colors">
                <td className="px-8 py-6">
                  <span className="text-sm font-black text-slate-400 tabular-nums">{formatDate(p.date)}</span>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-bold text-white print:text-black uppercase tracking-tight">{p.customerName}</p>
                  <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-0.5">Sale ID: {p.saleId?.slice(-8)}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className="text-base font-black text-emerald-500 tabular-nums">{formatCurrency(p.amount)}</span>
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
