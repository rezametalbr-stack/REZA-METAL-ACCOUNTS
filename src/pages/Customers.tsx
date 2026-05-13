import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  X,
  ArrowUpDown,
  Filter,
  Bell
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn, handleFirestoreError, OperationType, CURRENCY_SYMBOL } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Customer {
  id: string;
  contactId?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  totalPaid?: number;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [customerForPayment, setCustomerForPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'balance' | 'totalSale' | 'totalPaid'; direction: 'asc' | 'desc' | null }>({ key: 'balance', direction: null });
  const [showOnlyDue, setShowOnlyDue] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
      setCustomers(docs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const processedCustomers = customers
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.phone?.includes(searchTerm);
      const matchesDue = showOnlyDue ? (c.balance || 0) > 0 : true;
      return matchesSearch && matchesDue;
    })
    .sort((a, b) => {
      if (!sortConfig.direction) return 0;
      
      let valA = 0;
      let valB = 0;

      if (sortConfig.key === 'balance') {
        valA = a.balance || 0;
        valB = b.balance || 0;
      } else if (sortConfig.key === 'totalPaid') {
        valA = a.totalPaid || 0;
        valB = b.totalPaid || 0;
      } else if (sortConfig.key === 'totalSale') {
        valA = (a.totalPaid || 0) + (a.balance || 0);
        valB = (b.totalPaid || 0) + (b.balance || 0);
      }

      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });

  const toggleSort = (key: 'balance' | 'totalSale' | 'totalPaid') => {
    setSortConfig(current => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : current.direction === 'desc' ? null : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      contactId: formData.get('contactId') as string,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      balance: Number(formData.get('balance')) || 0,
      totalPaid: Number(formData.get('totalPaid')) || 0,
    };

    if (editingCustomer) {
      try {
        await updateDoc(doc(db, 'customers', editingCustomer.id), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `customers/${editingCustomer.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'customers'), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'customers');
      }
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleRecordPayment = (customer: Customer) => {
    setCustomerForPayment(customer);
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
    if (!customerForPayment) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    try {
      // 1. Update customer balance
      await updateDoc(doc(db, 'customers', customerForPayment.id), {
        balance: (customerForPayment.balance || 0) - amount,
        totalPaid: (customerForPayment.totalPaid || 0) + amount
      });

      // 2. Record transaction in a dedicated payments collection
      await addDoc(collection(db, 'payments'), {
        type: 'customer_payment',
        entityId: customerForPayment.id,
        entityName: customerForPayment.name,
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
      setCustomerForPayment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${customerForPayment.id}`);
    }
  };

  const handleQuickReminder = async (customer: Customer) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await addDoc(collection(db, 'reminders'), {
        title: `Follow up: ${customer.name}`,
        description: `Reminder to contact ${customer.name} for payment or order update.`,
        dueDate: Timestamp.fromDate(tomorrow),
        status: 'pending',
        relatedTo: {
          type: 'customer',
          id: customer.id,
          name: customer.name
        },
        createdAt: Timestamp.now()
      });
      alert('Reminder set for tomorrow!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && customerForPayment && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">Record Payment</h3>
                  <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mt-1">From: {customerForPayment.name}</p>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={submitPayment} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Payment Amount Received</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold text-xs font-mono">{CURRENCY_SYMBOL}</div>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        autoFocus
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-4 text-2xl font-black text-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-700" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Payment Method</label>
                    <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500"
                    >
                      {['Cash', 'Card', 'Cheque', 'Bank Transfer', 'Bkash', 'Nagad', 'Others'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Payment Date</label>
                    <input 
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Reference / Note</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text"
                        placeholder="Ref # (Optional)"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500 w-full"
                      />
                      <input 
                        type="text"
                        placeholder="Additional Note"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500 w-full"
                      />
                    </div>
                  </div>

                  {paymentMethod === 'Card' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Card Number</label>
                        <input 
                          type="text"
                          placeholder="XXXX XXXX XXXX XXXX"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Card Holder Name</label>
                        <input 
                          type="text"
                          placeholder="Name on Card"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500"
                        />
                      </div>
                    </>
                  )}

                  {paymentMethod === 'Bank Transfer' && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Bank Account Number</label>
                      <input 
                        type="text"
                        placeholder="Account Number"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {['Bkash', 'Nagad'].includes(paymentMethod) && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">{paymentMethod} Mobile Number</label>
                      <input 
                        type="text"
                        placeholder="01XXXXXXXXX"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="text-amber-500 font-black uppercase tracking-widest mb-1 italic">Current Balance Adjustment:</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                    <span>Current Balance:</span>
                    <span className="font-mono font-bold text-rose-500">{formatCurrency(customerForPayment.balance)}</span>
                  </div>
                  {paymentAmount && !isNaN(parseFloat(paymentAmount)) && (
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-[var(--border-color)] text-xs text-emerald-500">
                      <span className="font-bold">New Balance:</span>
                      <span className="font-mono font-black">{formatCurrency(customerForPayment.balance - parseFloat(paymentAmount))}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 px-4 py-3 bg-[var(--bg-page)] text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[10px] rounded-xl border border-[var(--border-color)]">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-500/10 transition-all active:scale-95">Confirm Receipt</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Customer Directory</h1>
          <p className="text-[var(--text-secondary)] font-medium">Manage client relations and accounts receivable</p>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setIsModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Add Customer
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-lg">
          <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Active Customers</p>
          <p className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{customers.length}</p>
        </div>
        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-lg">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 px-1">Total Receivables (Due)</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(customers.reduce((acc, c) => acc + (c.balance || 0), 0))}
          </p>
        </div>
        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-lg">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 px-1">Total Collections (Paid)</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(customers.reduce((acc, c) => acc + (c.totalPaid || 0), 0))}
          </p>
        </div>
        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-lg">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 px-1">Total Sales Revenue</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(customers.reduce((acc, c) => acc + (c.totalPaid || 0) + (c.balance || 0), 0))}
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="p-8 border-b border-[var(--border-color)] flex flex-wrap justify-between items-center bg-[var(--bg-sidebar)] gap-4">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Customer Accounts</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={14} />
              <input 
                type="text" 
                placeholder="Filter spreadsheet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none w-64 transition-all"
              />
            </div>
            <button
              onClick={() => setShowOnlyDue(!showOnlyDue)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                showOnlyDue 
                  ? "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                  : "bg-[var(--bg-page)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Filter size={14} />
              Due Only
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-page)]">
                <th className="text-left py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)]">Contact ID</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)]">Name</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)]">Phone</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)]">Email</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)]">Address</th>
                <th 
                  className="text-right py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-sidebar)] transition-colors group"
                  onClick={() => toggleSort('totalSale')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Total Sale
                    <ArrowUpDown 
                      size={12} 
                      className={cn(
                        "transition-colors",
                        sortConfig.key === 'totalSale' && sortConfig.direction ? "text-amber-500" : "text-slate-600 group-hover:text-slate-400"
                      )} 
                    />
                  </div>
                </th>
                <th 
                  className="text-right py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-sidebar)] transition-colors group"
                  onClick={() => toggleSort('totalPaid')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Paid
                    <ArrowUpDown 
                      size={12} 
                      className={cn(
                        "transition-colors",
                        sortConfig.key === 'totalPaid' && sortConfig.direction ? "text-amber-500" : "text-slate-600 group-hover:text-slate-400"
                      )} 
                    />
                  </div>
                </th>
                <th 
                  className="text-right py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-r border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-sidebar)] transition-colors group"
                  onClick={() => toggleSort('balance')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Balance
                    <ArrowUpDown 
                      size={12} 
                      className={cn(
                        "transition-colors",
                        sortConfig.key === 'balance' && sortConfig.direction ? "text-amber-500" : "text-slate-600 group-hover:text-slate-400"
                      )} 
                    />
                  </div>
                </th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs">Loading ledger...</td>
                </tr>
              ) : processedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs">No records found</td>
                </tr>
              ) : (
                processedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg-page)] transition-colors group">
                    <td className="py-3 px-6 border-r border-[var(--border-color)] text-xs text-amber-500 font-bold font-mono">
                      {c.contactId || '---'}
                    </td>
                    <td className="py-3 px-6 border-r border-[var(--border-color)]">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 font-black text-xs border border-amber-500/20">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-bold text-[var(--text-primary)] text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 border-r border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-sans">{c.phone || '---'}</td>
                    <td className="py-3 px-6 border-r border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-sans">{c.email || '---'}</td>
                    <td className="py-3 px-6 border-r border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-sans truncate max-w-[200px]">{c.address || '---'}</td>
                    <td className="py-3 px-6 border-r border-[var(--border-color)] text-right">
                      <span className="font-mono text-sm font-bold text-amber-500">
                        {formatCurrency((c.totalPaid || 0) + c.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-6 border-r border-[var(--border-color)] text-right">
                      <span className="font-mono text-sm font-bold text-emerald-500">
                        {formatCurrency(c.totalPaid || 0)}
                      </span>
                    </td>
                    <td className="py-3 px-6 border-r border-[var(--border-color)] text-right">
                      <span className={cn(
                        "font-mono text-sm font-bold",
                        c.balance > 0 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {formatCurrency(c.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleRecordPayment(c)}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1"
                          title="Record Payment"
                        >
                          Paid
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCustomer(c);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-[var(--bg-sidebar)] rounded-lg text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleQuickReminder(c)}
                          className="p-1.5 hover:bg-[var(--bg-sidebar)] rounded-lg text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
                          title="Set Reminder"
                        >
                          <Bell size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-[var(--text-secondary)] hover:text-rose-500 transition-colors"
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
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                    {editingCustomer ? 'EDIT CLIENT' : 'NEW CLIENT'}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mt-1">
                    {editingCustomer ? 'Update details' : 'Registration form'}
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Contact ID</label>
                      <input name="contactId" defaultValue={editingCustomer?.contactId} className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-500" placeholder="e.g. CUST-001" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Customer Full Name</label>
                      <input name="name" defaultValue={editingCustomer?.name} required className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-500" placeholder="e.g. John Doe" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Phone Number</label>
                      <input name="phone" defaultValue={editingCustomer?.phone} className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-500" placeholder="+880..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Email Address</label>
                      <input type="email" name="email" defaultValue={editingCustomer?.email} className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-500" placeholder="client@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Office/Home Address</label>
                    <textarea name="address" defaultValue={editingCustomer?.address} rows={3} className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-500 resize-none" placeholder="Full street address..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Initial Balance (Debit)</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold text-xs">{CURRENCY_SYMBOL}</div>
                        <input type="number" name="balance" defaultValue={editingCustomer?.balance || 0} step="0.01" className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl pl-8 pr-4 py-3 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all font-bold tracking-tight" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Total Paid (Till Date)</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold text-xs">{CURRENCY_SYMBOL}</div>
                        <input type="number" name="totalPaid" defaultValue={editingCustomer?.totalPaid || 0} step="0.01" className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl pl-8 pr-4 py-3 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all font-bold tracking-tight" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3.5 bg-[var(--bg-page)] border border-[var(--border-color)] hover:border-slate-400 text-[var(--text-secondary)] rounded-xl font-bold uppercase tracking-widest text-xs transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                    {editingCustomer ? 'Update Client' : 'Add Client'}
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
