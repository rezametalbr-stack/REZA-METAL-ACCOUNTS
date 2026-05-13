import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  X, 
  Minus, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  ArrowUp,
  ArrowDown,
  FileText,
  Truck
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, handleFirestoreError, OperationType, cn, CURRENCY_SYMBOL } from '../lib/utils';
import { downloadCSV } from '../lib/csvExport';
import { motion, AnimatePresence } from 'motion/react';

interface POItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  items: POItem[];
  totalAmount: number;
  expectedDeliveryDate: any;
  status: 'draft' | 'sent' | 'ordered' | 'received' | 'cancelled';
  date: any;
  notes?: string;
}

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrder['status'] | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<keyof PurchaseOrder>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState<PurchaseOrder['status']>('draft');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<POItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'purchaseOrders'), orderBy('date', 'desc'));
    const unsubPO = onSnapshot(q, (snapshot) => {
      setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPO();
      unsubSuppliers();
      unsubProducts();
    };
  }, []);

  const addToCart = (product: any) => {
    const existing = cartItems.find(item => item.productId === product.id);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * (item.cost || product.cost || 0) }
          : item
      ));
    } else {
      const cost = product.cost || 0;
      setCartItems([...cartItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        cost: cost,
        total: cost
      }]);
    }
  };

  const updateQuantity = (productId: string, value: string | number) => {
    const qty = typeof value === 'string' ? parseInt(value) : value;
    const newQty = isNaN(qty) ? 1 : Math.max(1, qty);
    
    setCartItems(cartItems.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: newQty, total: newQty * item.cost };
      }
      return item;
    }));
  };

  const updateCost = (productId: string, value: string) => {
    const newCost = value === '' ? 0 : parseFloat(value);
    setCartItems(cartItems.map(item => 
      item.productId === productId 
        ? { ...item, cost: isNaN(newCost) ? 0 : newCost, total: item.quantity * (isNaN(newCost) ? 0 : newCost) }
        : item
    ));
  };

  const totalCart = cartItems.reduce((acc, item) => acc + item.total, 0);

  const filteredPO = purchaseOrders
    .filter(po => {
      const matchesSearch = po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      
      let matchesDate = true;
      if (startDate || endDate) {
        if (po.expectedDeliveryDate) {
          const deliveryDate = po.expectedDeliveryDate?.toDate?.() || new Date(po.expectedDeliveryDate);
          if (startDate && deliveryDate < new Date(startDate)) matchesDate = false;
          if (endDate) {
            const endLimit = new Date(endDate);
            endLimit.setHours(23, 59, 59, 999);
            if (deliveryDate > endLimit) matchesDate = false;
          }
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date' || sortField === 'expectedDeliveryDate') {
        const valA = a[sortField]?.toDate?.() || new Date(a[sortField]) || new Date(0);
        const valB = b[sortField]?.toDate?.() || new Date(b[sortField]) || new Date(0);
        comparison = valA.getTime() - valB.getTime();
      } else if (typeof a[sortField] === 'string') {
        comparison = (a[sortField] as string).localeCompare(b[sortField] as string);
      } else if (typeof (a as any)[sortField] === 'number') {
        comparison = (a as any)[sortField] - (b as any)[sortField];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleExport = () => {
    const dataToExport = filteredPO.map(po => ({
      orderNumber: po.orderNumber,
      supplierName: po.supplierName,
      date: formatDate(po.date?.toDate?.() || po.date),
      expectedDelivery: po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate?.toDate?.() || po.expectedDeliveryDate) : 'N/A',
      totalAmount: po.totalAmount,
      status: po.status,
      itemsCount: po.items.length
    }));

    const headers = {
      orderNumber: 'PO #',
      supplierName: 'Supplier',
      date: 'Order Date',
      expectedDelivery: 'Expected Delivery',
      totalAmount: `Total (${CURRENCY_SYMBOL})`,
      status: 'Status',
      itemsCount: 'Items'
    };

    downloadCSV(dataToExport, 'Purchase_Orders_Report', headers);
  };

  const handleSort = (field: keyof PurchaseOrder) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: keyof PurchaseOrder }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp size={12} className="ml-1" /> : <ArrowDown size={12} className="ml-1" />;
  };

  const openEditModal = (po: PurchaseOrder) => {
    setIsEditing(true);
    setEditingId(po.id);
    setSelectedSupplier(po.supplierId);
    setCartItems(po.items);
    setStatus(po.status);
    setNotes(po.notes || '');
    
    if (po.date) {
      const dateObj = po.date?.toDate?.() || new Date(po.date);
      setOrderDate(dateObj.toISOString().split('T')[0]);
    }
    if (po.expectedDeliveryDate) {
      const deliveryDateObj = po.expectedDeliveryDate?.toDate?.() || new Date(po.expectedDeliveryDate);
      setDeliveryDate(deliveryDateObj.toISOString().split('T')[0]);
    } else {
      setDeliveryDate('');
    }
    
    setIsModalOpen(true);
  };

  const handleDeletePO = async (id: string) => {
    if (!window.confirm('Delete this purchase order?')) return;
    try {
      await deleteDoc(doc(db, 'purchaseOrders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `purchaseOrders/${id}`);
    }
  };

  const handleSavePO = async () => {
    if (!selectedSupplier || cartItems.length === 0) return;
    const supplier = suppliers.find(s => s.id === selectedSupplier);

    const poData: any = {
      orderNumber: isEditing ? (purchaseOrders.find(p => p.id === editingId)?.orderNumber) : `PO-${Date.now().toString().slice(-6)}`,
      supplierId: selectedSupplier,
      supplierName: supplier.name,
      items: cartItems,
      totalAmount: totalCart,
      status: status,
      date: Timestamp.fromDate(new Date(orderDate)),
      notes: notes
    };

    if (deliveryDate) {
      poData.expectedDeliveryDate = Timestamp.fromDate(new Date(deliveryDate));
    }

    try {
      if (isEditing && editingId) {
        await updateDoc(doc(db, 'purchaseOrders', editingId), poData);
      } else {
        await addDoc(collection(db, 'purchaseOrders'), poData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'purchaseOrders');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setSelectedSupplier('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate('');
    setStatus('draft');
    setNotes('');
    setCartItems([]);
  };

  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'received': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'ordered': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'sent': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
            <Truck className="text-blue-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Purchase Orders</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Order Placement & Delivery Tracking</p>
          </div>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-500 hover:bg-blue-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-blue-500/10 active:scale-95"
        >
          <Plus size={16} strokeWidth={3} />
          New Purchase Order
        </button>
      </div>

      <div className="bg-[#161B22] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Orders</h3>
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#0B0D11] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none w-full sm:w-64 transition-all"
                />
              </div>
              <button 
                onClick={handleExport}
                className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 bg-[#0B0D11] p-1 rounded-xl border border-slate-800">
              {(['all', 'draft', 'sent', 'ordered', 'received', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    statusFilter === s 
                      ? "bg-slate-800 text-white shadow-lg" 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#0B0D11] border border-slate-800 rounded-xl px-3 py-1.5">
                <Calendar size={12} className="text-slate-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Delivery From</span>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] text-white font-bold outline-none [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-2 bg-[#0B0D11] border border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">To</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] text-white font-bold outline-none [color-scheme:dark]"
                />
              </div>
              {(startDate || endDate || statusFilter !== 'all') && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('all'); }}
                  className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors px-2"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11]/50">
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('orderNumber')} className="flex items-center hover:text-white transition-colors">
                    Order # <SortIcon field="orderNumber" />
                  </button>
                </th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('supplierName')} className="flex items-center hover:text-white transition-colors">
                    Supplier <SortIcon field="supplierName" />
                  </button>
                </th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-white transition-colors">
                    Order Date <SortIcon field="date" />
                  </button>
                </th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('expectedDeliveryDate')} className="flex items-center hover:text-white transition-colors">
                    Expected Delivery <SortIcon field="expectedDeliveryDate" />
                  </button>
                </th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('totalAmount')} className="flex items-center justify-end w-full hover:text-white transition-colors">
                    Total <SortIcon field="totalAmount" />
                  </button>
                </th>
                <th className="text-center py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('status')} className="flex items-center justify-center w-full hover:text-white transition-colors">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredPO.map((po) => (
                <tr key={po.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-5 px-8">
                    <span className="font-mono text-xs font-bold text-slate-400">{po.orderNumber}</span>
                  </td>
                  <td className="py-5 px-8">
                    <p className="font-bold text-white text-sm">{po.supplierName}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{po.items.length} Items</p>
                  </td>
                  <td className="py-5 px-8">
                    <span className="text-xs text-slate-400 font-medium">
                      {formatDate(po.date?.toDate?.() || po.date)}
                    </span>
                  </td>
                  <td className="py-5 px-8">
                    <span className="text-xs text-slate-400 font-medium">
                      {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate?.toDate?.() || po.expectedDeliveryDate) : '---'}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <span className="font-black text-white">{formatCurrency(po.totalAmount)}</span>
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        getStatusColor(po.status)
                      )}>
                        {po.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(po)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeletePO(po.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPO.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <FileText size={48} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.2em]">No Purchase Orders Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0D11]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-20 border-b border-slate-800 px-10 flex items-center justify-between bg-[#161B22]"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center text-black">
                  <Truck size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {isEditing ? 'Modify Purchase Order' : 'Create Purchase Order'}
                  </h2>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {isEditing ? 'Update order details' : 'Draft a new procurement request'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-10 w-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </motion.div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="flex-1 overflow-y-auto p-10 border-r border-slate-800 bg-[#0F1218]">
                <div className="max-w-4xl mx-auto space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#161B22] p-6 rounded-2xl border border-slate-800 space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Supplier</label>
                      <select 
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold outline-none focus:border-blue-500"
                      >
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="bg-[#161B22] p-6 rounded-2xl border border-slate-800 space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Order Date</label>
                      <input 
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="bg-[#161B22] p-6 rounded-2xl border border-slate-800 space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Expected Delivery</label>
                      <input 
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-[#161B22] p-6 rounded-2xl border border-slate-800 space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Order Status</label>
                      <div className="flex flex-wrap gap-2">
                        {(['draft', 'sent', 'ordered', 'received', 'cancelled'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={cn(
                              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                              status === s 
                                ? getStatusColor(s)
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Plus size={14} className="text-blue-500" />
                      Add Items to Order
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-[#161B22] border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
                        >
                          <div>
                            <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-400">{product.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">Unit Cost: {formatCurrency(product.cost || 0)}</p>
                          </div>
                          <Plus size={16} className="text-slate-600 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#161B22] p-6 rounded-2xl border border-slate-800 space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Notes / Special Instructions</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter any additional details for the supplier..."
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-5 py-4 text-sm text-slate-300 outline-none focus:border-blue-500 min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[450px] bg-[#161B22] border-l border-slate-800 flex flex-col">
                <div className="p-8 border-b border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Summary</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                      <ShoppingBag size={40} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No items added</p>
                    </div>
                  ) : (
                    cartItems.map(item => (
                      <div key={item.productId} className="bg-[#0B0D11] p-5 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-white text-sm">{item.name}</p>
                          <button 
                            onClick={() => setCartItems(items => items.filter(i => i.productId !== item.productId))}
                            className="text-slate-600 hover:text-rose-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Quantity</label>
                             <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => updateQuantity(item.productId, item.quantity - 1)} 
                                 className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-90"
                               >
                                 <Minus size={14} />
                               </button>
                               <input 
                                 type="number"
                                 min="1"
                                 value={item.quantity}
                                 onChange={(e) => updateQuantity(item.productId, e.target.value)}
                                 className="w-16 bg-[#161B22] border border-slate-800 rounded-xl px-2 py-2 text-xs text-white font-bold font-mono outline-none focus:border-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                               />
                               <button 
                                 onClick={() => updateQuantity(item.productId, item.quantity + 1)} 
                                 className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-90"
                               >
                                 <Plus size={14} />
                               </button>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Unit Cost</label>
                             <div className="relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono font-bold">{CURRENCY_SYMBOL}</span>
                               <input 
                                 type="number" 
                                 min="0"
                                 step="0.01"
                                 value={item.cost === 0 ? '' : item.cost}
                                 onChange={(e) => updateCost(item.productId, e.target.value)}
                                 placeholder="0.00"
                                 className="w-full bg-[#161B22] border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-bold font-mono outline-none focus:border-blue-500 transition-all"
                               />
                             </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-600 uppercase tracking-widest">Line Total</span>
                          <span className="text-blue-500">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-8 border-t border-slate-800 space-y-6">
                  <div className="flex justify-between items-center bg-[#0B0D11] p-6 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Valuation</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{formatCurrency(totalCart)}</span>
                  </div>

                  <button 
                    onClick={handleSavePO}
                    disabled={!selectedSupplier || cartItems.length === 0}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black uppercase tracking-widest text-[10px] py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/10 active:scale-95"
                  >
                    {isEditing ? 'Update Purchase Order' : 'Save Purchase Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
