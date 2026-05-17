import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Printer, ArrowLeft, Download, Link, Check } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function PurchaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings: businessSettings } = useSettings();
  const [purchase, setPurchase] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      const purchaseRef = doc(db, 'purchases', id);
      const purchaseSnap = await getDoc(purchaseRef);
      
      if (purchaseSnap.exists()) {
        const purchaseData = purchaseSnap.data();
        setPurchase({ id: purchaseSnap.id, ...purchaseData });
        
        const supplierRef = doc(db, 'suppliers', purchaseData.supplierId);
        const supplierSnap = await getDoc(supplierRef);
        if (supplierSnap.exists()) {
          setSupplier(supplierSnap.data());
        }
      }
    }
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!purchase) return;
    const element = document.getElementById('invoice-content');
    if (!element) return;

    setExporting(true);
    
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `Purchase_${purchase.purchaseNumber}.pdf`,
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
      element.classList.add('exporting-pdf');
      await html2pdf().set(opt).from(element).save();
      element.classList.remove('exporting-pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  if (!purchase) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="h-12 w-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Generating Purchase Bill...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center justify-between print:hidden">
        <button 
          onClick={() => navigate('/purchases')}
          className="flex items-center gap-2 text-slate-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={3} />
          Back to Procurement
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
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-black font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
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
              <div className="h-24 w-24 bg-white rounded-[1.5rem] flex items-center justify-center shadow-2xl ring-1 ring-slate-800 transition-transform print:ring-0">
                {businessSettings?.logoUrl ? (
                  <img src={businessSettings.logoUrl} alt="Logo" className="max-h-full object-contain p-2" />
                ) : (
                  <span className="text-black font-black text-4xl print:text-emerald-500">
                    {businessSettings?.businessName?.charAt(0) || 'R'}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tighter leading-none print:text-black uppercase">
                  {businessSettings?.businessName || 'REZA METAL'}
                </h1>
                <p className="text-emerald-500 font-black uppercase tracking-[0.4em] text-[10px] mt-1">Inbound Stock Record</p>
                <div className="text-slate-500 text-[10px] space-y-1 mt-6 font-bold uppercase tracking-widest print:text-slate-600">
                  <p>{businessSettings?.address || 'Corporate HQ: 12 Industrial Zone'}</p>
                  <p>T: {businessSettings?.phone || '+880 1234-567890'}</p>
                </div>
              </div>
            </div>
            <div className="text-left md:text-right">
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 print:text-slate-600">Purchase Bill</h2>
              <div className="space-y-4">
                <div className="inline-block bg-[#0B0D11] border border-slate-800 px-4 py-3 rounded-2xl print:bg-slate-50 print:border-slate-200">
                  <p className="text-emerald-500 font-mono text-xl font-black tracking-[0.2em]">{purchase.purchaseNumber}</p>
                </div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest print:text-slate-400">Inventory Verification Req.</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 px-1">
            <div className="bg-[#0B0D11]/30 p-8 rounded-3xl border border-slate-800/50 print:bg-slate-50 print:border-slate-200">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Supplier Information</p>
              <div className="text-white print:text-black">
                <p className="font-black text-3xl tracking-tight mb-2 uppercase">{purchase.supplierName}</p>
                <div className="text-sm text-slate-400 space-y-1.5 mt-4 font-medium print:text-slate-600">
                  <p className="flex items-start gap-2 max-w-xs">{supplier?.address || 'No Address Provided'}</p>
                  <p className="pt-2">Contact: {supplier?.phone || 'No Phone'}</p>
                  <p>{supplier?.email || 'No Email'}</p>
                </div>
              </div>
            </div>
            <div className="text-left md:text-right py-4">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-6 print:text-slate-400">Logistics Summary</p>
              <div className="space-y-4">
                <div className="flex justify-start md:justify-end gap-10">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Received Date</span>
                  <span className="text-white font-black tracking-widest print:text-black text-sm">{purchase.date ? formatDate(purchase.date.toDate()) : 'N/A'}</span>
                </div>
                <div className="flex justify-start md:justify-end gap-10 items-center">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Billing Status</span>
                  <span className={cn(
                    "font-black uppercase text-[10px] px-4 py-1.5 rounded-full border tracking-widest",
                    purchase.status === 'paid' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 print:text-emerald-700" :
                    purchase.status === 'partial' ? "text-amber-500 border-amber-500/20 bg-amber-500/5 print:text-amber-700" :
                    "text-rose-500 border-rose-500/20 bg-rose-500/5 print:text-rose-700"
                  )}>{purchase.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-16 overflow-hidden rounded-2xl border border-slate-800/50 print:border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0B0D11] text-left print:bg-slate-50">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Specification</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Received Qty</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Unit Cost</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Net Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                {(purchase.items || []).map((item: any, index: number) => (
                  <tr key={index} className="bg-[#161B22]/50 print:bg-white transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-black text-white tracking-tight print:text-black uppercase text-sm">{item.name}</p>
                    </td>
                    <td className="px-6 py-5 text-center text-slate-400 font-bold print:text-slate-600 text-sm">{item.quantity}</td>
                    <td className="px-6 py-5 text-right text-slate-400 font-bold print:text-slate-600 text-sm tabular-nums">{formatCurrency(item.cost)}</td>
                    <td className="px-6 py-5 text-right font-black text-white print:text-black text-sm tabular-nums">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 px-2">
            <div className="flex-1 max-w-sm border-l-4 border-emerald-500/20 pl-6 print:border-emerald-200">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Verification Note</h4>
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic print:text-slate-500">
                This document serves as an internal stock intake verification record. All items listed above have been physically inspected and reconciled with the digital inventory ledger.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-4">
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <span>Gross Purchase Value</span>
                <span className="text-white print:text-black text-sm">{formatCurrency(purchase.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-slate-800/50 print:border-slate-200">
                <span>Advance/Paid Amount</span>
                <span className="text-white print:text-black text-sm">{formatCurrency(purchase.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-6 border-t-2 border-emerald-500 print:border-emerald-900">
                <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Net Liability</span>
                <span className="text-3xl font-black text-white tracking-tighter print:text-black tabular-nums">{formatCurrency(purchase.totalAmount - purchase.paidAmount)}</span>
              </div>
            </div>
          </div>

          <div className="mt-32 pt-10 border-t border-slate-800/50 text-center space-y-2 print:border-slate-200">
            <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest print:text-slate-400">
              Reza Metal Industries • Procurement Intelligence Division
            </p>
            <p className="text-slate-800 text-[8px] font-bold uppercase tracking-widest print:text-slate-400">System Verified Record • ISO 9001 Compliance Check Passed</p>
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
          .text-emerald-500 { color: #059669 !important; }
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
