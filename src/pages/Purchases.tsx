import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  X, 
  Minus, 
  ChevronRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  runTransaction, 
  query, 
  orderBy, 
  Timestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, handleFirestoreError, OperationType, cn, CURRENCY_SYMBOL } from '../lib/utils';
import { downloadCSV } from '../lib/csvExport';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';

interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;
  total: number;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  date: any;
}

export default function Purchases() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Purchase>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  
  // For New Purchase Form
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cartItems, setCartItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsModalOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), orderBy('date', 'desc')), (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPurchases();
      unsubSuppliers();
      unsubProducts();
    };
  }, []);

  const addToCart = (product: any) => {
    const existing = cartItems.find(item => item.productId === product.id);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.cost }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        cost: product.cost || 0,
        total: product.cost || 0
      }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems(cartItems.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total: newQty * item.cost };
      }
      return item;
    }));
  };

  const updateCost = (productId: string, newCost: number) => {
    setCartItems(cartItems.map(item => 
      item.productId === productId 
        ? { ...item, cost: newCost, total: item.quantity * newCost }
        : item
    ));
  };

  const totalCart = cartItems.reduce((acc, item) => acc + item.total, 0);

  const filteredPurchases = purchases.filter(p => 
    p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    if (!sortField) return 0;
    
    let comparison = 0;
    if (sortField === 'date') {
      const dateA = a.date?.seconds || (a.date?.toDate?.()?.getTime() / 1000) || new Date(a.date).getTime() / 1000 || 0;
      const dateB = b.date?.seconds || (b.date?.toDate?.()?.getTime() / 1000) || new Date(b.date).getTime() / 1000 || 0;
      comparison = dateA - dateB;
    } else {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      }
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleExport = () => {
    const dataToExport = filteredPurchases.map(p => ({
      purchaseNumber: p.purchaseNumber,
      supplierName: p.supplierName,
      date: p.date ? (typeof p.date.toDate === 'function' ? p.date.toDate().toLocaleString() : new Date(p.date).toLocaleString()) : 'N/A',
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      balance: p.totalAmount - p.paidAmount,
      status: p.status,
      itemsCount: p.items.length
    }));

    const headers = {
      purchaseNumber: 'Purchase #',
      supplierName: 'Supplier Name',
      date: 'Date',
      totalAmount: `Total Amount (${CURRENCY_SYMBOL})`,
      paidAmount: `Paid Amount (${CURRENCY_SYMBOL})`,
      balance: `Balance Due (${CURRENCY_SYMBOL})`,
      status: 'Status',
      itemsCount: 'Items Count'
    };

    downloadCSV(dataToExport, 'Purchases_Report', headers);
  };

  const handleSort = (field: keyof Purchase) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: keyof Purchase }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="ml-1 text-emerald-500" /> : <ChevronDown size={12} className="ml-1 text-emerald-500" />;
  };

  const openEditModal = (purchase: Purchase) => {
    setIsEditing(true);
    setEditingId(purchase.id);
    setSelectedSupplier(purchase.supplierId);
    setCartItems(purchase.items);
    setPaidAmount(purchase.paidAmount);
    
    // Set date for editing
    if (purchase.date) {
      const dateObj = typeof purchase.date.toDate === 'function' ? purchase.date.toDate() : new Date(purchase.date);
      setPurchaseDate(dateObj.toISOString().split('T')[0]);
    } else {
      setPurchaseDate(new Date().toISOString().split('T')[0]);
    }
    
    setIsModalOpen(true);
  };

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (deletingIds.has(purchase.id)) return;
    if (!window.confirm('Are you sure you want to delete this purchase? This will revert stock and supplier balance.')) return;

    setDeletingIds(prev => new Set(prev).add(purchase.id));
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Prepare references
        const purchaseRef = doc(db, 'purchases', purchase.id);
        const supplierRef = doc(db, 'suppliers', purchase.supplierId);
        const items = purchase.items || [];
        const productRefs = items.map(item => doc(db, 'products', item.productId));

        // 2. Perform all reads first
        const supplierSnap = await transaction.get(supplierRef);
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // 3. Perform all writes
        // Revert Product Stock
        items.forEach((item, index) => {
          const snap = productSnaps[index];
          if (snap.exists()) {
            const currentData = snap.data();
            // Deleting a purchase means we REMOVE the stock we bought
            const newStock = Math.max(0, (currentData.stock || 0) - item.quantity);
            transaction.update(productRefs[index], { stock: newStock });
          }
        });

        // Revert Supplier Balance and Total Paid
        if (supplierSnap.exists()) {
          const currentData = supplierSnap.data();
          const unpaidAmount = purchase.totalAmount - purchase.paidAmount;
          
          transaction.update(supplierRef, { 
            balance: Math.max(0, (currentData.balance || 0) - unpaidAmount),
            totalPaid: Math.max(0, (currentData.totalPaid || 0) - purchase.paidAmount)
          });
        }

        // Delete Purchase
        transaction.delete(purchaseRef);
        
        // Delete associated payments if they exist
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('purchaseId', '==', purchase.id)));
        paymentsSnap.forEach(pDoc => transaction.delete(pDoc.ref));
      });
      alert('Purchase record deleted successfully.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `purchases/${purchase.id}`);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(purchase.id);
        return next;
      });
    }
  };

  const handleCreatePurchase = async () => {
    if (!selectedSupplier || cartItems.length === 0) return;

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    const status = paidAmount >= totalCart ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
    const remainingBalance = totalCart - paidAmount;

    try {
      await runTransaction(db, async (transaction) => {
        // Mode specific setup
        let oldPurchase: Purchase | null = null;
        if (isEditing && editingId) {
          const oldRef = doc(db, 'purchases', editingId);
          const oldSnap = await transaction.get(oldRef);
          if (oldSnap.exists()) {
            oldPurchase = { id: oldSnap.id, ...oldSnap.data() } as Purchase;
          }
        }

        // 1. Prepare references and perform ALL reads first
        const productRefs = cartItems.map(item => doc(db, 'products', item.productId));
        // Add old product refs if editing and different
        const allProductIds = new Set(cartItems.map(i => i.productId));
        if (oldPurchase) {
          oldPurchase.items.forEach(i => allProductIds.add(i.productId));
        }
        
        const uniqueProductRefs = Array.from(allProductIds).map(id => doc(db, 'products', id as string));
        const productSnaps = await Promise.all(uniqueProductRefs.map(ref => transaction.get(ref)));
        const productSnapMap = new Map(uniqueProductRefs.map((ref, idx) => [ref.id, productSnaps[idx]]));
        
        const supplierRef = doc(db, 'suppliers', selectedSupplier);
        const supplierSnap = await transaction.get(supplierRef);

        // If editing and supplier changed, need to read old supplier too
        let oldSupplierSnap = null;
        if (oldPurchase && oldPurchase.supplierId !== selectedSupplier) {
          const oldSupplierRef = doc(db, 'suppliers', oldPurchase.supplierId);
          oldSupplierSnap = await transaction.get(oldSupplierRef);
        }

        // 2. Perform writes
        
        // Revert Old Purchase effects if editing
        if (oldPurchase) {
          // Revert stock
          oldPurchase.items.forEach(item => {
            const snap = productSnapMap.get(item.productId);
            if (snap?.exists()) {
              const currentStock = snap.data().stock;
              // We'll update the actual value later in the "Apply New Purchase" section
              // but we need to track the intermediate stock value in our map if multiple items refer to same product
            }
          });

          // Revert supplier balance
          if (oldPurchase.supplierId === selectedSupplier) {
            // Updated later in the same supplier update
          } else if (oldSupplierSnap?.exists()) {
             const oldUnpaid = oldPurchase.totalAmount - oldPurchase.paidAmount;
             const oldRef = doc(db, 'suppliers', oldPurchase.supplierId);
             transaction.update(oldRef, { 
               balance: Math.max(0, oldSupplierSnap.data().balance - oldUnpaid),
               totalPaid: Math.max(0, (oldSupplierSnap.data().totalPaid || 0) - oldPurchase.paidAmount)
             });
          }
        }

        // Apply New/Updated Purchase
        const purchaseRef = isEditing && editingId ? doc(db, 'purchases', editingId) : doc(collection(db, 'purchases'));
        const purNum = isEditing && oldPurchase ? oldPurchase.purchaseNumber : `PUR-${Date.now().toString().slice(-6)}`;
        
        const newPurchaseData = {
          purchaseNumber: purNum,
          supplierId: selectedSupplier,
          supplierName: supplier.name,
          items: cartItems,
          totalAmount: totalCart,
          paidAmount: paidAmount,
          status: status,
          date: Timestamp.fromDate(new Date(purchaseDate))
        };

        transaction.set(purchaseRef, newPurchaseData);

        // Update Product Stock and Cost
        // Strategy: Calculate net change
        const stockChanges = new Map<string, number>();
        if (oldPurchase) {
          oldPurchase.items.forEach(i => stockChanges.set(i.productId, (stockChanges.get(i.productId) || 0) - i.quantity));
        }
        cartItems.forEach(i => stockChanges.set(i.productId, (stockChanges.get(i.productId) || 0) + i.quantity));

        stockChanges.forEach((change, productId) => {
          const snap = productSnapMap.get(productId);
          if (snap?.exists()) {
            const item = cartItems.find(ci => ci.productId === productId);
            const pRef = doc(db, 'products', productId as string);
            transaction.update(pRef, {
              stock: Math.max(0, snap.data().stock + change),
              ...(item ? { cost: item.cost } : {})
            });
          }
        });

        // Update Supplier Balance and Total Paid
        if (supplierSnap.exists()) {
          const currentSupplierData = supplierSnap.data();
          let balanceAdj = remainingBalance;
          let paidAdj = paidAmount;
          
          if (oldPurchase && oldPurchase.supplierId === selectedSupplier) {
            const oldUnpaid = oldPurchase.totalAmount - oldPurchase.paidAmount;
            balanceAdj = remainingBalance - oldUnpaid;
            paidAdj = paidAmount - oldPurchase.paidAmount;
          }
          
          transaction.update(supplierRef, { 
            balance: Math.max(0, currentSupplierData.balance + balanceAdj),
            totalPaid: (currentSupplierData.totalPaid || 0) + paidAdj
          });
        }
      });

      setIsModalOpen(false);
      setIsEditing(false);
      setEditingId(null);
      setCartItems([]);
      setSelectedSupplier('');
      setPaidAmount(0);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'purchases/transaction');
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <ShoppingBag className="text-emerald-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Purchases</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Inbound Stock & Procurement</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setSelectedSupplier('');
              setPurchaseDate(new Date().toISOString().split('T')[0]);
              setCartItems([]);
              setPaidAmount(0);
              setIsModalOpen(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Record New Purchase
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#161B22] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Recent Procurement</h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleExport}
              className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0B0D11] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:border-emerald-500 outline-none w-64 transition-all"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11]/50">
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('purchaseNumber')} className="flex items-center hover:text-white transition-colors">
                    Purchase # <SortIcon field="purchaseNumber" />
                  </button>
                </th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('supplierName')} className="flex items-center hover:text-white transition-colors">
                    Supplier <SortIcon field="supplierName" />
                  </button>
                </th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-white transition-colors">
                    Date <SortIcon field="date" />
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
              {sortedPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-5 px-8">
                    <span className="font-mono text-xs font-bold text-slate-400">{purchase.purchaseNumber}</span>
                  </td>
                  <td className="py-5 px-8">
                    <p className="font-bold text-white text-sm">{purchase.supplierName}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{purchase.items.length} Items</p>
                  </td>
                  <td className="py-5 px-8">
                    <span className="text-xs text-slate-400 font-medium">
                      {purchase.date ? formatDate(purchase.date.toDate()) : '---'}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <span className="font-black text-white">{formatCurrency(purchase.totalAmount)}</span>
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        purchase.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        purchase.status === 'partial' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        {purchase.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link 
                        to={`/purchases/${purchase.id}`}
                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        title="View Purchase Bill"
                      >
                         <Eye size={16} />
                      </Link>
                      <button 
                        onClick={() => openEditModal(purchase)}
                        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeletePurchase(purchase)}
                        disabled={deletingIds.has(purchase.id)}
                        className={cn(
                          "p-2 transition-all rounded-lg",
                          deletingIds.has(purchase.id) ? "opacity-50 cursor-not-allowed" : "text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        )}
                      >
                        <Trash2 size={14} className={cn(deletingIds.has(purchase.id) && "animate-spin")} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Screen Modal for recording new purchase */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0D11]">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="h-16 lg:h-20 border-b border-slate-800 px-6 lg:px-10 flex items-center justify-between bg-[#161B22]"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black">
                  <ShoppingBag size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {isEditing ? 'Modify Purchase' : 'Record Procurement'}
                  </h2>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {isEditing ? `Editing ${purchases.find(p => p.id === editingId)?.purchaseNumber}` : 'New Stock Intake Session'}
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
              {/* Product Picker */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-10 border-r border-slate-800 bg-[#0F1218]">
                <div className="max-w-4xl mx-auto space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#161B22] p-6 rounded-2xl border border-slate-800 space-y-4 text-left">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Supplier / Vendor</label>
                    <select 
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-5 py-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-white font-bold outline-none font-sans"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-[#161B22] p-6 rounded-2xl border border-slate-800 space-y-4 text-left">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Purchase Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-12 pr-5 py-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-white font-bold outline-none font-sans"
                      />
                    </div>
                  </div>
                </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Plus size={14} className="text-emerald-500" />
                        Quick Add Items
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-[#161B22] border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                        >
                          <div>
                            <p className="text-sm font-bold text-white mb-1">{product.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">Stock: {product.stock} {product.unit}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cart / Checkout */}
              <div className="w-full lg:w-[450px] bg-[#161B22] border-l border-slate-800 flex flex-col max-h-[500px] lg:max-h-none">
                <div className="p-8 border-b border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Final Intake List</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                      <ShoppingBag size={40} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
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
                             <label className="text-[9px] font-black text-slate-600 uppercase">Quantity</label>
                             <div className="flex items-center gap-3">
                               <button onClick={() => updateQuantity(item.productId, -1)} className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                 <Minus size={14} />
                               </button>
                               <span className="font-mono text-sm font-bold text-white">{item.quantity}</span>
                               <button onClick={() => updateQuantity(item.productId, 1)} className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                 <Plus size={14} />
                               </button>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-600 uppercase">Unit Cost ({CURRENCY_SYMBOL})</label>
                             <input 
                               type="number" 
                               value={item.cost}
                               onChange={(e) => updateCost(item.productId, Number(e.target.value))}
                               className="w-full bg-[#161B22] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold font-mono outline-none focus:border-emerald-500"
                             />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-600 uppercase tracking-widest">Total cost</span>
                          <span className="text-emerald-500">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-8 border-t border-slate-800 space-y-6">
                  <div className="flex justify-between items-center bg-[#0B0D11] p-5 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subtotal Payable</span>
                    <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(totalCart)}</span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0B0D11] p-5 rounded-2xl border border-slate-800 border-dashed">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balance Remaining</span>
                    <span className="text-xl font-black text-amber-500 tracking-tighter">{formatCurrency(Math.max(0, totalCart - paidAmount))}</span>
                  </div>

                  <div className="space-y-2 px-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mb-1">Capped Payment</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs font-mono">{CURRENCY_SYMBOL}</div>
                      <input 
                        type="number" 
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-emerald-500 font-black text-lg tracking-tighter focus:shadow-[0_0_20px_rgba(16,185,129,0.1)] focus:border-emerald-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleCreatePurchase}
                    disabled={!selectedSupplier || cartItems.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black uppercase tracking-widest text-[10px] py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
                  >
                    {isEditing ? 'Update Purchase Record' : 'Confirm & Update stock'}
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
