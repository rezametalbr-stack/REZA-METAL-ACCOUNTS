import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Filter,
  Download,
  X,
  Eye,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Bell,
  Clock
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn, handleFirestoreError, OperationType, CURRENCY_SYMBOL } from '../lib/utils';
import { downloadCSV } from '../lib/csvExport';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  category: string;
  commissionRate?: number;
}

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsModalOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(docs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === undefined || bValue === undefined) return 0;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Product) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'name', direction: 'asc' }; // Reset to default
      }
      return { key, direction: 'asc' };
    });
  };

  const handleQuickReminder = async (product: Product) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await addDoc(collection(db, 'reminders'), {
        title: `Follow up: ${product.name}`,
        description: `Reminder to check stock for ${product.name} (SKU: ${product.sku})`,
        dueDate: Timestamp.fromDate(tomorrow),
        status: 'pending',
        relatedTo: {
          type: 'inventory',
          id: product.id,
          name: product.name
        },
        createdAt: Timestamp.now()
      });
      alert('Reminder set for tomorrow!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = (mode: 'all' | 'low-stock' | 'commissions' = 'all') => {
    let exportData = [...filteredProducts];
    let filename = 'Inventory_Catalog';
    let headers: Record<string, string> = {
      name: 'Product Name',
      sku: 'SKU',
      category: 'Category',
      price: `Unit Price (${CURRENCY_SYMBOL})`,
      cost: `Default Cost (${CURRENCY_SYMBOL})`,
      margin: 'Margin (%)',
      stock: 'Current Stock',
      unit: 'Unit',
      commissionRate: 'Commission Rate (%)'
    };

    if (mode === 'low-stock') {
      exportData = products.filter(p => p.stock <= 10);
      filename = 'Low_Stock_Report';
      headers = {
        name: 'Product Name',
        sku: 'SKU',
        stock: 'Stock Left',
        unit: 'Unit',
        category: 'Category'
      };
    } else if (mode === 'commissions') {
      filename = 'Commission_Rates_Report';
      headers = {
        name: 'Product Name',
        sku: 'SKU',
        price: `Price (${CURRENCY_SYMBOL})`,
        margin: 'Margin (%)',
        commissionRate: 'Commission (%)',
        category: 'Category'
      };
    }

    const dataWithMargin = exportData.map(p => ({
      ...p,
      margin: p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(1) + '%' : '0%'
    }));

    downloadCSV(dataWithMargin, filename, headers);
    setIsExportMenuOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      price: Number(formData.get('price')),
      cost: Number(formData.get('cost')),
      stock: Number(formData.get('stock')),
      unit: formData.get('unit') as string,
      category: formData.get('category') as string,
      commissionRate: Number(formData.get('commissionRate')) || 0,
    };

    if (editingProduct) {
      try {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `products/${editingProduct.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'products'), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'products');
      }
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Inventory Catalog</h1>
          <p className="text-slate-500 font-medium">Manage stock levels and product specifications</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Add Product
        </button>
      </div>

      <div className="bg-[#161B22] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center bg-[#0F1218]">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-sans text-sm outline-none placeholder:text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all">
              <Filter size={14} />
              <span>Filter</span>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className={cn(
                  "px-4 py-2 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all",
                  isExportMenuOpen ? "bg-amber-500 text-black shadow-lg" : "text-slate-400 hover:bg-slate-800"
                )}
              >
                <Download size={14} />
                <span>Export Data</span>
              </button>

              <AnimatePresence>
                {isExportMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsExportMenuOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-[#161B22] border border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden"
                    >
                      <div className="p-2 space-y-1">
                        <button 
                          onClick={() => handleExport('all')}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors flex flex-col"
                        >
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Complete Catalog</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase">Export all inventory details</span>
                        </button>
                        <button 
                          onClick={() => handleExport('low-stock')}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors flex flex-col group"
                        >
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest group-hover:text-rose-400">Low Stock Alerts</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase">Export items with stock ≤ 10</span>
                        </button>
                        <button 
                          onClick={() => handleExport('commissions')}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors flex flex-col group"
                        >
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest group-hover:text-emerald-400">Commission Sheet</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase">Price & Commission focus</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0B0D11]/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Product Details
                    {sortConfig.key === 'name' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />
                    ) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('sku')}>
                  <div className="flex items-center gap-2">
                    SKU / ID
                    {sortConfig.key === 'sku' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />
                    ) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-2">
                    Category
                    {sortConfig.key === 'category' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />
                    ) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-2">
                    Unit Price
                    {sortConfig.key === 'price' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />
                    ) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </th>
                <th className="px-6 py-5 text-center">Margin (%)</th>
                <th className="px-6 py-5 text-center">Commission</th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('stock')}>
                  <div className="flex items-center gap-2">
                    Stock Level
                    {sortConfig.key === 'stock' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />
                    ) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-black uppercase text-xs tracking-widest">Loading inventory...</td></tr>
              ) : sortedProducts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-black uppercase text-xs tracking-widest">No products found</td></tr>
              ) : (
                sortedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/10 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-amber-500/5 border border-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:border-amber-500/30 transition-all">
                          <Package size={22} />
                        </div>
                        <span className="font-bold text-white group-hover:text-amber-500 transition-colors text-lg tracking-tight">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg tracking-widest uppercase">
                        {p.sku}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-black text-white text-lg tracking-tighter">{formatCurrency(p.price)}</td>
                    <td className="px-6 py-5 text-center">
                      {p.price > 0 ? (
                        <span className={cn(
                          "font-mono text-xs font-bold px-2 py-1 rounded-lg",
                          ((p.price - p.cost) / p.price) > 0.3 ? "text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" :
                          ((p.price - p.cost) / p.price) > 0.15 ? "text-amber-500 bg-amber-500/5 border border-amber-500/10" :
                          "text-rose-500 bg-rose-500/5 border border-rose-500/10"
                        )}>
                          {(((p.price - p.cost) / p.price) * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-600 font-bold text-[10px]">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded-lg">
                        {p.commissionRate || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xl font-black tracking-tighter tabular-nums",
                            p.stock <= 10 ? "text-rose-500" : "text-emerald-500"
                          )}>{p.stock}</span>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{p.unit}</span>
                        </div>
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              p.stock <= 10 ? "bg-rose-500" : "bg-emerald-500"
                            )} 
                            style={{ width: `${Math.min(100, (p.stock / 50) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/inventory/${p.id}`}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-blue-500 transition-all shadow-lg"
                          title="View Ledger"
                        >
                          <Eye size={16} />
                        </Link>
                        <button 
                          onClick={() => {
                            setEditingProduct(p);
                            setIsModalOpen(true);
                          }}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-amber-500 transition-all shadow-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleQuickReminder(p)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-amber-500 hover:border-amber-500 transition-all shadow-lg"
                          title="Set Reminder"
                        >
                          <Bell size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-600 hover:text-rose-500 hover:border-rose-500 transition-all shadow-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-[#0F1218] border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                    {editingProduct ? 'EDIT PRODUCT' : 'NEW PRODUCT'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    {editingProduct ? 'Update specifications' : 'Catalog entry form'}
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-200">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Product Description</label>
                    <input name="name" defaultValue={editingProduct?.name} required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700 font-bold" placeholder="e.g. 3/4 Conceal Stop Cock" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">SKU / Code</label>
                    <input name="sku" defaultValue={editingProduct?.sku} required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700 font-mono" placeholder="SC-001" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Category</label>
                    <input name="category" defaultValue={editingProduct?.category} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700" placeholder="Fittings" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Unit Price (Sale)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">{CURRENCY_SYMBOL}</div>
                      <input type="number" name="price" step="0.01" defaultValue={editingProduct?.price} required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-8 pr-4 py-3.5 text-emerald-500 font-black text-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all tracking-tighter tabular-nums" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Standard Cost (Purchase)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">{CURRENCY_SYMBOL}</div>
                      <input type="number" name="cost" step="0.01" defaultValue={editingProduct?.cost} required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-8 pr-4 py-3.5 text-rose-500 font-black text-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all tracking-tighter tabular-nums" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Initial Stock</label>
                    <input type="number" name="stock" defaultValue={editingProduct?.stock} required className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all font-bold tracking-tight" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Commission Rate (%)</label>
                    <div className="relative">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">%</div>
                      <input type="number" name="commissionRate" step="0.1" defaultValue={editingProduct?.commissionRate || 0} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-emerald-500 font-black text-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all tracking-tighter tabular-nums" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Unit of Measurement</label>
                    <input name="unit" defaultValue={editingProduct?.unit || 'pcs'} className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all font-bold" placeholder="pcs, kg, meters..." />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-4 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-amber-500/10 active:scale-95">
                    {editingProduct ? 'Update Product' : 'Register Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
