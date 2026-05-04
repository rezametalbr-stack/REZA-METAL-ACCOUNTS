import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Receipt, 
  Settings, 
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
  BookOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const [accountingOpen, setAccountingOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { 
      name: 'Products', 
      icon: Package, 
      isNested: true,
      isOpen: productsOpen,
      setOpen: setProductsOpen,
      subItems: [
        { name: 'List Products', path: '/inventory' },
        { name: 'Add Product', path: '/inventory?add=true' }
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
    { name: 'Sales Team', icon: Briefcase, path: '/salespeople' },
    { name: 'Sales', icon: ShoppingCart, path: '/sales' },
    { name: 'Commissions', icon: Award, path: '/commissions' },
    { name: 'Expenses', icon: Receipt, path: '/expenses' },
    { 
      name: 'Accounting', 
      icon: BookOpen, 
      isNested: true,
      isOpen: accountingOpen,
      setOpen: setAccountingOpen,
      subItems: [
        { name: 'Chart of Accounts', path: '/accounting/chart-of-accounts' }
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
        { name: 'Purchase & Sale', path: '/reports/purchase-sale' },
        { name: 'Supplier & Customer', path: '/reports/supplier-customer' },
        { name: 'Stock Report', path: '/reports/stock' },
        { name: 'Stock Adjustment', path: '/reports/stock-adjustment' },
        { name: 'Item Report', path: '/reports/item' },
        { name: 'Product Purchase', path: '/reports/product-purchase' },
        { name: 'Product Sale', path: '/reports/product-sale' },
        { name: 'Purchase Payment', path: '/reports/purchase-payment' },
        { name: 'Sale Payment', path: '/reports/sale-payment' }
      ]
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0B0D11] flex text-slate-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-[#0F1218] border-r border-slate-800 z-50 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-8 w-8 bg-amber-500 rounded flex items-center justify-center font-bold text-slate-950">
                R
              </div>
              <span className="font-bold text-sm uppercase tracking-tighter text-white">Reza Metal Ind.</span>
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
        <header className="h-16 bg-[#161B22] border-b border-slate-800 flex items-center justify-between px-6">
          <button 
            className="p-2 text-slate-400 lg:hidden hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 bg-[#0B0D11] border border-slate-800 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                System Ready • Dhaka-01
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
