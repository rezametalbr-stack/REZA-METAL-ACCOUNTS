import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Printer, ArrowLeft, Download, Link, Check } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings: businessSettings } = useSettings();
  const [sale, setSale] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [salesperson, setSalesperson] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    // Attempt to copy the current URL
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleExportPDF = async () => {
    if (!sale) return;
    const element = document.getElementById('invoice-content');
    if (!element) return;

    setExporting(true);
    
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `Invoice_${sale.invoiceNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        onclone: (doc: Document) => {
          // Remove oklch color functions from all style tags as they crash html2canvas
          const styleTags = doc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            styleTags[i].innerHTML = styleTags[i].innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
          }

          const style = doc.createElement('style');
          style.innerHTML = `
            * {
              color-scheme: light !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .text-amber-500 { color: #f59e0b !important; }
            .text-emerald-500 { color: #10b981 !important; }
            .text-rose-500 { color: #ef4444 !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-600 { color: #475569 !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-white { color: #000000 !important; }
            
            .bg-amber-500 { background-color: #f59e0b !important; }
            .bg-emerald-500 { background-color: #10b981 !important; }
            .bg-[#161B22] { background-color: #ffffff !important; }
            .bg-[#0B0D11] { background-color: #f8fafc !important; }
            .bg-[#161B22]\/50 { background-color: #ffffff !important; }
            .bg-[#0B0D11]\/30 { background-color: #f8fafc !important; }
            
            .border-slate-800 { border-color: #e2e8f0 !important; }
            .border-slate-800\/50 { border-color: #f1f5f9 !important; }
            .border-amber-500 { border-color: #f59e0b !important; }
            .border-emerald-500 { border-color: #10b981 !important; }
          `;
          doc.head.appendChild(style);
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      // Add a temporary class for PDF styling if needed
      element.classList.add('exporting-pdf');
      await html2pdf().set(opt).from(element).save();
      element.classList.remove('exporting-pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExporting(false);
    }
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
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Link size={16} />}
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <div className="h-4 w-4 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin"></div>
            ) : (
              <Download size={16} />
            )}
            {exporting ? 'Processing...' : 'Export PDF'}
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

      <div id="invoice-content" className="bg-[#161B22] border border-slate-800 shadow-2xl rounded-3xl overflow-hidden print:bg-white print:text-black print:border-0 print:shadow-none print:m-0 relative">
        {/* Copy Indicator for Print */}
        <div className="hidden print:block absolute top-4 right-10 text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">
          Original Customer Copy
        </div>

        <div className="p-10 lg:p-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 relative">
            <div className="flex gap-6 items-start">
              {(businessSettings?.showLogo !== false) && (
                <div className="h-24 w-24 bg-white rounded-[1.5rem] flex items-center justify-center shadow-2xl ring-1 ring-slate-800 transition-transform print:ring-0">
                  {businessSettings?.logoUrl ? (
                    <img src={businessSettings.logoUrl} alt="Logo" className="max-h-full object-contain p-2" />
                  ) : (
                    <span className="text-black font-black text-4xl print:text-amber-500">
                      {businessSettings?.businessName?.charAt(0) || 'R'}
                    </span>
                  )}
                </div>
              )}
              <div>
                <h1 className="text-4xl font-black text-white tracking-tighter leading-none print:text-black uppercase">
                  {businessSettings?.businessName || 'REZA METAL'}
                </h1>
                <p className="text-amber-500 font-black uppercase tracking-[0.4em] text-[10px] mt-1">Industries & Solutions</p>
                <div className="text-slate-500 text-[10px] space-y-1 mt-6 font-bold uppercase tracking-widest print:text-slate-600">
                  {businessSettings?.showAddress !== false && <p>{businessSettings?.address || 'Corporate HQ: 12 Industrial Zone'}</p>}
                  {businessSettings?.showPhone !== false && <p>T: {businessSettings?.phone || '+880 1234-567890'}</p>}
                  {(businessSettings?.showEmail !== false && businessSettings?.email) && <p>E: {businessSettings.email}</p>}
                  {(businessSettings?.showWebsite !== false && businessSettings?.website) && <p>W: {businessSettings.website}</p>}
                </div>
              </div>
            </div>
            <div className="text-left md:text-right">
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 print:text-slate-600">Invoice</h2>
              <div className="space-y-4">
                <div className="flex flex-col items-start md:items-end gap-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Invoice Number</span>
                  <p className="text-amber-500 font-mono text-2xl font-black tracking-tight">{sale.invoiceNumber}</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Billing Date</span>
                  <p className="text-white font-black tracking-widest print:text-black text-sm">{sale.date ? formatDate(sale.date.toDate()) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col md:flex-row justify-end mb-16 px-1">
            <div className="w-full md:w-1/2 bg-[#0B0D11]/30 p-8 rounded-3xl border border-slate-800/50 print:bg-slate-50 print:border-slate-200">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4">Invoice To</p>
              <div className="text-white print:text-black">
                <p className="font-black text-2xl tracking-tight mb-2 uppercase">{sale.customerName}</p>
                <div className="text-sm text-slate-400 space-y-1.5 mt-4 font-medium print:text-slate-600">
                  <p className="flex items-start gap-2 max-w-xs">{customer?.address || 'No Address Provided'}</p>
                  <p className="pt-2">Contact: {customer?.phone || 'No Phone'}</p>
                  <p>{customer?.email || 'No Email'}</p>
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
                {(sale.items || []).map((item: any, index: number) => (
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
                <span className="text-white print:text-black text-sm font-bold">{formatCurrency((sale.items || []).reduce((acc: number, item: any) => acc + (item.total || 0), 0))}</span>
              </div>
              
              {sale.discountValue > 0 && (
                <div className="flex justify-between text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  <span>Discount 1 {sale.discountPercentage > 0 ? `(${sale.discountPercentage}%)` : ''}</span>
                  <span className="text-emerald-500 print:text-emerald-600 text-sm">-{formatCurrency(sale.discountValue)}</span>
                </div>
              )}

              {sale.discount2Value > 0 && (
                <div className="flex justify-between text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  <span>Discount 2 {sale.discount2Percentage > 0 ? `(${sale.discount2Percentage}%)` : ''}</span>
                  <span className="text-emerald-500 print:text-emerald-600 text-sm">-{formatCurrency(sale.discount2Value)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-slate-800/50 print:border-slate-200">
                <span>Total Bill</span>
                <span className="text-white print:text-black text-sm font-black">{formatCurrency(sale.totalAmount)}</span>
              </div>

              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <span>Paid Amount</span>
                <span className="text-white print:text-black text-sm">{formatCurrency(sale.paidAmount)}</span>
              </div>

              <div className="flex justify-between text-rose-500 text-[10px] font-black uppercase tracking-widest">
                <span>Current Due</span>
                <span className="text-rose-500 print:text-rose-600 text-sm font-bold">{formatCurrency(sale.totalAmount - sale.paidAmount)}</span>
              </div>

              {sale.previousBalance !== undefined && (
                <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-slate-800/50 print:border-slate-200">
                  <span>Previous Due</span>
                  <span className="text-white print:text-black text-sm">{formatCurrency(sale.previousBalance)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-6 border-t-2 border-slate-800 print:border-slate-900">
                <span className="text-xs font-black text-amber-500 uppercase tracking-[0.2em]">Final Total Due</span>
                <span className="text-3xl font-black text-white tracking-tighter print:text-black tabular-nums">
                  {formatCurrency((sale.totalAmount - sale.paidAmount) + (sale.previousBalance || 0))}
                </span>
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
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              Thank you for your business with {businessSettings?.businessName || 'Reza Metal Industries'}.
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: auto; margin: 0; }
          body { 
            background: white !important; 
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          :root {
            --bg-page: #ffffff !important;
            --bg-card: #ffffff !important;
            --text-primary: #000000 !important;
            --text-secondary: #475569 !important;
            --border-color: #e2e8f0 !important;
          }
          .print\\:hidden { display: none !important; }
          main { 
            padding: 0 !important; 
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          header, aside, .flex-none { display: none !important; }
          #invoice-content { 
            border: none !important; 
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          /* Force text colors for visibility */
          .text-white { color: black !important; }
          .text-slate-400, .text-slate-500 { color: #475569 !important; }
          .text-amber-500 { color: #d97706 !important; }
          .bg-[#0B0D11], .bg-[#161B22], .bg-[#0B0D11]/30 { background: #f8fafc !important; }
          .border-slate-800 { border-color: #e2e8f0 !important; }
        }
        
        /* PDF Export Styles */
        .exporting-pdf {
          background-color: white !important;
          color: #000000 !important;
        }
        .exporting-pdf * {
          color: #000000 !important;
          border-color: #e2e8f0 !important; /* slate-200 */
          background-color: transparent !important;
        }
        
        /* Specific overrides for common Tailwind v4 oklch colors */
        .exporting-pdf .text-amber-500 { color: #f59e0b !important; }
        .exporting-pdf .text-emerald-500 { color: #10b981 !important; }
        .exporting-pdf .text-slate-400 { color: #94a3b8 !important; }
        .exporting-pdf .text-slate-500 { color: #64748b !important; }
        .exporting-pdf .text-slate-600 { color: #475569 !important; }
        .exporting-pdf .text-slate-700 { color: #334155 !important; }
        
        .exporting-pdf .bg-[#0B0D11],
        .exporting-pdf .bg-[#0B0D11]\/30 { 
          background-color: #f8fafc !important; 
        }
        
        .exporting-pdf th {
          background-color: #f1f5f9 !important; /* slate-100 */
          color: #475569 !important; /* slate-600 */
        }
        
        .exporting-pdf .tabular-nums {
          font-variant-numeric: tabular-nums;
        }

        /* Ensure borders are visible */
        .exporting-pdf .border,
        .exporting-pdf .border-t,
        .exporting-pdf .border-b,
        .exporting-pdf .border-l,
        .exporting-pdf .border-r {
          border-style: solid !important;
          border-color: #e2e8f0 !important;
        }

        .exporting-pdf .border-amber-500 { border-color: #f59e0b !important; }
        .exporting-pdf .border-emerald-500 { border-color: #10b981 !important; }
      `}} />
    </div>
  );
}
