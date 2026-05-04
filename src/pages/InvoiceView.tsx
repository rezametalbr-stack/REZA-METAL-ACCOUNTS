import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Printer, ArrowLeft, Download, Send } from 'lucide-react';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [salesperson, setSalesperson] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      const saleRef = doc(db, 'sales', id);
      const saleSnap = await getDoc(saleRef);
      
      if (saleSnap.exists()) {
        const saleData = saleSnap.data();
        setSale({ id: saleSnap.id, ...saleData });
        
        const customerRef = doc(db, 'customers', saleData.customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          setCustomer(customerSnap.data());
        }

        if (saleData.salespersonId) {
          const spRef = doc(db, 'salespeople', saleData.salespersonId);
          const spSnap = await getDoc(spRef);
          if (spSnap.exists()) {
            setSalesperson(spSnap.data());
          }
        }
      }
    }
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (!sale) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="h-12 w-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Generating Invoice...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center justify-between print:hidden">
        <button 
          onClick={() => navigate('/sales')}
          className="flex items-center gap-2 text-slate-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={3} />
          Back to Ledger
        </button>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all">
            <Download size={16} />
            Export PDF
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-black font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-amber-500/10 active:scale-95"
          >
            <Printer size={16} strokeWidth={3} />
            Print Copy
          </button>
        </div>
      </div>

      <div id="invoice-content" className="bg-[#161B22] border border-slate-800 shadow-2xl rounded-3xl overflow-hidden print:bg-white print:text-black print:border-0 print:shadow-none print:m-0">
        <div className="p-10 lg:p-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 relative">
            <div className="flex gap-6 items-start">
              <div className="h-20 w-20 bg-amber-500 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-amber-500/20 rotate-3 group-hover:rotate-0 transition-transform print:border-4 print:border-amber-500 print:bg-white print:text-amber-500">
                <span className="text-black font-black text-3xl print:text-amber-500">R</span>
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tighter leading-none print:text-black">REZA METAL</h1>
                <p className="text-amber-500 font-black uppercase tracking-[0.4em] text-[10px] mt-1">Industries & Solutions</p>
                <div className="text-slate-500 text-[10px] space-y-1 mt-6 font-bold uppercase tracking-widest print:text-slate-600">
                  <p>Corporate HQ: 12 Industrial Zone</p>
                  <p>Dhaka, Bangladesh</p>
                  <p>T: +880 1234-567890</p>
                  <p>W: rezametal-industries.com</p>
                </div>
              </div>
            </div>
            <div className="text-left md:text-right">
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 print:text-slate-600">Tax Invoice</h2>
              <div className="space-y-2">
                <div className="inline-block bg-[#0B0D11] border border-slate-800 px-4 py-2 rounded-xl print:bg-slate-50 print:border-slate-200">
                  <p className="text-amber-500 font-mono text-lg font-black tracking-widest">{sale.invoiceNumber}</p>
                </div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest print:text-slate-400">Computer Generated Document</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 px-1">
            <div className="bg-[#0B0D11]/30 p-8 rounded-3xl border border-slate-800/50 print:bg-slate-50 print:border-slate-200">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4">Invoice To</p>
              <div className="text-white print:text-black">
                <p className="font-black text-3xl tracking-tight mb-2 uppercase">{sale.customerName}</p>
                <div className="text-sm text-slate-400 space-y-1.5 mt-4 font-medium print:text-slate-600">
                  <p className="flex items-start gap-2 max-w-xs">{customer?.address || 'No Address Provided'}</p>
                  <p className="pt-2">Contact: {customer?.phone || 'No Phone'}</p>
                  <p>{customer?.email || 'No Email'}</p>
                </div>
              </div>
            </div>
            <div className="text-left md:text-right py-4">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-6 print:text-slate-400">Accounting Summary</p>
              <div className="space-y-4">
                <div className="flex justify-start md:justify-end gap-10">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Issue Date</span>
                  <span className="text-white font-black tracking-widest print:text-black text-sm">{sale.date ? formatDate(sale.date.toDate()) : 'N/A'}</span>
                </div>
                <div className="flex justify-start md:justify-end gap-10">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Due Date</span>
                  <span className="text-amber-500 font-black tracking-widest print:text-amber-600 text-sm">
                    {sale.date ? formatDate(new Date(sale.date.toDate().getTime() + 30 * 24 * 60 * 60 * 1000)) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-start md:justify-end gap-10 items-center">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Payment Status</span>
                  <span className={cn(
                    "font-black uppercase text-[10px] px-4 py-1.5 rounded-full border tracking-widest",
                    sale.status === 'paid' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 print:text-emerald-700" :
                    sale.status === 'partial' ? "text-amber-500 border-amber-500/20 bg-amber-500/5 print:text-amber-700" :
                    "text-rose-500 border-rose-500/20 bg-rose-500/5 print:text-rose-700"
                  )}>{sale.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-16 overflow-hidden rounded-2xl border border-slate-800/50 print:border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0B0D11] text-left print:bg-slate-50">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Description</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Qty</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Unit Price</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                {sale.items.map((item: any, index: number) => (
                  <tr key={index} className="bg-[#161B22]/50 print:bg-white transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-black text-white tracking-tight print:text-black uppercase text-sm">{item.name}</p>
                    </td>
                    <td className="px-6 py-5 text-center text-slate-400 font-bold print:text-slate-600 text-sm">{item.quantity}</td>
                    <td className="px-6 py-5 text-right text-slate-400 font-bold print:text-slate-600 text-sm tabular-nums">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-5 text-right font-black text-white print:text-black text-sm tabular-nums">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 px-2">
            <div className="flex-1 max-w-sm">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Terms & Conditions</h4>
              <ul className="text-[9px] text-slate-500 space-y-1 font-medium list-disc ml-4 print:text-slate-600">
                <li>Goods once sold are not returnable or exchangeable.</li>
                <li>Interest will be charged @24% if payment is not made within 30 days.</li>
                <li>Payment should be made through A/c Payee Cheque or Bank Transfer.</li>
              </ul>
            </div>
            <div className="w-full max-w-xs space-y-4">
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-white print:text-black text-sm">{formatCurrency(sale.items.reduce((acc: number, item: any) => acc + item.total, 0))}</span>
              </div>
              {(sale.discountPercentage > 0 || sale.discountValue > 0) && (
                <div className="flex justify-between text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  <span>Discount {sale.discountPercentage > 0 ? `(${sale.discountPercentage}%)` : ''}</span>
                  <span className="text-emerald-500 print:text-emerald-600 text-sm">-{formatCurrency(sale.discountValue || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <span>Total Amount</span>
                <span className="text-white print:text-black text-sm font-bold">{formatCurrency(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-slate-800/50 print:border-slate-200">
                <span>Settled Amount</span>
                <span className="text-white print:text-black text-sm">{formatCurrency(sale.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-6 border-t-2 border-slate-800 print:border-slate-900">
                <span className="text-xs font-black text-amber-500 uppercase tracking-[0.2em]">Net Balance Due</span>
                <span className="text-3xl font-black text-white tracking-tighter print:text-black tabular-nums">{formatCurrency(sale.totalAmount - sale.paidAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-24 grid grid-cols-2 gap-20 px-2">
            <div className="border-t border-slate-800 pt-4 print:border-slate-300">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Customer's Signature</p>
            </div>
            <div className="border-t border-slate-800 pt-4 print:border-slate-300 relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-20 print:opacity-30">
                <p className="font-black text-amber-500 uppercase tracking-widest text-[8px] border-2 border-amber-500 p-2 rounded-full transform -rotate-12">Authorized Dealer</p>
              </div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Authorized Signatory</p>
            </div>
          </div>

          <div className="mt-32 pt-10 border-t border-slate-800/50 text-center space-y-2 print:border-slate-200">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Thank you for your business with Reza Metal Industries.</p>
            <p className="text-slate-700 text-[10px] font-bold uppercase tracking-widest print:text-slate-400">Computer generated document. Valid without physical signature.</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          header { display: none !important; }
          aside { display: none !important; }
          #invoice-content { 
            border: none !important; 
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}} />
    </div>
  );
}
