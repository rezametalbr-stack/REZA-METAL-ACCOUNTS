import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  DollarSign,
  X,
  Bell
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, handleFirestoreError, OperationType, cn, CURRENCY_SYMBOL } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Supplier {
  id: string;
  contactId?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  totalPaid?: number;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [supplierForPayment, setSupplierForPayment] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [formData, setFormData] = useState({
    contactId: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    balance: 0,
    totalPaid: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), {
          ...formData,
          balance: Number(formData.balance),
          totalPaid: Number(formData.totalPaid)
        });
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...formData,
          balance: Number(formData.balance),
          totalPaid: Number(formData.totalPaid)
        });
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      setFormData({ contactId: '', name: '', contactPerson: '', phone: '', email: '', address: '', balance: 0, totalPaid: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'suppliers');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      contactId: supplier.contactId || '',
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      balance: supplier.balance,
      totalPaid: supplier.totalPaid || 0
    });
    setIsModalOpen(true);
  };

  const handleRecordPayment = (supplier: Supplier) => {
    setSupplierForPayment(supplier);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote('');
    setPaymentRef('');
    setCardNumber('');
    setCardHolder('');
    setBankAccount('');
    setMobileNumber('');
    setIsPaymentModalOpen(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForPayment) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    try {
      // 1. Update supplier balance
      await updateDoc(doc(db, 'suppliers', supplierForPayment.id), {
        balance: (supplierForPayment.balance || 0) - amount,
        totalPaid: (supplierForPayment.totalPaid || 0) + amount
      });

      // 2. Record transaction in a dedicated payments collection
      await addDoc(collection(db, 'payments'), {
        type: 'supplier_payment',
        entityId: supplierForPayment.id,
        entityName: supplierForPayment.name,
        amount: amount,
        method: paymentMethod,
        date: new Date(paymentDate),
        note: paymentNote,
        reference: paymentRef,
        // Additional Details
        cardNumber: paymentMethod === 'Card' ? cardNumber : null,
        cardHolder: paymentMethod === 'Card' ? cardHolder : null,
        bankAccount: paymentMethod === 'Bank Transfer' ? bankAccount : null,
        mobileNumber: ['Bkash', 'Nagad'].includes(paymentMethod) ? mobileNumber : null,
        createdAt: new Date()
      });

      setIsPaymentModalOpen(false);
      setSupplierForPayment(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `suppliers/${supplierForPayment.id}`);
    }
  };

  const handleQuickReminder = async (supplier: Supplier) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await addDoc(collection(db, 'reminders'), {
        title: `Follow up: ${supplier.name}`,
        description: `Reminder to contact ${supplier.name} for supplies or pending payment.`,
        dueDate: Timestamp.fromDate(tomorrow),
        status: 'pending',
        relatedTo: {
          type: 'supplier',
          id: supplier.id,
          name: supplier.name
        },
        createdAt: Timestamp.now()
      });
      alert('Reminder set for tomorrow!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'suppliers');
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && supplierForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#161B22] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-[#0F1218] border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">Record Payment</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">To: {supplierForPayment.name}</p>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#0B0D11] text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={submitPayment} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payment Amount Made</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs font-mono">{CURRENCY_SYMBOL}</div>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        autoFocus
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-2xl font-black text-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-800" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payment Method</label>
                    <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                    >
                      {['Cash', 'Card', 'Cheque', 'Bank Transfer', 'Bkash', 'Nagad', 'Others'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payment Date</label>
                    <input 
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Reference / Note</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text"
                        placeholder="Ref # (Optional)"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500 w-full"
                      />
                      <input 
                        type="text"
                        placeholder="Additional Note"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500 w-full"
                      />
                    </div>
                  </div>

                  {paymentMethod === 'Card' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Card Number</label>
                        <input 
                          type="text"
                          placeholder="XXXX XXXX XXXX XXXX"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Card Holder Name</label>
                        <input 
                          type="text"
                          placeholder="Name on Card"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </>
                  )}

                  {paymentMethod === 'Bank Transfer' && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Bank Account Number</label>
                      <input 
                        type="text"
                        placeholder="Account Number"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {['Bkash', 'Nagad'].includes(paymentMethod) && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{paymentMethod} Mobile Number</label>
                      <input 
                        type="text"
                        placeholder="01XXXXXXXXX"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="text-slate-500 font-black uppercase tracking-widest italic">Payable Adjustment:</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Current Payable:</span>
                    <span className="font-mono font-bold text-rose-500">{formatCurrency(supplierForPayment.balance)}</span>
                  </div>
                  {paymentAmount && !isNaN(parseFloat(paymentAmount)) && (
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-800 text-xs text-emerald-500">
                      <span className="font-bold">New Payable:</span>
                      <span className="font-mono font-black">{formatCurrency(supplierForPayment.balance - parseFloat(paymentAmount))}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 px-4 py-3 bg-[#0B0D11] text-slate-500 font-bold uppercase tracking-widest text-[10px] rounded-xl border border-slate-800">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-500/10 transition-all active:scale-95">Confirm Payment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161B22] p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Truck className="text-amber-500" size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Suppliers</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Vendor Network & Procurement</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all font-sans font-medium"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-amber-500/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Onboard Vendor
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#161B22] p-6 rounded-3xl border border-slate-800/50 shadow-lg">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Network Vendors</p>
          <p className="text-3xl font-black text-white tracking-tighter">{suppliers.length}</p>
        </div>
        <div className="bg-[#161B22] p-6 rounded-3xl border border-slate-800/50 shadow-lg">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 px-1">Total Payable (Due)</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(suppliers.reduce((acc, s) => acc + (s.balance || 0), 0))}
          </p>
        </div>
        <div className="bg-[#161B22] p-6 rounded-3xl border border-slate-800/50 shadow-lg">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 px-1">Total Payments (Paid)</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(suppliers.reduce((acc, s) => acc + (s.totalPaid || 0), 0))}
          </p>
        </div>
        <div className="bg-[#161B22] p-6 rounded-3xl border border-slate-800/50 shadow-lg">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 px-1">Total Procurement</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(suppliers.reduce((acc, s) => acc + (s.totalPaid || 0) + (s.balance || 0), 0))}
          </p>
        </div>
      </div>

      <div className="bg-[#161B22] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#0F1218]">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Supplier Ledger</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Filter vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B0D11] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none w-64 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B0D11]">
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Contact ID</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Company Name</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Primary Contact</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Phone</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Email</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Location</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Total Purchase</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Paid</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-800">Balance</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No vendor records found</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-amber-500 font-bold font-mono">
                      {supplier.contactId || '---'}
                    </td>
                    <td className="py-3 px-6 border-r border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 font-black text-xs border border-amber-500/20">
                          {supplier.name.charAt(0)}
                        </div>
                        <span className="font-bold text-white text-sm truncate max-w-[150px]">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans">{supplier.contactPerson || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans">{supplier.phone || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans truncate max-w-[150px]">{supplier.email || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-xs text-slate-400 font-sans truncate max-w-[150px]">{supplier.address || '---'}</td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-right">
                      <span className="font-mono text-sm font-bold text-amber-500">
                        {formatCurrency((supplier.totalPaid || 0) + supplier.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-right">
                      <span className="font-mono text-sm font-bold text-emerald-500">
                        {formatCurrency(supplier.totalPaid || 0)}
                      </span>
                    </td>
                    <td className="py-3 px-6 border-r border-slate-800/50 text-right">
                      <span className={cn(
                        "font-mono text-sm font-bold",
                        supplier.balance > 0 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {formatCurrency(supplier.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleRecordPayment(supplier)}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1"
                          title="Record Payment"
                        >
                          Paid
                        </button>
                        <button 
                          onClick={() => handleEdit(supplier)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-500 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleQuickReminder(supplier)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-500 transition-colors"
                          title="Set Reminder"
                        >
                          <Bell size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(supplier.id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-[#161B22] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                      <Truck className="text-amber-500" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter">
                        {editingSupplier ? 'Modify Vendor' : 'New Vendor'}
                      </h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Provider Relationship Details</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contact ID</label>
                        <input
                          type="text"
                          value={formData.contactId}
                          onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans font-bold"
                          placeholder="e.g. SUPP-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vendor/Company Name</label>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans font-bold"
                          placeholder="e.g. Zenith Metals Ltd."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contact Person</label>
                        <input
                          type="text"
                          value={formData.contactPerson}
                          onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Physical Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-[#0B0D11] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all font-sans h-24 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-1">Balance (Payable)</label>
                        <div className="relative">
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-sm tracking-tight">{CURRENCY_SYMBOL}</div>
                          <input
                            type="number"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                            className="w-full bg-[#0B0D11] font-black text-xl border border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-rose-500 focus:border-rose-500/50 outline-none transition-all font-sans"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1">Total Paid (Till Date)</label>
                        <div className="relative">
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-sm tracking-tight">{CURRENCY_SYMBOL}</div>
                          <input
                            type="number"
                            value={formData.totalPaid}
                            onChange={(e) => setFormData({ ...formData, totalPaid: Number(e.target.value) })}
                            className="w-full bg-[#0B0D11] font-black text-xl border border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-emerald-500 focus:border-emerald-500/50 outline-none transition-all font-sans"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl transition-all shadow-xl shadow-amber-500/10 active:scale-[0.98] mt-4"
                  >
                    {editingSupplier ? 'Update Vendor Profile' : 'Confirm Vendor Onboarding'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
