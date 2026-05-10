import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Eye, 
  MoreVertical,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Trash2,
  Download
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, doc, getDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, cn, handleFirestoreError, OperationType } from '../lib/utils';
import { downloadCSV } from '../lib/csvExport';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  totalAmount: number;
  discountPercentage?: number;
  discountValue?: number;
  discount2Percentage?: number;
  discount2Value?: number;
  paidAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  salespersonId?: string;
  totalCommission?: number;
  date: any;
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // For New Sale Form
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discount2Percentage, setDiscount2Percentage] = useState(0);

  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      setSales(docs.sort((a,b) => b.date?.seconds - a.date?.seconds));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSalespeople = onSnapshot(collection(db, 'salespeople'), (snapshot) => {
      setSalespeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSales();
      unsubCustomers();
      unsubProducts();
      unsubSalespeople();
    };
  }, []);

  const handleDeleteSale = async (sale: Sale) => {
    if (!window.confirm('Are you sure you want to delete this sale? This will revert customer balance and product stock.')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, 'sales', sale.id);
        const customerRef = doc(db, 'customers', sale.customerId);
        const customerSnap = await transaction.get(customerRef);

        // 1. Revert Customer Balance and Paid Amount
        if (customerSnap.exists()) {
          const currentData = customerSnap.data();
          const unpaidAmount = sale.totalAmount - sale.paidAmount;
          
          transaction.update(customerRef, {
            balance: Math.max(0, (currentData.balance || 0) - unpaidAmount),
            totalPaid: Math.max(0, (currentData.totalPaid || 0) - sale.paidAmount)
          });
        }

        // 2. Revert Product Stock
        for (const item of sale.items) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            transaction.update(productRef, {
              stock: productSnap.data().stock + item.quantity
            });
          }
        }

        // 3. Delete the Sale
        transaction.delete(saleRef);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sales/${sale.id}`);
    }
  };

  const totalCart = cartItems.reduce((acc, item) => acc + item.total, 0);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cartItems.find(item => item.productId === productId);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.productId === productId 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || cartItems.length === 0) return;

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;
    
    const subtotal = cartItems.reduce((acc, item) => acc + item.total, 0);
    const discountValue = (subtotal * discountPercentage) / 100;
    const netAfterDiscount1 = subtotal - discountValue;
    const discount2Value = (netAfterDiscount1 * discount2Percentage) / 100;
    const totalAmount = Math.max(0, netAfterDiscount1 - discount2Value);
    
    // Calculate final status
    const status = paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
    const remainingBalance = totalAmount - paidAmount;

    // Calculate total commission for this sale
    const discountFactor = subtotal > 0 ? totalAmount / subtotal : 1;
    let totalCommission = 0;
    cartItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product && product.commissionRate) {
        totalCommission += (item.total * product.commissionRate) / 100;
      }
    });
    // Apply discount scaling to commission
    totalCommission = totalCommission * discountFactor;

    try {
      const result = await runTransaction(db, async (transaction) => {
        // 1. Prepare references and perform ALL reads first
        const productRefs = cartItems.map(item => doc(db, 'products', item.productId));
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));
        
        const customerRef = doc(db, 'customers', selectedCustomer);
        const customerSnap = await transaction.get(customerRef);

        const existingBalance = customerSnap.exists() ? (customerSnap.data().balance || 0) : 0;
        const newBalance = existingBalance + remainingBalance;

        // 2. Perform all writes after reads
        const saleRef = collection(db, 'sales');
        const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
        const saleDocRef = doc(saleRef);
        
        const newSale = {
          invoiceNumber: invoiceNum,
          customerId: selectedCustomer,
          customerName: customer.name,
          salespersonId: selectedSalesperson || null,
          items: cartItems,
          totalAmount: totalAmount,
          discountPercentage: discountPercentage,
          discountValue: discountValue,
          discount2Percentage: discount2Percentage,
          discount2Value: discount2Value,
          totalCommission: totalCommission,
          paidAmount: paidAmount,
          status: status,
          previousBalance: existingBalance,
          newBalance: newBalance,
          date: Timestamp.now()
        };

        // Add Sale
      const docId = saleDocRef.id;
      await transaction.set(saleDocRef, newSale);

      // Record Commission if salesperson selected
      if (selectedSalesperson && totalCommission > 0) {
        const commissionRef = doc(collection(db, 'commissions'));
        transaction.set(commissionRef, {
          salespersonId: selectedSalesperson,
          saleId: docId,
          amount: totalCommission,
          date: Timestamp.now(),
          status: 'pending'
        });
      }

      // Update Product Stock
      cartItems.forEach((item, index) => {
        const snap = productSnaps[index];
        if (snap.exists()) {
          const newStock = snap.data().stock - item.quantity;
          transaction.update(productRefs[index], { stock: Math.max(0, newStock) });
        }
      });

        // Update Customer Balance and Total Paid
        if (customerSnap.exists()) {
          const currentData = customerSnap.data();
          const existingBalance = currentData.balance || 0;
          const existingPaid = currentData.totalPaid || 0;
          
          transaction.update(customerRef, { 
            balance: existingBalance + remainingBalance,
            totalPaid: existingPaid + paidAmount
          });
        }

      return docId;
    });

    setIsModalOpen(false);
    setCartItems([]);
    setSelectedCustomer('');
    setSelectedSalesperson('');
    setPaidAmount(0);
    setDiscountPercentage(0);
    setDiscount2Percentage(0);
    
    // Navigate to the newly created invoice
    if (result) {
      navigate(`/invoice/${result}`);
    }
  } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sales/transaction');
    }
  };

  const filteredSales = sales.filter(s => 
    s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const dataToExport = filteredSales.map(s => ({
      invoiceNumber: s.invoiceNumber,
      customerName: s.customerName,
      date: s.date ? (typeof s.date.toDate === 'function' ? s.date.toDate().toLocaleString() : new Date(s.date).toLocaleString()) : 'N/A',
      totalAmount: s.totalAmount,
      discount1Value: s.discountValue || 0,
      discount2Value: s.discount2Value || 0,
      paidAmount: s.paidAmount,
      balance: s.totalAmount - s.paidAmount,
      status: s.status,
      itemsCount: s.items.length
    }));
    
    const headers = {
      invoiceNumber: 'Invoice #',
      customerName: 'Customer Name',
      date: 'Date',
      totalAmount: 'Total Amount (Tk)',
      discount1Value: 'Discount 1 (Tk)',
      discount2Value: 'Discount 2 (Tk)',
      paidAmount: 'Paid Amount (Tk)',
      balance: 'Balance Due (Tk)',
      status: 'Status',
      itemsCount: 'Items Count'
    };
    
    downloadCSV(dataToExport, 'Sales_Report', headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase font-sans">Sales & Invoices</h1>
          <p className="text-slate-500 font-medium font-sans">Manage transactions and track receivables</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          <Plus size={18} strokeWidth={3} />
          New Sale
        </button>
      </div>

      <div className="bg-[#161B22] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center bg-[#0F1218]">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="text" 
              placeholder="Search by invoice # or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-sans text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all">
              <Filter size={14} />
              <span>Status</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0B0D11]/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800 font-sans">
              <tr>
                <th className="px-6 py-5">Invoice #</th>
                <th className="px-6 py-5">Customer</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-sans">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">Loading sales data...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 uppercase font-bold tracking-widest text-xs">No records found</td></tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/10 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-black text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-3 py-1.5 rounded-lg tracking-wider">
                        {s.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white group-hover:text-amber-500 transition-colors">{s.customerName}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                      {s.date ? formatDate(s.date.toDate()) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-black text-white text-lg tracking-tighter">
                      {formatCurrency(s.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/invoice/${s.id}`)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-amber-500 transition-all shadow-lg"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSale(s)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/50 transition-all shadow-lg"
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

      {/* New Sale Modal */}
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
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-5xl max-h-[92vh] bg-[#161B22] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F1218]">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">New sales invoice</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Transaction record creator</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-900 text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 text-slate-200">
                {/* Left: Product Selection */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0B0D11] p-6 rounded-2xl border border-slate-800 space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Customer</label>
                      <select 
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="w-full bg-[#161B22] border border-slate-800 rounded-xl px-5 py-3.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-white font-bold outline-none font-sans"
                      >
                        <option value="">-- Choose Customer --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-[#0B0D11] p-6 rounded-2xl border border-slate-800 space-y-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Assigned Representative</label>
                      <select 
                        value={selectedSalesperson}
                        onChange={(e) => setSelectedSalesperson(e.target.value)}
                        className="w-full bg-[#161B22] border border-slate-800 rounded-xl px-5 py-3.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-white font-bold outline-none font-sans"
                      >
                        <option value="">-- No Representative --</option>
                        {salespeople.filter(s => s.status === 'active').map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory Catalog</label>
                      <span className="text-[10px] font-bold text-amber-500/60">{products.length} items available</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 pb-4 scrollbar-thin">
                      {products.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-4 bg-[#0B0D11]/50 border border-slate-800/50 rounded-2xl hover:border-slate-700 transition-all group">
                          <div>
                            <p className="font-bold text-white leading-tight mb-1">{p.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-amber-500 font-mono">{formatCurrency(p.price)}</span>
                              <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                              <span className="text-[10px] font-bold text-slate-500">{p.stock} units</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => addToCart(p.id)}
                            disabled={p.stock <= 0}
                            className={cn(
                              "h-10 w-10 flex items-center justify-center rounded-xl transition-all shadow-lg active:scale-90",
                              p.stock <= 0 ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-amber-500 text-black hover:bg-amber-400"
                            )}
                          >
                            <Plus size={18} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Cart and Total */}
                <div className="lg:col-span-12 xl:col-span-5 bg-[#0F1218] rounded-3xl border border-slate-800/50 p-8 flex flex-col shadow-2xl relative">
                  <div className="absolute -top-3 -right-3 h-8 w-8 bg-amber-500 text-black rounded-lg flex items-center justify-center font-black text-xs rotate-12 shadow-lg">
                    {cartItems.length}
                  </div>
                  <h4 className="font-black text-white uppercase tracking-widest text-xs mb-8 border-b border-slate-800 pb-4 flex items-center gap-2">
                    <ShoppingCart size={14} className="text-amber-500" />
                    Cart Summary
                  </h4>
                  <div className="flex-1 space-y-5 mb-8 overflow-y-auto pr-2 scrollbar-thin">
                    {cartItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                        <ShoppingCart size={48} strokeWidth={1} />
                        <p className="mt-4 font-black uppercase text-[10px] tracking-widest">Cart is empty</p>
                      </div>
                    ) : (
                      cartItems.map((item) => (
                        <div key={item.productId} className="flex justify-between items-start bg-[#0B0D11] p-4 rounded-2xl border border-slate-800/50">
                          <div className="flex-1">
                            <p className="font-bold text-white text-sm mb-1">{item.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">{item.quantity} units</span>
                              <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                              <span className="text-[10px] font-black text-amber-500/70">{formatCurrency(item.price)}</span>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <span className="font-black text-white text-sm tracking-tight">{formatCurrency(item.total)}</span>
                            <button onClick={() => removeFromCart(item.productId)} className="text-slate-600 hover:text-rose-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                    <div className="space-y-4 pt-6 border-t border-slate-800">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-1">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Discount 1 (%)</label>
                          <div className="relative">
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">%</div>
                            <input 
                              type="number" 
                              value={discountPercentage}
                              onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                              className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-emerald-500 font-black text-lg tracking-tighter focus:border-emerald-500 outline-none font-sans"
                              placeholder="0"
                              max="100"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="p-1">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Discount 2 (%)</label>
                          <div className="relative">
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">%</div>
                            <input 
                              type="number" 
                              value={discount2Percentage}
                              onChange={(e) => setDiscount2Percentage(Number(e.target.value))}
                              className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-3.5 text-emerald-500 font-black text-lg tracking-tighter focus:border-emerald-500 outline-none font-sans"
                              placeholder="0"
                              max="100"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="p-1">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payment Received</label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Tk</div>
                            <input 
                              type="number" 
                              value={paidAmount}
                              onChange={(e) => setPaidAmount(Number(e.target.value))}
                              className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-white font-black text-lg tracking-tighter focus:border-amber-500 outline-none font-sans"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 py-2">
                        <div className="flex justify-between items-center px-4">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Gross Subtotal</span>
                          <span className="font-bold text-slate-400 text-xs">{formatCurrency(totalCart)}</span>
                        </div>
                        {discountPercentage > 0 && (
                          <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Discount 1 ({discountPercentage}%)</span>
                            <span className="font-bold text-emerald-500 text-xs">-{formatCurrency((totalCart * discountPercentage) / 100)}</span>
                          </div>
                        )}
                        {discount2Percentage > 0 && (
                          <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right">Discount 2 ({discount2Percentage}%) <br/><span className="text-[8px] opacity-70">(On Net After Disc. 1)</span></span>
                            <span className="font-bold text-emerald-500 text-xs">-{formatCurrency(((totalCart - (totalCart * discountPercentage / 100)) * discount2Percentage) / 100)}</span>
                          </div>
                        )}
                        {selectedSalesperson && (
                          <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sales Comm.</span>
                            <span className="font-bold text-slate-500 text-xs">
                              {formatCurrency(cartItems.reduce((acc, item) => {
                                const product = products.find(p => p.id === item.productId);
                                const baseComm = product?.commissionRate ? (item.total * product.commissionRate) / 100 : 0;
                                // Apply the same discount factor as the total bill
                                const discountFactor = totalCart > 0 ? (Math.max(0, (totalCart - (totalCart * discountPercentage / 100)) * (1 - discount2Percentage / 100))) / totalCart : 1;
                                return acc + (baseComm * discountFactor);
                              }, 0))}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Net Payable</span>
                        <span className="text-3xl font-black text-white tracking-tighter">
                          {formatCurrency(Math.max(0, (totalCart - (totalCart * discountPercentage / 100)) * (1 - discount2Percentage / 100)))}
                        </span>
                      </div>

                      <div className="flex justify-between items-center px-4 py-1">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Remaining Balance</span>
                        <span className={cn(
                          "font-black text-sm tracking-tight",
                          ((totalCart - (totalCart * discountPercentage / 100)) * (1 - discount2Percentage / 100)) - paidAmount > 0 ? "text-rose-500" : "text-emerald-500"
                        )}>
                          {formatCurrency(Math.max(0, ((totalCart - (totalCart * discountPercentage / 100)) * (1 - discount2Percentage / 100)) - paidAmount))}
                        </span>
                      </div>

                      <button 
                        onClick={handleCreateSale}
                        disabled={!selectedCustomer || cartItems.length === 0}
                        className="w-full mt-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black uppercase tracking-widest text-xs py-5 rounded-2xl transition-all shadow-xl shadow-amber-500/10 active:scale-[0.98]"
                      >
                        Process Final Invoice
                      </button>
                    </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: Sale['status'] }) {
  const configs = {
    paid: { icon: CheckCircle2, class: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10", label: "Paid" },
    partial: { icon: Clock, class: "text-amber-500 bg-amber-500/5 border-amber-500/10", label: "Partial" },
    unpaid: { icon: AlertCircle, class: "text-rose-500 bg-rose-500/5 border-rose-500/10", label: "Unpaid" },
  };

  const { icon: Icon, class: className, label } = configs[status];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
      className
    )}>
      <Icon size={10} strokeWidth={3} />
      {label}
    </span>
  );
}
