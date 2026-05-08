import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, 
  Package, 
  History, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Truck,
  Calendar,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, formatDate } from '../lib/utils';

interface Transaction {
  id: string;
  date: Timestamp;
  type: 'sale' | 'purchase';
  quantity: number;
  price: number;
  entityName: string; // Customer or Supplier
  reference: string; // Invoice # or Purchase #
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      try {
        // 1. Fetch Product
        const productRef = doc(db, 'products', id);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          setLoading(false);
          return;
        }
        setProduct({ id: productSnap.id, ...productSnap.data() });

        // 2. Fetch Sales (Transactions where this product was sold)
        // Note: This requires scanning sales because sub-items are in an array
        // In a high-scale app, we'd use a dedicated 'stock_ledger' collection
        const salesSnap = await getDocs(collection(db, 'sales'));
        const productSales: Transaction[] = [];
        salesSnap.forEach(docSnap => {
          const data = docSnap.data();
          const item = data.items?.find((i: any) => i.productId === id);
          if (item) {
            const saleDate = data.date;
            productSales.push({
              id: docSnap.id,
              date: saleDate,
              type: 'sale',
              quantity: item.quantity,
              price: item.price,
              entityName: data.customerName,
              reference: data.invoiceNumber
            });
          }
        });

        // 3. Fetch Purchases (Transactions where this product was bought)
        const purchasesSnap = await getDocs(collection(db, 'purchases'));
        const productPurchases: Transaction[] = [];
        purchasesSnap.forEach(docSnap => {
          const data = docSnap.data();
          const item = data.items?.find((i: any) => i.productId === id);
          if (item) {
            const purchaseDate = data.date;
            productPurchases.push({
              id: docSnap.id,
              date: purchaseDate,
              type: 'purchase',
              quantity: item.quantity,
              price: item.cost,
              entityName: data.supplierName,
              reference: data.purchaseNumber
            });
          }
        });

        // Combine and sort, filtering out transactions with invalid dates
        const allTransactions = [...productSales, ...productPurchases]
          .filter(tx => tx.date && typeof tx.date.toMillis === 'function')
          .sort((a, b) => b.date.toMillis() - a.date.toMillis());
        
        setTransactions(allTransactions);
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
    </div>
  );

  if (!product) return (
    <div className="p-8 text-center text-slate-500">Product not found.</div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/inventory')}
          className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Inventory Intelligence</p>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{product.name}</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] group hover:border-amber-500/50 transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <Layers size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Stock</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{product.stock} <span className="text-sm font-medium text-slate-500">{product.unit || 'Units'}</span></p>
          <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
             <p className="text-[9px] font-bold text-slate-500 uppercase">Valuation: {formatCurrency(product.stock * product.cost)}</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <TrendingUp size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selling Price</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(product.price)}</p>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
              <Truck size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Latest Cost</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(product.cost)}</p>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
              <ArrowRightLeft size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transactions</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{transactions.length}</p>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-slate-900/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-2xl text-slate-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Stock Ledger</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Chronological Movement Audit</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/20">
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity</th>
                <th className="text-left py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference</th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rate</th>
                <th className="text-right py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="py-5 px-8 font-mono text-[11px] text-slate-400">
                      {formatDate(tx.date.toDate())}
                    </td>
                    <td className="py-5 px-8">
                       <div className="flex items-center gap-2">
                          {tx.type === 'sale' ? (
                            <span className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg">
                              <TrendingDown size={14} />
                            </span>
                          ) : (
                            <span className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                              <TrendingUp size={14} />
                            </span>
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${tx.type === 'sale' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {tx.type}
                          </span>
                       </div>
                    </td>
                    <td className="py-5 px-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors">{tx.entityName}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-black">{tx.type === 'sale' ? 'Customer' : 'Supplier'}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8">
                       <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 group-hover:text-amber-500 transition-colors">
                         {tx.reference}
                       </span>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <span className={`text-sm font-black ${tx.type === 'sale' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {tx.type === 'sale' ? '-' : '+'}{tx.quantity}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-right text-slate-400 font-medium">
                      {formatCurrency(tx.price)}
                    </td>
                    <td className="py-5 px-8 text-right font-black text-white">
                      {formatCurrency(tx.quantity * tx.price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <ArrowRightLeft size={48} />
                      <p className="text-sm font-black uppercase tracking-widest">No transaction history found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
