import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Receipt, 
  Settings as SettingsIcon, 
  LogOut,
  Truck,
  ShoppingBag,
  Menu,
  X,
  User,
  Award,
  Briefcase,
  ChevronDown,
  Contact,
  BarChart3,
  BookOpen,
  Sun,
  Moon,
  Bell,
  Search,
  ArrowRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy,
  startAt,
  endAt
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, logout, authError, retryAuth } = useAuth();
  const [isRetryingAuth, setIsRetryingAuth] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { settings: businessSettings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; type: 'product' | 'customer' | 'sale'; title: string; subtitle: string; path: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowResults(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (globalSearch.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results: any[] = [];
        const term = globalSearch.toLowerCase();

        // Search Products
        const prodQuery = query(
          collection(db, 'products'),
          orderBy('name'),
          startAt(globalSearch),
          endAt(globalSearch + '\uf8ff'),
          limit(5)
        );
        const prodSnap = await getDocs(prodQuery);
        prodSnap.forEach(doc => {
          results.push({
            id: doc.id,
            type: 'product',
            title: doc.data().name,
            subtitle: `SKU: ${doc.data().sku} • Stock: ${doc.data().stock}`,
            path: `/inventory/${doc.id}`
          });
        });

        // Search Customers
        const custQuery = query(
          collection(db, 'customers'),
          orderBy('name'),
          startAt(globalSearch),
          endAt(globalSearch + '\uf8ff'),
          limit(5)
        );
        const custSnap = await getDocs(custQuery);
        custSnap.forEach(doc => {
          results.push({
            id: doc.id,
            type: 'customer',
            title: doc.data().name,
            subtitle: doc.data().phone || 'No phone',
            path: `/customers` // Should ideally link to detailed view if implemented
          });
        });

        // Search Sales
        const salesQuery = query(
          collection(db, 'sales'),
          orderBy('invoiceNumber'),
          startAt(globalSearch),
          endAt(globalSearch + '\uf8ff'),
          limit(3)
        );
        const salesSnap = await getDocs(salesQuery);
        salesSnap.forEach(doc => {
          results.push({
            id: doc.id,
            type: 'sale',
            title: doc.data().invoiceNumber,
            subtitle: `Customer: ${doc.data().customerName} • Total: ${doc.data().totalAmount}`,
            path: `/invoice/${doc.id}`
          });
        });

        setSearchResults(results);
      } catch (error) {
        console.error("Global search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  const [purchasesOpen, setPurchasesOpen] = useState(() => 
    location.pathname.startsWith('/purchases')
  );
  const [contactsOpen, setContactsOpen] = useState(() => 
    location.pathname.startsWith('/suppliers') || location.pathname.startsWith('/customers')
  );
  const [accountingOpen, setAccountingOpen] = useState(() => 
    location.pathname.startsWith('/accounting')
  );
  const [reportsOpen, setReportsOpen] = useState(() => 
    location.pathname.startsWith('/reports')
  );
  const [salesOpen, setSalesOpen] = useState(() => 
    ['/sales', '/salespeople', '/commissions'].some(path => location.pathname.startsWith(path))
  );

  useEffect(() => {
    if (location.pathname.startsWith('/purchases')) setPurchasesOpen(true);
    if (location.pathname.startsWith('/suppliers') || location.pathname.startsWith('/customers')) setContactsOpen(true);
    if (location.pathname.startsWith('/accounting')) setAccountingOpen(true);
    if (location.pathname.startsWith('/reports')) setReportsOpen(true);
    if (['/sales', '/salespeople', '/commissions'].some(path => location.pathname.startsWith(path))) setSalesOpen(true);
  }, [location.pathname]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Inventory', icon: Package, path: '/inventory' },
    { 
      name: 'Sales', 
      icon: ShoppingCart, 
      isNested: true,
      isOpen: salesOpen,
      setOpen: setSalesOpen,
      subItems: [
        { name: 'All Sales', path: '/sales' },
        { name: 'Sales Team', path: '/salespeople' },
        { name: 'Commissions', path: '/commissions' }
      ]
    },
    { 
      name: 'Purchases', 
      icon: ShoppingBag, 
      isNested: true,
      isOpen: purchasesOpen,
      setOpen: setPurchasesOpen,
      subItems: [
        { name: 'List Purchase', path: '/purchases' },
        { name: 'Purchase Orders', path: '/purchase-orders' },
        { name: 'Add Purchase', path: '/purchases?add=true' }
      ]
    },
    { 
      name: 'Contacts', 
      icon: Contact, 
      isNested: true,
      isOpen: contactsOpen,
      setOpen: setContactsOpen,
      subItems: [
        { name: 'Supplier Contacts', path: '/suppliers' },
        { name: 'Customer Contacts', path: '/customers' }
      ]
    },
    { name: 'Expenses', icon: Receipt, path: '/expenses' },
    { name: 'Follow-ups', icon: Bell, path: '/reminders' },
    { 
      name: 'Accounting', 
      icon: BookOpen, 
      isNested: true,
      isOpen: accountingOpen,
      setOpen: setAccountingOpen,
      subItems: [
        { name: 'Chart of Accounts', path: '/accounting/chart-of-accounts' },
        { name: 'Journal Entries', path: '/accounting/journal-entries' }
      ]
    },
    { 
      name: 'Reports', 
      icon: BarChart3, 
      isNested: true,
      isOpen: reportsOpen,
      setOpen: setReportsOpen,
      subItems: [
        { name: 'Profit & Loss', path: '/reports/profit-loss' },
        { name: 'Balance Sheet', path: '/reports/balance-sheet' },
        { name: 'Purchase & Sale', path: '/reports/purchase-sale' },
        { name: 'Supplier & Customer', path: '/reports/supplier-customer' },
        { name: 'Stock Report', path: '/reports/stock' },
        { name: 'Stock Adjustment', path: '/reports/stock-adjustment' },
        { name: 'Item Report', path: '/reports/item' },
        { name: 'Product Purchase', path: '/reports/product-purchase' },
        { name: 'Product Sale', path: '/reports/product-sale' },
        { name: 'Purchase Payment', path: '/reports/purchase-payment' },
        { name: 'Sale Payment', path: '/reports/sale-payment' },
        { name: 'Salesperson Performance', path: '/reports/salesperson-performance' }
      ]
    },
    { name: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex text-[var(--text-primary)] transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] z-50 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <Link to="/" className="flex items-center gap-3">
              {businessSettings?.logoUrl ? (
                <div className="h-10 w-10 flex items-center justify-center p-1 bg-white rounded-xl shadow-lg ring-1 ring-slate-800">
                  <img src={businessSettings.logoUrl} alt="Logo" className="max-h-full object-contain" />
                </div>
              ) : (
                <div className="h-8 w-8 bg-amber-500 rounded flex items-center justify-center font-bold text-black shadow-lg">
                  {businessSettings?.businessName?.charAt(0) || 'R'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-black text-sm uppercase tracking-tighter text-[var(--text-primary)] leading-tight">
                  {businessSettings?.businessName || 'Reza Metal Ind.'}
                </span>
                {businessSettings?.taxId && (
                  <span className="text-[8px] text-slate-500 font-bold tracking-widest uppercase">
                    BIN: {businessSettings.taxId}
                  </span>
                )}
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              if (item.isNested) {
                const isSubItemActive = item.subItems?.some(si => {
                  const path = si.path.split('?')[0];
                  return location.pathname === path;
                });
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => item.setOpen?.(!item.isOpen)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm",
                        isSubItemActive 
                          ? "bg-slate-800/50 text-amber-500" 
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} className={isSubItemActive ? "text-amber-500" : "text-slate-500"} />
                        {item.name}
                      </div>
                      <ChevronDown 
                        size={14} 
                        className={cn("transition-transform duration-200", item.isOpen ? "rotate-180" : "")} 
                      />
                    </button>
                    {item.isOpen && (
                      <div className="ml-9 space-y-1 border-l border-slate-800 pl-4">
                        {item.subItems?.map(sub => {
                          const subPath = sub.path.split('?')[0];
                          const fullPath = location.pathname + location.search;
                          const isSubActive = fullPath === sub.path || (location.pathname === subPath && !sub.path.includes('?'));
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "block py-2 text-xs font-bold transition-colors",
                                isSubActive ? "text-amber-500" : "text-slate-500 hover:text-slate-200"
                              )}
                            >
                              {sub.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                    isActive 
                      ? "bg-slate-800 text-amber-500 border border-slate-700 shadow-sm shadow-black/20" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  )}
                >
                  <item.icon size={18} className={isActive ? "text-amber-500" : "text-slate-500"} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 border border-slate-600">
                <User size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">{profile?.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors font-bold text-xs uppercase"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-6 transition-colors duration-300">
          <button 
            className="p-2 text-[var(--text-secondary)] lg:hidden hover:text-[var(--text-primary)]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 max-w-xl mx-8 relative hidden md:block" ref={searchRef}>
            <div className="relative group">
              <Search className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300",
                isSearching ? "text-amber-500 animate-pulse scale-110" : "text-slate-500 group-focus-within:text-amber-500"
              )} size={18} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search anything..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-12 pr-20 text-xs font-bold text-[var(--text-primary)] focus:border-amber-500/50 focus:ring-[12px] focus:ring-amber-500/5 transition-all outline-none placeholder:text-slate-600 shadow-sm group-hover:border-slate-700"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {globalSearch && (
                  <button 
                    onClick={() => { setGlobalSearch(''); searchInputRef.current?.focus(); }}
                    className="p-1 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700/50">
                  <span className="text-[9px] font-black text-slate-500">⌘</span>
                  <span className="text-[9px] font-black text-slate-500">K</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showResults && (globalSearch.length >= 2) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full mt-3 w-full bg-[#161B22]/90 border border-slate-800 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden z-[60] backdrop-blur-2xl ring-1 ring-white/5"
                >
                  <div className="p-5 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Command Center</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{searchResults.length} Results</span>
                       {isSearching && <div className="h-1 w-12 bg-amber-500 rounded-full animate-pulse" />}
                    </div>
                  </div>
                  
                  <div className="max-h-[450px] overflow-y-auto p-3 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-slate-900/20">
                    {searchResults.length > 0 ? (
                      (['product', 'customer', 'sale'] as const).map(type => {
                        const typeResults = searchResults.filter(r => r.type === type);
                        if (typeResults.length === 0) return null;
                        
                        return (
                          <div key={type} className="space-y-2">
                            <div className="px-4 py-1">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{type}s</span>
                            </div>
                            <div className="grid gap-1">
                              {typeResults.map((result, idx) => (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.03 }}
                                  key={result.id}
                                >
                                  <Link
                                    to={result.path}
                                    onClick={() => {
                                      setShowResults(false);
                                      setGlobalSearch('');
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20 group relative overflow-hidden"
                                  >
                                    <div className={cn(
                                      "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ring-1 ring-white/5",
                                      result.type === 'product' ? "bg-blue-500/10 text-blue-500" :
                                      result.type === 'customer' ? "bg-emerald-500/10 text-emerald-500" :
                                      "bg-purple-500/10 text-purple-500"
                                    )}>
                                      {result.type === 'product' ? <Package size={20} /> : 
                                      result.type === 'customer' ? <Users size={20} /> : 
                                      <Receipt size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-white group-hover:text-amber-500 transition-colors truncate">{result.title}</p>
                                        <ArrowRight size={10} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-500 truncate uppercase mt-0.5 tracking-wider group-hover:text-slate-400 transition-colors">{result.subtitle}</p>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-700 uppercase group-hover:text-amber-500/50 transition-colors">
                                      View {result.type}
                                    </div>
                                  </Link>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : !isSearching ? (
                      <div className="p-16 text-center">
                        <div className="h-14 w-14 bg-slate-800/30 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-slate-700/30">
                          <X size={24} className="text-slate-600" />
                        </div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                          No matches found<br/>
                          <span className="text-[10px] font-bold text-slate-700 normal-case">Try a different search term</span>
                        </p>
                      </div>
                    ) : (
                      <div className="p-16 flex flex-col items-center justify-center">
                        <div className="relative h-12 w-12">
                          <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full" />
                          <div className="absolute inset-0 border-t-2 border-amber-500 rounded-full animate-spin" />
                        </div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mt-6 animate-pulse">Querying Database</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-black text-slate-500">ESC</span>
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Close</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-black text-slate-500">↵</span>
                       <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Select</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="hidden sm:flex items-center gap-4 bg-[var(--bg-page)] border border-[var(--border-color)] px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest font-black">
                System Ready • Dhaka-02
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 border-t border-[var(--border-color)]">
          {authError === 'ANONYMOUS_AUTH_DISABLED' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] max-w-4xl shadow-lg relative overflow-hidden backdrop-blur-md"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-amber-500 font-black uppercase text-xs tracking-wider">
                    <AlertTriangle size={18} className="animate-pulse" />
                    <span>Action Required: Enable Anonymous Sign-In</span>
                  </div>
                  <p className="text-slate-300 text-xs font-semibold leading-relaxed max-w-2xl">
                    Your database changes will not save because <strong>Anonymous Auth</strong> is disabled in your Firebase project. To enable it:
                  </p>
                  <ol className="list-decimal list-inside text-[11px] text-slate-400 font-bold uppercase tracking-tight space-y-1 pl-1">
                    <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400 underline">Firebase Console</a></li>
                    <li>Go to <strong className="text-white">Authentication</strong> &gt; <strong className="text-white">Sign-in method</strong> tab</li>
                    <li>Add & enable the <strong className="text-amber-500">Anonymous</strong> provider</li>
                  </ol>
                </div>
                <button
                  onClick={async () => {
                    setIsRetryingAuth(true);
                    const isOk = await retryAuth();
                    setIsRetryingAuth(false);
                    if (isOk) {
                      console.log("Successfully connected with Firebase anonymously!");
                    }
                  }}
                  disabled={isRetryingAuth}
                  className={cn(
                    "px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/20 text-black font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2",
                    isRetryingAuth ? "animate-pulse" : ""
                  )}
                >
                  <RefreshCw size={12} className={cn("transition-transform", isRetryingAuth ? "animate-spin" : "")} />
                  {isRetryingAuth ? "Connecting..." : "Retry Connection"}
                </button>
              </div>
            </motion.div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
