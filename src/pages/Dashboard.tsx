import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn } from '../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'motion/react';

const data = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 2000 },
  { name: 'Apr', sales: 2780 },
  { name: 'May', sales: 1890 },
  { name: 'Jun', sales: 2390 },
  { name: 'Jul', sales: 3490 },
];

import { useTheme } from '../contexts/ThemeContext';

export default function Dashboard() {
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalExpenses: 0,
    inventoryCount: 0,
    customerCount: 0,
    lowStockItems: 0
  });

  useEffect(() => {
    async function fetchData() {
      const products = await getDocs(collection(db, 'products'));
      const customers = await getDocs(collection(db, 'customers'));
      const sales = await getDocs(collection(db, 'sales'));
      const expenses = await getDocs(collection(db, 'expenses'));

      let totalS = 0;
      sales.forEach(doc => totalS += doc.data().totalAmount || 0);

      let totalE = 0;
      expenses.forEach(doc => totalE += doc.data().amount || 0);

      let lowStock = 0;
      products.forEach(doc => {
        if (doc.data().stock <= 10) lowStock++;
      });

      setMetrics({
        totalSales: totalS,
        totalExpenses: totalE,
        inventoryCount: products.size,
        customerCount: customers.size,
        lowStockItems: lowStock
      });
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Business Intelligence</h1>
          <p className="text-[var(--text-secondary)] font-medium mt-1">Real-time health of Reza Metal Industries</p>
        </div>
        <div className="flex gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">
              Ledger Synced
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Revenue" 
          value={formatCurrency(metrics.totalSales)} 
          trend="+12.5%" 
          trendUp={true}
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard 
          title="Total Expenses" 
          value={formatCurrency(metrics.totalExpenses)} 
          trend="-2.4%" 
          trendUp={false}
          icon={TrendingDown}
          color="rose"
        />
        <MetricCard 
          title="Stock at Risk" 
          value={metrics.lowStockItems.toString()} 
          icon={Package}
          color="amber"
          trend={metrics.lowStockItems > 0 ? "Action Required" : "Stable"}
          trendUp={metrics.lowStockItems > 0 ? false : true}
        />
        <MetricCard 
          title="Network Scope" 
          value={`${metrics.customerCount} Entities`} 
          icon={Users}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-[var(--text-primary)]">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-xl overflow-hidden relative transition-colors duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              Monthly Revenue Growth
            </h3>
            <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest">
              <span className="text-[var(--text-secondary)]">JUN</span>
              <span className="text-[var(--text-secondary)]">JUL</span>
              <span className="text-amber-500 border-b border-amber-500">AUG</span>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: theme === 'dark' ? '#475569' : '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: theme === 'dark' ? '#475569' : '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0B0D11' : '#fff', 
                    borderRadius: '12px', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`, 
                    color: theme === 'dark' ? '#fff' : '#0f172a' 
                  }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts / Tasks */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-xl transition-colors duration-300">
            <h3 className="font-bold text-[var(--text-primary)] mb-6 uppercase tracking-widest text-xs">Inventory Health</h3>
            <div className="space-y-4">
              {metrics.lowStockItems > 0 ? (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-amber-500 uppercase tracking-tighter">Stock Alert</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {metrics.lowStockItems} items are dropping below threshold. Action required to prevent delays.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] font-medium">All systems normal. Inventory balanced.</p>
              )}
            </div>
          </div>

          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group transition-colors duration-300">
            <div className="relative z-10 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-2">Internal Operations</p>
                <h3 className="font-bold text-lg leading-tight text-[var(--text-primary)]">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => window.location.href = '/sales'}
                  className="w-full py-3 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg active:scale-95"
                >
                  Create Sales Entry
                </button>
                <button 
                  onClick={() => window.location.href = '/accounting/journal-entries'}
                  className="w-full py-3 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-page)] transition-all active:scale-95"
                >
                  Manual Ledger Entry
                </button>
                <button 
                  onClick={() => window.location.href = '/reports/balance-sheet'}
                  className="w-full py-3 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-page)] transition-all active:scale-95"
                >
                  Audit Balance Sheet
                </button>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-[-15deg] group-hover:rotate-0 duration-500 text-[var(--text-primary)]">
              <ShoppingCart size={200} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, trendUp, icon: Icon, color }: any) {
  const colorMap: any = {
    amber: "text-amber-500",
    rose: "text-rose-500",
    emerald: "text-emerald-500",
    blue: "text-blue-500"
  };

  const bgMap: any = {
    amber: "bg-amber-500/10 border-amber-500/20",
    rose: "bg-rose-500/10 border-rose-500/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    blue: "bg-blue-500/10 border-blue-500/20"
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-xl relative overflow-hidden group transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{value}</h3>
          {trend && (
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter",
                trendUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl border transition-all", bgMap[color], colorMap[color])}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
