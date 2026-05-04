import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Package, 
  RefreshCcw, 
  Box, 
  DollarSign, 
  CreditCard,
  Search,
  Download,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';

import ProfitLossReport from './reports/ProfitLoss';
import SalesReport from './reports/SalesReport';

export default function Reports() {
  const location = useLocation();
  const path = location.pathname;

  if (path === '/reports/profit-loss') {
    return <ProfitLossReport />;
  }

  if (path === '/reports/product-sale') {
    return <SalesReport />;
  }

  const getReportInfo = () => {
    switch (path) {
      case '/reports/profit-loss':
        return { title: 'Profit and Loss Report', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case '/reports/purchase-sale':
        return { title: 'Purchase and Sale Report', icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case '/reports/supplier-customer':
        return { title: 'Supplier and Customer Report', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case '/reports/stock':
        return { title: 'Stock Report', icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case '/reports/stock-adjustment':
        return { title: 'Stock Adjustment Report', icon: RefreshCcw, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case '/reports/item':
        return { title: 'Item Report', icon: Box, color: 'text-cyan-500', bg: 'bg-cyan-500/10' };
      case '/reports/product-purchase':
        return { title: 'Product Purchase Reports', icon: ShoppingBag, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
      case '/reports/product-sale':
        return { title: 'Product Sale Reports', icon: BarChart3, color: 'text-rose-500', bg: 'bg-rose-500/10' };
      case '/reports/purchase-payment':
        return { title: 'Purchase Payment Report', icon: DollarSign, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
      case '/reports/sale-payment':
        return { title: 'Sale Payment Report', icon: CreditCard, color: 'text-teal-500', bg: 'bg-teal-500/10' };
      default:
        return { title: 'Business Analytics', icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    }
  };

  const info = getReportInfo();

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden relative group">
        <div className={`absolute top-0 right-0 w-64 h-64 ${info.bg} blur-[100px] rounded-full -mr-32 -mt-32 opacity-50`} />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className={`h-16 w-16 ${info.bg} rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform`}>
            <info.icon className={info.color} size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">{info.title}</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Data Insights & Financial Intelligence</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <button className="bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-[10px] px-6 py-4 rounded-2xl transition-all flex items-center gap-3 border border-slate-700">
            <Filter size={16} />
            Filters
          </button>
          <button className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-amber-500/10 active:scale-95">
            <Download size={16} strokeWidth={3} />
            Export data
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div 
        key={path}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#161B22] rounded-[2rem] border border-slate-800 min-h-[500px] flex flex-col items-center justify-center p-12 text-center text-slate-500"
      >
        <div className={`h-24 w-24 ${info.bg} rounded-[2rem] flex items-center justify-center mb-6`}>
          <info.icon className={info.color} size={48} strokeWidth={1} />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tighter mb-2">Generating Intelligence...</h2>
        <p className="max-w-md text-sm font-medium leading-relaxed mb-8">
          The requested analytical module for <strong>{info.title}</strong> is being initialized. 
          The system will synchronize real-time data from all ledger points to provide accurate visualizations.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[#0B0D11] border border-slate-800 rounded-2xl animate-pulse flex flex-col items-center justify-center gap-3">
              <div className="h-2 w-12 bg-slate-800 rounded" />
              <div className="h-4 w-20 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
