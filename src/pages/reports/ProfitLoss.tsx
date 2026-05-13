import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  PieChart,
  BarChart,
  ArrowRight,
  Printer,
  ShoppingBag
} from 'lucide-react';
import { collection, onSnapshot, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface Expense {
  id: string;
  amount: number;
  accountId: string;
  accountName: string;
  date: any;
}

interface Sale {
  id: string;
  totalAmount: number;
  items?: any[];
  date: any;
}

interface Product {
  id: string;
  cost: number;
}

interface Purchase {
  id: string;
  totalAmount: number;
  date: any;
}

export default function ProfitLossReport() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last30');
  const [customStart, setCustomStart] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });

    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    setLoading(false);
    return () => {
      unsubExpenses();
      unsubSales();
      unsubPurchases();
      unsubProducts();
    };
  }, []);

  const getRangeDates = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last7':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last30':
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customStart) {
          const s = new Date(customStart);
          s.setHours(0, 0, 0, 0);
          start.setTime(s.getTime());
        }
        if (customEnd) {
          const e = new Date(customEnd);
          e.setHours(23, 59, 59, 999);
          end.setTime(e.getTime());
        }
        break;
    }
    return { start, end };
  };

  const { start, end } = getRangeDates();

  const filteredSales = sales.filter(s => {
    if (!s.date) return false;
    const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
    return d >= start && d <= end;
  });

  const filteredExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = e.date.toDate ? e.date.toDate() : new Date(e.date);
    return d >= start && d <= end;
  });

  const filteredPurchases = purchases.filter(p => {
    if (!p.date) return false;
    const d = p.date.toDate ? p.date.toDate() : new Date(p.date);
    return d >= start && d <= end;
  });

  const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  
  // Calculate COGS based on items sold
  const totalCOGS = filteredSales.reduce((acc, sale) => {
    const saleCOGS = (sale.items || []).reduce((itemAcc, item) => {
      let itemCost = item.cost;
      
      // Fallback to current product cost if not recorded in sale
      if (itemCost === undefined || itemCost === null) {
        const product = products.find(p => p.id === item.productId);
        itemCost = product?.cost || 0;
      }
      
      return itemAcc + (itemCost * (item.quantity || 0));
    }, 0);
    return acc + saleCOGS;
  }, 0);

  const totalPurchases = filteredPurchases.reduce((acc, purchase) => acc + purchase.totalAmount, 0);
  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  // Group expenses by account
  const expensesByAccount = filteredExpenses.reduce((acc, exp) => {
    const name = exp.accountName || 'Uncategorized';
    acc[name] = (acc[name] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
            <TrendingUp className="text-emerald-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Profit & Loss</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Real-time Financial Performance</p>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 relative z-10 print:hidden">
          <div className="bg-[#0B0D11] border border-slate-800 p-1.5 rounded-2xl flex flex-wrap gap-1">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'last30', label: 'Last 30 Days' },
              { id: 'quarter', label: 'Quarter' },
              { id: 'year', label: 'Year' },
              { id: 'custom', label: 'Custom Range' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateRange === r.id ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-white"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-[#0B0D11] border border-slate-800 p-1.5 rounded-2xl"
            >
              <div className="flex items-center gap-2 px-3">
                <Calendar size={14} className="text-slate-500" />
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-[10px] font-black text-white uppercase outline-none"
                />
                <span className="text-slate-700 text-xs">-</span>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-[10px] font-black text-white uppercase outline-none"
                />
              </div>
            </motion.div>
          )}

          <button 
            onClick={handlePrint}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Report
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
             <DollarSign size={80} className="text-blue-500" />
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Operating Revenue</p>
           <h3 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(totalRevenue)}</h3>
           <div className="mt-6 flex items-center gap-2 text-emerald-500 font-bold text-xs">
             <ArrowUpRight size={16} />
             <span>Revenue for period</span>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
             <ShoppingBag size={80} className="text-rose-500" />
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cost of Goods Sold</p>
           <h3 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(totalCOGS)}</h3>
           <div className="mt-6 flex items-center gap-2 text-rose-500 font-bold text-xs">
             <ArrowDownRight size={16} />
             <span>Cost of items sold</span>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#161B22] p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
             <TrendingUp size={80} className="text-emerald-500" />
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Gross Profit</p>
           <h3 className="text-3xl font-black text-emerald-500 tracking-tighter">{formatCurrency(grossProfit)}</h3>
           <div className="mt-6 flex items-center gap-2 text-emerald-500 font-bold text-xs">
             <TrendingUp size={16} />
             <span>Revenue minus Purchases</span>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-emerald-500 p-8 rounded-[2rem] shadow-2xl shadow-emerald-500/10 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
             <PieChart size={80} className="text-black" />
           </div>
           <p className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-2">Net Corporate Profit</p>
           <h3 className="text-3xl font-black text-black tracking-tighter">{formatCurrency(netProfit)}</h3>
           <div className="mt-6 flex items-center gap-2 text-black/70 font-black text-xs uppercase tracking-widest">
             <PieChart size={16} />
             <span>Margin: {profitMargin.toFixed(1)}%</span>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expense Categorization Breakdown */}
        <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-800 bg-[#0F1218] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Expense Breakdown</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Categorized via Chart of Accounts</p>
            </div>
            <BarChart className="text-slate-700" size={24} />
          </div>
          <div className="p-8 space-y-6 flex-1">
            {Object.entries(expensesByAccount).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <PieChart size={48} strokeWidth={1} />
                <p className="text-xs font-bold uppercase tracking-widest">No categorized expenses found</p>
              </div>
            ) : (
              (Object.entries(expensesByAccount) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([name, amount]) => {
                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                return (
                  <div key={name} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-wider">{name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{formatCurrency(amount)}</p>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#0B0D11] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-6 bg-[#0B0D11] border-t border-slate-800 text-center">
            <button className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 mx-auto">
              View Detailed Ledger <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Financial Statement Summary */}
        <div className="bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-800 bg-[#0F1218]">
            <h3 className="text-sm font-black text-white uppercase tracking-widest text-center">Comparative Statement</h3>
          </div>
          <div className="p-10 space-y-8 flex-1">
            <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800/50">
                  <span className="text-xs font-bold text-slate-400">Total Revenue</span>
                  <span className="text-sm font-black text-white">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-800/50">
                  <span className="text-xs font-bold text-slate-400">Cost of Goods Sold</span>
                  <span className="text-sm font-black text-rose-500">({formatCurrency(totalCOGS)})</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-[#0B0D11] px-6 rounded-2xl border border-slate-800">
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Gross Profit</span>
                  <span className="text-sm font-black text-emerald-500">{formatCurrency(grossProfit)}</span>
                </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Operating Expenses</p>
              {(Object.entries(expensesByAccount) as [string, number][])
                .slice(0, 3)
                .map(([name, amount]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">{name}</span>
                  <span className="text-[11px] font-bold text-slate-300">{formatCurrency(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/30">
                <span className="text-xs font-bold text-slate-400">Total Operating Expenses</span>
                <span className="text-sm font-black text-rose-500">({formatCurrency(totalExpenses)})</span>
              </div>
            </div>

            <div className="mt-auto pt-8 border-t border-slate-800">
              <div className="flex justify-between items-center bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 shadow-inner">
                <div>
                  <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-1">Net Income</p>
                  <h4 className="text-3xl font-black text-emerald-500 tracking-tighter">{formatCurrency(netProfit)}</h4>
                </div>
                <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <TrendingUp className="text-black" size={24} />
                </div>
              </div>
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
