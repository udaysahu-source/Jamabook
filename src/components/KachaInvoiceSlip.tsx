// src/components/KachaInvoiceSlip.tsx
'use client';

import React, { useRef, useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import {
  formatCurrency,
  formatIndianNumber,
  formatDate,
  amountToIndianWords,
} from '@/lib/formatters';
import {
  ArrowLeft,
  Printer,
  Download,
  MessageCircle,
  FileText,
  BookOpen,
  Receipt,
  Check,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type TemplateMode = 'tally-invoice' | 'tally-ledger' | 'kacha-slip';

function formatTallyDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

export function KachaInvoiceSlip() {
  const { selectedInvoice, setActiveView, business, parties, invoices } = useJamabook();
  const printRef = useRef<HTMLDivElement>(null);
  const [templateMode, setTemplateMode] = useState<TemplateMode>('tally-invoice');
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const invoice = selectedInvoice;

  if (!invoice) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-sm font-semibold text-[#56645E]">No bill selected.</p>
        <button
          onClick={() => setActiveView('home')}
          className="px-5 py-2.5 bg-[#184E3A] text-white rounded-2xl font-bold text-sm"
        >
          Return Home
        </button>
      </div>
    );
  }

  const buyerParty = parties.find((p) => p.id === invoice.buyer_id || p.name === invoice.buyer_name);
  const buyerPhone = invoice.buyer_phone || buyerParty?.phone || '+91 98290 11223';

  const totalPieces = (invoice.lines || []).reduce((sum, l) => sum + l.pieces, 0);
  const totalKg = (invoice.lines || []).reduce((sum, l) => sum + l.total_kg, 0);
  const amountWords = amountToIndianWords(invoice.total);

  // Compute party ledger entries for Tally Ledger view
  const partyInvoices = invoices.filter(
    (inv) =>
      (inv.buyer_id && inv.buyer_id === invoice.buyer_id) ||
      inv.buyer_name.toLowerCase() === invoice.buyer_name.toLowerCase()
  );

  // Simulated ledger entries (prior transactions + receipts + current invoice)
  const priorBills = partyInvoices.filter((inv) => inv.id !== invoice.id);
  const ledgerEntries = [
    ...(priorBills.length > 0
      ? priorBills.map((inv) => ({
          date: formatTallyDate(inv.bill_date),
          particulars: `To Sales (Bill #${inv.bill_no} - ${inv.lines?.[0]?.item_name || 'Goods'})`,
          vchType: 'Sales',
          vchNo: String(inv.bill_no),
          debit: inv.total,
          credit: 0,
        }))
      : [
          {
            date: '10-Nov-2026',
            particulars: 'To Sales (Bill #4440 - Jeera 50 Bags)',
            vchType: 'Sales',
            vchNo: '4440',
            debit: 160000,
            credit: 0,
          },
          {
            date: '12-Nov-2026',
            particulars: 'By Bank / NEFT (SBI Ref: 90214)',
            vchType: 'Receipt',
            vchNo: 'REC-14',
            debit: 0,
            credit: 160000,
          },
        ]),
    {
      date: formatTallyDate(invoice.bill_date),
      particulars: `To Sales (Bill #${invoice.bill_no} - ${invoice.lines?.[0]?.item_name || 'Agricultural Commodities'})`,
      vchType: 'Sales',
      vchNo: String(invoice.bill_no),
      debit: invoice.total,
      credit: 0,
    },
  ];

  const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
  const netBalance = totalDebit - totalCredit;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsPdfExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 8;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, Math.min(contentHeight, pdfHeight - margin * 2));
      const filename =
        templateMode === 'tally-ledger'
          ? `Tally-Ledger-${invoice.buyer_name.replace(/\s+/g, '_')}.pdf`
          : `Tally-Invoice-${invoice.bill_no}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF generation failed. You can also click Print and select Save as PDF.');
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Tally-${templateMode === 'tally-ledger' ? 'Ledger' : 'Bill'}-${invoice.bill_no}.png`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsApp = () => {
    const cleanPhone = buyerPhone.replace(/[^\d]/g, '');
    const dateFormatted = formatTallyDate(invoice.bill_date);

    let msg = '';
    if (templateMode === 'tally-ledger') {
      msg = `*${business.name || 'RADHA KRISHNA TRADERS (RTC) - UNJHA'}*\n*STATEMENT OF ACCOUNTS (LEDGER)*\nParty: ${invoice.buyer_name}\nPeriod: Up to ${dateFormatted}\n\nTotal Sales (Dr): ₹${formatIndianNumber(totalDebit)}\nTotal Payments (Cr): ₹${formatIndianNumber(totalCredit)}\n*Closing Balance Due: ₹${formatIndianNumber(netBalance)} Dr*\n(${amountToIndianWords(netBalance)})\n\nPlease verify and release pending payment. Thank you!`;
    } else {
      msg = `*${business.name || 'RTC'} - TAX INVOICE #${invoice.bill_no}*\nDate: ${dateFormatted}\nParty: ${invoice.buyer_name} (${invoice.buyer_town || 'Jaipur'})\nTransport: ${invoice.transporter_name || 'Direct'}\nVehicle: ${invoice.vehicle_no || '—'}\nItems: ${invoice.lines?.[0]?.item_name || 'Commodities'} (${totalPieces} bags = ${formatIndianNumber(totalKg)} kg)\n*Total Amount: ₹${formatIndianNumber(invoice.total)}*\nAmount in words: ${amountWords}\n\nBank: ${business.bank_name || 'SBI'} | A/c: ${business.bank_account || '30894562109'} | IFSC: ${business.bank_ifsc || 'SBIN0001234'}\nThank you for your business!`;
    }

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="pb-28 pt-1 space-y-4 animate-fade-in">
      {/* Top Action Bar (Hidden during print) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 no-print">
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#184E3A] bg-white border border-[#E5DFD1] px-3.5 py-2 rounded-2xl hover:bg-[#F2ECE1] transition-colors shadow-2xs self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Template Switcher Tabs */}
        <div className="flex bg-[#EFE9DC] p-1 rounded-2xl text-xs font-bold self-center">
          <button
            type="button"
            onClick={() => setTemplateMode('tally-invoice')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              templateMode === 'tally-invoice'
                ? 'bg-[#184E3A] text-white shadow-xs'
                : 'text-[#56645E] hover:text-[#19221E]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tally Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => setTemplateMode('tally-ledger')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              templateMode === 'tally-ledger'
                ? 'bg-[#184E3A] text-white shadow-xs'
                : 'text-[#56645E] hover:text-[#19221E]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tally Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setTemplateMode('kacha-slip')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              templateMode === 'kacha-slip'
                ? 'bg-[#184E3A] text-white shadow-xs'
                : 'text-[#56645E] hover:text-[#19221E]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Kacha Slip</span>
          </button>
        </div>

        {/* Action Buttons: PDF, Image, WhatsApp, Print */}
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={handleDownloadPDF}
            disabled={isPdfExporting}
            className="flex items-center gap-1 text-xs font-bold text-white bg-red-700 hover:bg-red-800 px-3.5 py-2 rounded-2xl transition-all shadow-2xs active:scale-[0.98]"
            title="Download Tally Prime PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isPdfExporting ? 'Generating...' : 'PDF'}</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex items-center gap-1 text-xs font-bold text-[#19221E] bg-white border border-[#D9D2C3] px-3 py-2 rounded-2xl hover:bg-[#F2ECE1] transition-colors shadow-2xs"
            title="Download PNG Image"
          >
            <Download className="w-3.5 h-3.5 text-[#56645E]" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1 text-xs font-bold text-white bg-[#184E3A] hover:bg-[#123E2E] px-3.5 py-2 rounded-2xl transition-colors shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 text-xs font-bold text-white bg-[#19221E] hover:bg-black px-3.5 py-2 rounded-2xl transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TEMPLATE 1: TALLY PRIME TAX INVOICE FORMAT                     */}
      {/* ============================================================== */}
      {templateMode === 'tally-invoice' && (
        <div
          ref={printRef}
          className="bg-white p-4 sm:p-7 border-2 border-black text-black font-sans shadow-md max-w-3xl mx-auto space-y-0 print-page text-[11px] leading-tight"
        >
          {/* Header Title Box */}
          <div className="border border-black text-center py-1.5 font-bold tracking-widest text-xs uppercase bg-white">
            Tax Invoice
          </div>

          {/* 2-Column Metadata Container */}
          <div className="border-x border-b border-black grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-black">
            {/* Left Box: Seller & Buyer Details */}
            <div className="divide-y divide-black">
              {/* Company Info */}
              <div className="p-2.5 space-y-0.5">
                <p className="font-bold text-sm tracking-wide uppercase">
                  {business.name || 'RADHA KRISHNA TRADERS (RTC)'}
                </p>
                <p className="text-[10px] text-gray-800 leading-tight">
                  {business.address ||
                    'Shop No. 14, APMC Market Yard No. 2, Grain & Spice Terminal, Unjha, Gujarat - 384170'}
                </p>
                <p className="text-[10px] font-semibold pt-0.5">
                  GSTIN/UIN:{' '}
                  <span className="font-mono font-bold">
                    {business.gstin || '24AABCR4450F1Z2'}
                  </span>
                </p>
                <p className="text-[10px]">
                  State Name:{' '}
                  <span className="font-semibold">{business.state || 'Gujarat'}</span>, Code:{' '}
                  <span className="font-semibold">{business.state_code || '24'}</span>
                </p>
                <p className="text-[10px]">
                  Contact:{' '}
                  <span className="font-semibold">{business.phone || '+91 98250 12345'}</span>{' '}
                  | Email:{' '}
                  <span className="font-semibold">{business.email || 'info@rtc-mandi.com'}</span>
                </p>
              </div>

              {/* Buyer (Bill to) */}
              <div className="p-2.5 space-y-0.5 bg-[#FAF9F5]">
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider block">
                  Buyer (Bill to)
                </span>
                <p className="font-bold text-xs uppercase text-[#19221E]">{invoice.buyer_name}</p>
                <p className="text-[10px] text-gray-800 leading-tight">
                  {buyerParty?.address ||
                    (invoice.buyer_town ? `${invoice.buyer_town} Mandi Area` : 'Local Mandi Delivery')}
                </p>
                <p className="text-[10px] pt-0.5">
                  State Name:{' '}
                  <span className="font-semibold">
                    {buyerParty?.state ||
                      (invoice.buyer_town?.toLowerCase().includes('jaipur') ||
                      invoice.buyer_town?.toLowerCase().includes('jodhpur')
                        ? 'Rajasthan'
                        : invoice.buyer_town?.toLowerCase().includes('indore')
                        ? 'Madhya Pradesh'
                        : 'Gujarat')}
                  </span>
                  , Code:{' '}
                  <span className="font-semibold">
                    {buyerParty?.state_code ||
                      (invoice.buyer_town?.toLowerCase().includes('jaipur') ||
                      invoice.buyer_town?.toLowerCase().includes('jodhpur')
                        ? '08'
                        : invoice.buyer_town?.toLowerCase().includes('indore')
                        ? '23'
                        : '24')}
                  </span>
                </p>
                <p className="text-[10px] font-semibold">
                  GSTIN/UIN:{' '}
                  <span className="font-mono font-bold">
                    {buyerParty?.gstin || '08AABCS1234E1Z1'}
                  </span>
                </p>
                <p className="text-[10px]">
                  Contact: <span className="font-semibold">{buyerPhone}</span>
                </p>
              </div>
            </div>

            {/* Right Box: Tally Standard Despatch & Voucher Details */}
            <div className="text-[10px] divide-y divide-black">
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Invoice No.</span>
                  <span className="font-mono font-bold text-xs">
                    {business.bill_prefix
                      ? `${business.bill_prefix}${invoice.bill_no}`
                      : invoice.bill_no}
                  </span>
                </div>
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Dated</span>
                  <span className="font-bold text-[11px]">
                    {formatTallyDate(invoice.bill_date)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Delivery Note</span>
                  <span className="font-semibold text-[10px]">—</span>
                </div>
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Mode/Terms of Payment</span>
                  <span className="font-semibold text-[10px]">Due on Delivery</span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Supplier&apos;s Ref.</span>
                  <span className="font-semibold text-[10px]">RTC-{invoice.bill_no}</span>
                </div>
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Other Reference(s)</span>
                  <span className="font-semibold text-[10px]">T.P. #{invoice.bill_no}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Buyer&apos;s Order No.</span>
                  <span className="font-semibold text-[10px]">PO-881</span>
                </div>
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Dated</span>
                  <span className="font-semibold text-[10px]">
                    {formatTallyDate(invoice.bill_date)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Despatch Document No.</span>
                  <span className="font-semibold text-[10px]">LR-{invoice.bill_no + 12}</span>
                </div>
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Delivery Note Date</span>
                  <span className="font-semibold text-[10px]">
                    {formatTallyDate(invoice.bill_date)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Despatched through</span>
                  <span className="font-bold text-[10px]">
                    {invoice.transporter_name || 'Direct / Self'}
                  </span>
                </div>
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Destination</span>
                  <span className="font-semibold text-[10px]">
                    {invoice.buyer_town || 'Jaipur'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">
                    Bill of Lading/LR-RR No.
                  </span>
                  <span className="font-semibold text-[10px]">
                    SKR-{invoice.bill_no + 4570}
                  </span>
                </div>
                <div className="p-1.5">
                  <span className="text-[9px] text-gray-600 block">Motor Vehicle No.</span>
                  <span className="font-mono font-bold text-[10px]">
                    {invoice.vehicle_no || 'RJ-14-GA-5621'}
                  </span>
                </div>
              </div>

              <div className="p-1.5">
                <span className="text-[9px] text-gray-600 block">Terms of Delivery</span>
                <span className="text-[10px] text-gray-800">
                  Ex-Mandi Yard Godown / Destination Delivery
                </span>
              </div>
            </div>
          </div>

          {/* Iconic Tally Prime Items Grid */}
          <div className="border-x border-b border-black">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-black text-center font-bold bg-white">
                  <th className="py-1 px-1 border-r border-black w-7">SI No.</th>
                  <th className="py-1 px-2 border-r border-black text-left">
                    Description of Goods
                  </th>
                  <th className="py-1 px-1 border-r border-black w-14">HSN/SAC</th>
                  <th className="py-1 px-2 border-r border-black text-right w-24">Quantity</th>
                  <th className="py-1 px-2 border-r border-black text-right w-20">Rate (₹)</th>
                  <th className="py-1 px-1 border-r border-black text-center w-10">per</th>
                  <th className="py-1 px-2 text-right w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {invoice.lines?.map((line, idx) => (
                  <tr key={idx}>
                    <td className="py-1 px-1 border-r border-black text-center">{idx + 1}</td>
                    <td className="py-1 px-2 border-r border-black">
                      <span className="font-bold text-[11px] block">{line.item_name}</span>
                      <span className="text-[9px] text-gray-600 block">
                        {line.pieces} Bags @ {line.kg_per_piece.toFixed(2)} kg ={' '}
                        {formatIndianNumber(line.total_kg)} kg (
                        {(line.total_kg / 100).toFixed(2)} Qtl)
                      </span>
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center font-mono">0909</td>
                    <td className="py-1 px-2 border-r border-black text-right font-semibold">
                      {line.pieces} Bags
                      <span className="block text-[9px] text-gray-600">
                        ({(line.total_kg / 100).toFixed(2)} Qtl)
                      </span>
                    </td>
                    <td className="py-1 px-2 border-r border-black text-right font-mono font-medium">
                      {line.rate.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center text-[9px]">
                      Qtl
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold">
                      {line.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* Extra Mandi Charges formatted as Tally Ledger Lines */}
                {invoice.charges?.map((ch, cidx) => (
                  <tr key={`ch-${cidx}`}>
                    <td className="py-1 px-1 border-r border-black text-center"></td>
                    <td className="py-1 px-2 border-r border-black font-semibold text-gray-800">
                      {ch.label}
                    </td>
                    <td className="py-1 px-1 border-r border-black"></td>
                    <td className="py-1 px-2 border-r border-black"></td>
                    <td className="py-1 px-2 border-r border-black"></td>
                    <td className="py-1 px-1 border-r border-black"></td>
                    <td className="py-1 px-2 text-right font-mono font-semibold">
                      {ch.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* Vertical Blank Spacer for Authentic Tally Height */}
                <tr className="h-12">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>

                {/* Table Total Row with Double Underline */}
                <tr className="border-t border-b-2 border-black font-bold bg-[#FAF9F5]">
                  <td className="py-1 px-1 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right uppercase">
                    Total
                  </td>
                  <td className="py-1 px-1 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono">
                    {totalPieces} Bags
                  </td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-1 border-r border-black"></td>
                  <td className="py-1 px-2 text-right font-mono text-[11px] font-black">
                    ₹ {invoice.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount Chargeable in Words */}
          <div className="border-x border-b border-black p-2 flex justify-between items-start text-[10px]">
            <div>
              <span className="text-[9px] text-gray-600 block uppercase">
                Amount Chargeable (in words)
              </span>
              <span className="font-bold text-xs">INR {amountWords}</span>
            </div>
            <span className="font-semibold text-gray-500 text-[9px] italic">E. & O.E.</span>
          </div>

          {/* Bottom Bank Details, Declaration & Signatory */}
          <div className="border-x border-b border-black grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-black text-[10px]">
            {/* Left: Bank Details & Declaration */}
            <div className="p-2 space-y-2">
              <div>
                <span className="font-bold text-[9px] uppercase tracking-wider block text-gray-700">
                  Company&apos;s Bank Details
                </span>
                <p>
                  Bank Name :{' '}
                  <span className="font-bold">
                    {business.bank_name || 'State Bank of India'}
                  </span>
                </p>
                <p>
                  A/c No. :{' '}
                  <span className="font-mono font-bold">
                    {business.bank_account || '30894562109'}
                  </span>
                </p>
                <p>
                  Branch & IFS Code :{' '}
                  <span className="font-semibold">
                    {business.bank_branch || 'APMC Yard Branch, Unjha'} &amp;{' '}
                    {business.bank_ifsc || 'SBIN0001234'}
                  </span>
                </p>
              </div>

              <div className="pt-1.5 border-t border-gray-300">
                <span className="font-bold text-[9px] uppercase tracking-wider block text-gray-700">
                  Declaration
                </span>
                <p className="text-[9px] text-gray-700 leading-tight">
                  We declare that this invoice shows the actual price of the goods described
                  and that all particulars are true and correct.
                </p>
              </div>
            </div>

            {/* Right: Authorised Signatory */}
            <div className="p-2 flex flex-col justify-between text-right">
              <span className="font-bold text-[10px] uppercase block">
                for {business.name || 'RADHA KRISHNA TRADERS (RTC)'}
              </span>

              <div className="pt-10 text-center">
                <span className="font-bold text-[10px] border-t border-black px-8 pt-1 inline-block uppercase">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Jurisdiction & Notice */}
          <div className="text-center py-1 text-[9px] font-semibold text-gray-600">
            SUBJECT TO UNJHA JURISDICTION · This is a Computer Generated Invoice
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TEMPLATE 2: TALLY PRIME PARTY LEDGER STATEMENT (खाता नकल)      */}
      {/* ============================================================== */}
      {templateMode === 'tally-ledger' && (
        <div
          ref={printRef}
          className="bg-white p-4 sm:p-7 border-2 border-black text-black font-sans shadow-md max-w-3xl mx-auto space-y-0 print-page text-[11px] leading-tight"
        >
          {/* Header Title Box */}
          <div className="border border-black text-center p-2.5 space-y-0.5">
            <h2 className="text-base font-bold uppercase tracking-wide">
              {business.name || 'RADHA KRISHNA TRADERS (RTC)'}
            </h2>
            <p className="text-[10px] text-gray-800">
              {business.address ||
                'Shop No. 14, APMC Market Yard No. 2, Grain & Spice Terminal, Unjha, Gujarat - 384170'}
            </p>
            <p className="text-[10px] font-semibold">
              GSTIN: <span className="font-mono">{business.gstin || '24AABCR4450F1Z2'}</span> ·
              Phone: {business.phone || '+91 98250 12345'}
            </p>
          </div>

          {/* Subheader: Party & Period */}
          <div className="border-x border-b border-black p-2.5 bg-[#FAF9F5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-[10px]">
            <div>
              <span className="font-bold text-xs uppercase block text-[#184E3A]">
                Ledger Account Statement (खाता नकल)
              </span>
              <span className="font-extrabold text-sm block">{invoice.buyer_name}</span>
              <span className="text-[10px] text-gray-700">
                {buyerParty?.address || invoice.buyer_town || 'Jaipur'}
              </span>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[9px] text-gray-600 block">Statement Period</span>
              <span className="font-bold">01-Nov-2026 to {formatTallyDate(invoice.bill_date)}</span>
              <span className="text-[9px] text-gray-600 block pt-0.5">
                GSTIN: {buyerParty?.gstin || '08AABCS1234E1Z1'}
              </span>
            </div>
          </div>

          {/* 6-Column Tally Ledger Table */}
          <div className="border-x border-b border-black">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-black text-center font-bold bg-white">
                  <th className="py-1 px-2 border-r border-black w-24 text-left">Date</th>
                  <th className="py-1 px-2 border-r border-black text-left">Particulars</th>
                  <th className="py-1 px-2 border-r border-black w-18">Vch Type</th>
                  <th className="py-1 px-2 border-r border-black w-16">Vch No.</th>
                  <th className="py-1 px-2 border-r border-black text-right w-24">Debit (₹)</th>
                  <th className="py-1 px-2 text-right w-24">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Opening Balance */}
                <tr>
                  <td className="py-1 px-2 border-r border-black">01-Nov-2026</td>
                  <td className="py-1 px-2 border-r border-black font-semibold italic text-gray-700">
                    Opening Balance
                  </td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono">0.00</td>
                  <td className="py-1 px-2 text-right font-mono"></td>
                </tr>

                {/* Ledger Transactions */}
                {ledgerEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-1 px-2 border-r border-black font-mono">{entry.date}</td>
                    <td className="py-1 px-2 border-r border-black font-semibold">
                      {entry.particulars}
                    </td>
                    <td className="py-1 px-2 border-r border-black text-center">
                      {entry.vchType}
                    </td>
                    <td className="py-1 px-2 border-r border-black text-center font-mono">
                      {entry.vchNo}
                    </td>
                    <td className="py-1 px-2 border-r border-black text-right font-mono font-medium">
                      {entry.debit ? entry.debit.toFixed(2) : ''}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-medium">
                      {entry.credit ? entry.credit.toFixed(2) : ''}
                    </td>
                  </tr>
                ))}

                {/* Sub Total */}
                <tr className="border-t border-black font-bold bg-[#FAF9F5]">
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black uppercase text-right">
                    Sub Total
                  </td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono">
                    {totalDebit.toFixed(2)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">{totalCredit.toFixed(2)}</td>
                </tr>

                {/* Closing Balance Row */}
                <tr className="font-bold">
                  <td className="py-1 px-2 border-r border-black font-mono">
                    {formatTallyDate(invoice.bill_date)}
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right italic uppercase">
                    By Closing Balance
                  </td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono"></td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-[#184E3A]">
                    {netBalance.toFixed(2)} Dr
                  </td>
                </tr>

                {/* Grand Total Row with Tally Double Underline */}
                <tr className="border-t border-b-2 border-black font-black bg-white">
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black uppercase text-right">
                    Total
                  </td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono">
                    ₹ {Math.max(totalDebit, totalCredit + netBalance).toFixed(2)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    ₹ {Math.max(totalDebit, totalCredit + netBalance).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Closing Balance in Words & Signatory */}
          <div className="border-x border-b border-black p-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px]">
            <div>
              <span className="text-[9px] text-gray-600 block uppercase">
                Closing Balance (in words)
              </span>
              <span className="font-bold text-xs text-[#184E3A]">
                INR {amountToIndianWords(netBalance)} (Debit Balance Due)
              </span>
            </div>
            <div className="text-right self-end sm:self-auto">
              <span className="font-bold text-[10px] uppercase block">
                for {business.name || 'RADHA KRISHNA TRADERS (RTC)'}
              </span>
              <div className="pt-8">
                <span className="font-bold text-[9px] border-t border-black px-6 pt-1 inline-block uppercase">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center py-1 text-[9px] font-semibold text-gray-600">
            SUBJECT TO UNJHA JURISDICTION · Official Tally Prime Statement of Accounts
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TEMPLATE 3: MANDI KACHA SLIP (SCREEN 8 ORIGINAL)               */}
      {/* ============================================================== */}
      {templateMode === 'kacha-slip' && (
        <div
          ref={printRef}
          className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-black text-black font-sans shadow-md max-w-2xl mx-auto space-y-4 print-page"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-widest uppercase">
              {business.name || 'RTC'}
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-wide">
              {business.address || 'APMC Market Yard No. 2, Unjha'} · Phone{' '}
              {business.phone || '+91 98250 12345'}
            </p>
            <p className="text-xs font-semibold tracking-wider">
              GSTIN: {business.gstin || '24AABCR4450F1Z2'}
            </p>
            <div className="border-b-2 border-black pt-2" />
          </div>

          {/* Metadata 2x2 Grid */}
          <div className="border border-black text-xs divide-y divide-black">
            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
                  BILL NO. (T.P.)
                </span>
                <span className="text-xl font-black tracking-tight">{invoice.bill_no}</span>
              </div>
              <div className="p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
                  DATE
                </span>
                <span className="text-base font-extrabold">
                  {formatDate(invoice.bill_date, 'short')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
                  PARTY
                </span>
                <p className="font-extrabold text-sm leading-snug">{invoice.buyer_name}</p>
                <p className="text-xs font-medium text-gray-800">
                  {invoice.buyer_town || 'Local'}
                </p>
                <p className="text-[11px] font-semibold text-gray-700 pt-1">
                  PHONE: {buyerPhone}
                </p>
              </div>

              <div className="p-2.5 space-y-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
                    TRANSPORT
                  </span>
                  <p className="font-extrabold text-xs">
                    {invoice.transporter_name || 'Direct / None'}
                  </p>
                </div>

                <div className="grid grid-cols-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-gray-700 block">BROKER</span>
                    <span className="font-semibold">{invoice.broker_name || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-700 block">VEHICLE NO.</span>
                    <span className="font-semibold">{invoice.vehicle_no || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-black overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-black text-[11px] font-black">
                  <th className="p-2 border-r border-black w-8 text-center">#</th>
                  <th className="p-2 border-r border-black">Material</th>
                  <th className="p-2 border-r border-black text-right w-14">Pieces</th>
                  <th className="p-2 border-r border-black text-right w-14">Kg / pc</th>
                  <th className="p-2 border-r border-black text-right w-18">Total kg</th>
                  <th className="p-2 border-r border-black text-right w-22">Rate ₹ / qtl</th>
                  <th className="p-2 text-right w-24">Amount ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {invoice.lines?.map((line, idx) => (
                  <tr key={idx} className="font-semibold">
                    <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-black font-extrabold">
                      {line.item_name}
                    </td>
                    <td className="p-2 border-r border-black text-right">{line.pieces}</td>
                    <td className="p-2 border-r border-black text-right">{line.kg_per_piece}</td>
                    <td className="p-2 border-r border-black text-right font-bold">
                      {formatIndianNumber(line.total_kg)}
                    </td>
                    <td className="p-2 border-r border-black text-right">
                      {formatIndianNumber(line.rate)}
                    </td>
                    <td className="p-2 text-right font-extrabold">
                      {formatIndianNumber(line.amount)}
                    </td>
                  </tr>
                ))}
                {/* Blank spacer */}
                <tr className="h-6">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
                {/* Total Line */}
                <tr className="border-t-2 border-black font-black bg-gray-50">
                  <td className="p-2 border-r border-black text-center" colSpan={2}>
                    Total
                  </td>
                  <td className="p-2 border-r border-black text-right">{totalPieces}</td>
                  <td className="p-2 border-r border-black text-right">—</td>
                  <td className="p-2 border-r border-black text-right">
                    {formatIndianNumber(totalKg)}
                  </td>
                  <td className="p-2 border-r border-black text-right">—</td>
                  <td className="p-2 text-right font-black">
                    {formatIndianNumber(invoice.subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Extra Charges & Grand Total */}
          <div className="flex justify-end pt-1">
            <div className="w-64 border border-black text-xs divide-y divide-black">
              <div className="flex justify-between p-2">
                <span className="font-semibold text-gray-700">Material amount</span>
                <span className="font-bold">{formatIndianNumber(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-semibold text-gray-700">Extra Charges</span>
                <span className="font-bold">{formatIndianNumber(invoice.extra_charges)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-100 text-sm font-black">
                <span>Grand Total</span>
                <span className="text-base font-extrabold">
                  ₹ {formatIndianNumber(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="border border-black p-2.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700 mb-0.5">
              AMOUNT IN WORDS
            </span>
            <p className="font-extrabold text-sm">{amountWords}</p>
          </div>

          {/* Notes & Sign */}
          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
                Notes
              </span>
              <p className="text-[11px] text-gray-700 leading-snug">
                {invoice.notes ||
                  'Goods once sold cannot be taken back. Payment due on delivery.'}
              </p>
            </div>

            <div className="text-center pt-6 space-y-1">
              <div className="border-t border-black w-48 mx-auto" />
              <span className="text-xs font-bold uppercase tracking-wide block">
                For {business.name || 'RTC'} · Sign
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
