// src/components/KachaInvoiceSlip.tsx
'use client';

import React, { useRef, useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import {
  formatCurrency,
  formatIndianNumber,
  formatIndianDecimals,
  formatDate,
  amountToIndianWords,
} from '@/lib/formatters';
import { formatTallyDateIST } from '@/lib/dates';
import {
  ArrowLeft,
  Printer,
  Download,
  MessageCircle,
  FileText,
  BookOpen,
  Receipt,
  Loader2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type TemplateMode = 'tally-invoice' | 'tally-ledger' | 'kacha-slip';

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
  const buyerPhone = invoice.buyer_phone || buyerParty?.phone;

  const totalPieces = (invoice.lines || []).reduce((sum, l) => sum + l.pieces, 0);
  const totalKg = (invoice.lines || []).reduce((sum, l) => sum + l.total_kg, 0);
  const amountWords = amountToIndianWords(invoice.total, 'Indian Rupees');

  // Compute party ledger entries for Tally Ledger view
  const partyInvoices = invoices.filter(
    (inv) =>
      (inv.buyer_id && inv.buyer_id === invoice.buyer_id) ||
      inv.buyer_name.toLowerCase() === invoice.buyer_name.toLowerCase()
  );

  const priorBills = partyInvoices.filter((inv) => inv.id !== invoice.id);
  const ledgerEntries = [
    ...(priorBills.length > 0
      ? priorBills.map((inv) => ({
          date: formatTallyDateIST(inv.bill_date),
          particulars: `To Sales (Bill #${inv.bill_no} - ${inv.lines?.[0]?.item_name || 'Goods'})`,
          vchType: 'Sales',
          vchNo: String(inv.bill_no),
          debit: inv.total,
          credit: 0,
        }))
      : [
          {
            date: formatTallyDateIST(new Date(Date.now() - 7 * 86400000)),
            particulars: 'To Sales (Opening Billing)',
            vchType: 'Sales',
            vchNo: 'OB-01',
            debit: 0,
            credit: 0,
          },
        ]),
    {
      date: formatTallyDateIST(invoice.bill_date),
      particulars: `To Sales (Bill #${invoice.bill_no} - ${invoice.lines?.[0]?.item_name || 'Commodities'})`,
      vchType: 'Sales',
      vchNo: String(invoice.bill_no),
      debit: invoice.total,
      credit: 0,
    },
  ];

  const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
  const netBalance = totalDebit - totalCredit;

  // Determine intra-state vs inter-state GST
  const isIntraState =
    !business.state_code ||
    !buyerParty?.state_code ||
    business.state_code === buyerParty.state_code;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || isPdfExporting) return;
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
          : `Tax-Invoice-${invoice.bill_no}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF generation failed. You can also click Print and select Save as PDF.');
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!printRef.current || isExporting) return;
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
      a.download = `Invoice-${templateMode === 'tally-ledger' ? 'Ledger' : 'Bill'}-${invoice.bill_no}.png`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsApp = () => {
    if (!buyerPhone) {
      alert('Buyer has no phone number recorded. Please update buyer phone number.');
      return;
    }
    // Normalise 10-digit Indian number to 91XXXXXXXXXX
    const cleanDigits = buyerPhone.replace(/[^\d]/g, '');
    const normalizedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const dateFormatted = formatTallyDateIST(invoice.bill_date);

    let msg = '';
    if (templateMode === 'tally-ledger') {
      msg = `*${business.name}*\n*STATEMENT OF ACCOUNTS (LEDGER)*\nParty: ${invoice.buyer_name}\nPeriod: Up to ${dateFormatted}\n\nTotal Sales (Dr): ₹${formatIndianDecimals(totalDebit)}\nTotal Payments (Cr): ₹${formatIndianDecimals(totalCredit)}\n*Closing Balance Due: ₹${formatIndianDecimals(netBalance)} Dr*\n(${amountToIndianWords(netBalance, 'Indian Rupees')})\n\nPlease verify and release pending payment. Thank you!`;
    } else {
      msg = `*${business.name} - TAX INVOICE #${invoice.bill_no}*\nDate: ${dateFormatted}\nParty: ${invoice.buyer_name}${invoice.buyer_town ? ` (${invoice.buyer_town})` : ''}\nTransport: ${invoice.transporter_name || 'Direct'}\nVehicle: ${invoice.vehicle_no || '—'}\nItems: ${invoice.lines?.[0]?.item_name || 'Commodities'} (${totalPieces} bags = ${formatIndianDecimals(totalKg)} kg)\n*Total Amount: ₹${formatIndianDecimals(invoice.total)}*\nAmount in words: ${amountWords}\n${business.bank_name ? `\nBank: ${business.bank_name} | A/c: ${business.bank_account || '—'} | IFSC: ${business.bank_ifsc || '—'}` : ''}\nThank you for your business!`;
    }

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="pb-28 pt-1 space-y-4 animate-fade-in font-['Arial',Helvetica,sans-serif]">
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
            <span>Sales Statement</span>
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
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-black hover:bg-neutral-800 disabled:bg-neutral-400 px-3.5 py-2 rounded-2xl transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
            title="Download Tally Prime PDF"
          >
            {isPdfExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
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
            disabled={!buyerPhone}
            className="flex items-center gap-1 text-xs font-bold text-white bg-[#184E3A] hover:bg-[#123E2E] disabled:bg-neutral-300 px-3.5 py-2 rounded-2xl transition-colors shadow-2xs disabled:cursor-not-allowed"
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
      {/* TEMPLATE 1: TALLY-STYLE TAX INVOICE (MONOCHROME, ARIAL GRID)   */}
      {/* ============================================================== */}
      {templateMode === 'tally-invoice' && (
        <div
          ref={printRef}
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          className="bg-white p-4 sm:p-6 border border-black text-black shadow-md max-w-3xl mx-auto space-y-0 print-page text-[11px] leading-tight select-text"
        >
          {/* Top Header: Tax Invoice */}
          <div className="border-b border-black text-center py-1 font-bold tracking-wider text-xs uppercase bg-white">
            Tax Invoice
          </div>

          {/* Seller & Invoice Details Block (2-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-black divide-y sm:divide-y-0 sm:divide-x divide-black">
            {/* Seller Block (Left) */}
            <div className="p-2 space-y-0.5">
              <p className="font-bold text-xs uppercase tracking-wide">
                {business.name}
              </p>
              {business.address && (
                <p className="text-[10px] text-black leading-tight">
                  {business.address}
                </p>
              )}
              {business.gstin && (
                <p className="text-[10px] font-semibold">
                  GSTIN/UIN: <span className="font-mono">{business.gstin}</span>
                </p>
              )}
              <p className="text-[10px]">
                State Name: <span className="font-semibold">{business.state || 'Gujarat'}</span>
                {business.state_code ? `, Code: ${business.state_code}` : ''}
              </p>
              {business.phone && (
                <p className="text-[10px]">Contact: {business.phone}</p>
              )}
              {business.email && (
                <p className="text-[10px]">Email: {business.email}</p>
              )}
            </div>

            {/* Invoice No. & Date Block (Right) */}
            <div className="text-[10px] divide-y divide-black">
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Invoice No.</span>
                  <span className="font-mono font-bold text-xs">
                    {business.bill_prefix
                      ? `${business.bill_prefix}${invoice.bill_no}`
                      : invoice.bill_no}
                  </span>
                </div>
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Dated</span>
                  <span className="font-bold text-[10px]">
                    {formatTallyDateIST(invoice.bill_date)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Delivery Note</span>
                  <span className="text-[10px]">—</span>
                </div>
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Mode/Terms of Payment</span>
                  <span className="text-[10px]">Due on Delivery</span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Supplier&apos;s Ref.</span>
                  <span className="text-[10px]">TP #{invoice.bill_no}</span>
                </div>
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Buyer&apos;s Order No.</span>
                  <span className="text-[10px]">—</span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Despatched through</span>
                  <span className="font-bold text-[10px]">
                    {invoice.transporter_name || 'Direct / Self'}
                  </span>
                </div>
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Destination</span>
                  <span className="text-[10px]">
                    {invoice.buyer_town || 'Local Mandi'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Motor Vehicle No.</span>
                  <span className="font-mono font-bold text-[10px]">
                    {invoice.vehicle_no || '—'}
                  </span>
                </div>
                <div className="p-1">
                  <span className="text-[9px] text-neutral-600 block">Terms of Delivery</span>
                  <span className="text-[10px]">Ex-Mandi Yard Godown</span>
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Block: Bill to & Ship to (2-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-black divide-y sm:divide-y-0 sm:divide-x divide-black text-[10px]">
            {/* Bill to */}
            <div className="p-2 space-y-0.5">
              <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider block">
                Buyer (Bill to)
              </span>
              <p className="font-bold text-xs uppercase text-black">{invoice.buyer_name}</p>
              {buyerParty?.address ? (
                <p className="text-[10px] text-neutral-800 leading-tight">
                  {buyerParty.address}
                </p>
              ) : invoice.buyer_town ? (
                <p className="text-[10px] text-neutral-800 leading-tight">
                  {invoice.buyer_town} Mandi Area
                </p>
              ) : null}
              {buyerParty?.gstin && (
                <p className="text-[10px] font-semibold">
                  GSTIN/UIN: <span className="font-mono font-bold">{buyerParty.gstin}</span>
                </p>
              )}
              <p className="text-[10px]">
                State Name: <span className="font-semibold">{buyerParty?.state || (invoice.buyer_town ? 'State' : 'Gujarat')}</span>
                {buyerParty?.state_code ? `, Code: ${buyerParty.state_code}` : ''}
              </p>
              {buyerPhone && <p className="text-[10px]">Phone: {buyerPhone}</p>}
            </div>

            {/* Ship to */}
            <div className="p-2 space-y-0.5">
              <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider block">
                Consignee (Ship to)
              </span>
              <p className="font-bold text-xs uppercase text-black">{invoice.buyer_name}</p>
              <p className="text-[10px] text-neutral-800 leading-tight">
                {buyerParty?.address || (invoice.buyer_town ? `${invoice.buyer_town} Mandi Yard Godown` : 'Same as Buyer')}
              </p>
              <p className="text-[10px]">
                Despatched via: <span className="font-semibold">{invoice.transporter_name || 'Direct'}</span>
              </p>
              {invoice.vehicle_no && (
                <p className="text-[10px] font-mono">Vehicle No: {invoice.vehicle_no}</p>
              )}
            </div>
          </div>

          {/* Item Table (Exact Columns: Sl No, Description, HSN/SAC, Qty, Rate, per, Amount) */}
          <div className="border-b border-black">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-black text-center font-bold bg-white">
                  <th className="py-1 px-1 border-r border-black w-8">Sl No</th>
                  <th className="py-1 px-2 border-r border-black text-left">
                    Description of Goods
                  </th>
                  <th className="py-1 px-1 border-r border-black w-16">HSN/SAC</th>
                  <th className="py-1 px-2 border-r border-black text-right w-24">Qty</th>
                  <th className="py-1 px-2 border-r border-black text-right w-20">Rate</th>
                  <th className="py-1 px-1 border-r border-black text-center w-10">per</th>
                  <th className="py-1 px-2 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="align-top divide-y-0">
                {invoice.lines?.map((line, idx) => (
                  <tr key={idx} className="min-h-[22px]">
                    <td className="py-1 px-1 border-r border-black text-center">{idx + 1}</td>
                    <td className="py-1 px-2 border-r border-black">
                      <span className="font-bold text-[11px] block">{line.item_name}</span>
                      <span className="text-[9px] text-neutral-600 block">
                        ({line.pieces} Bags @ {line.kg_per_piece} kg ={' '}
                        {formatIndianDecimals(line.total_kg)} kg)
                      </span>
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center font-mono">
                      0909
                    </td>
                    <td className="py-1 px-2 border-r border-black text-right font-semibold">
                      {line.pieces} Bags
                      <span className="block text-[9px] text-neutral-600 font-normal">
                        ({(line.total_kg / 100).toFixed(2)} Qtl)
                      </span>
                    </td>
                    <td className="py-1 px-2 border-r border-black text-right font-mono">
                      {formatIndianDecimals(line.rate)}
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center text-[9px]">
                      Qtl
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold">
                      {formatIndianDecimals(line.amount)}
                    </td>
                  </tr>
                ))}

                {/* Extra Charges formatted as Ledger lines */}
                {invoice.charges?.map((ch, cidx) => (
                  <tr key={`ch-${cidx}`}>
                    <td className="py-1 px-1 border-r border-black text-center"></td>
                    <td className="py-1 px-2 border-r border-black font-semibold">
                      {ch.label}
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center font-mono"></td>
                    <td className="py-1 px-2 border-r border-black"></td>
                    <td className="py-1 px-2 border-r border-black"></td>
                    <td className="py-1 px-1 border-r border-black"></td>
                    <td className="py-1 px-2 text-right font-mono font-semibold">
                      {formatIndianDecimals(ch.amount)}
                    </td>
                  </tr>
                ))}

                {/* GST Rows (CGST / SGST or IGST) */}
                <tr>
                  <td className="py-1 px-1 border-r border-black text-center"></td>
                  <td className="py-1 px-2 border-r border-black font-semibold text-neutral-700">
                    {isIntraState ? 'CGST (Central Goods & Services Tax)' : 'IGST (Integrated Tax)'}
                  </td>
                  <td className="py-1 px-1 border-r border-black text-center font-mono"></td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono">0.00%</td>
                  <td className="py-1 px-1 border-r border-black"></td>
                  <td className="py-1 px-2 text-right font-mono">0.00</td>
                </tr>

                {isIntraState && (
                  <tr>
                    <td className="py-1 px-1 border-r border-black text-center"></td>
                    <td className="py-1 px-2 border-r border-black font-semibold text-neutral-700">
                      SGST (State Goods & Services Tax)
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center font-mono"></td>
                    <td className="py-1 px-2 border-r border-black"></td>
                    <td className="py-1 px-2 border-r border-black text-right font-mono">0.00%</td>
                    <td className="py-1 px-1 border-r border-black"></td>
                    <td className="py-1 px-2 text-right font-mono">0.00</td>
                  </tr>
                )}

                {/* Vertical Ruled Blank Spacer for Authentic Tally Height */}
                <tr className="h-10">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>

                {/* Total Row with Double Horizontal Underline */}
                <tr className="border-t border-b-2 border-black font-bold bg-white">
                  <td className="py-1 px-1 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right uppercase">
                    Total
                  </td>
                  <td className="py-1 px-1 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono font-bold">
                    {totalPieces} Bags
                  </td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-1 border-r border-black"></td>
                  <td className="py-1 px-2 text-right font-mono text-[11px] font-black">
                    ₹ {formatIndianDecimals(invoice.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="border-b border-black p-2 flex justify-between items-start text-[10px]">
            <div>
              <span className="text-[9px] text-neutral-600 block uppercase">
                Amount Chargeable (in words)
              </span>
              <span className="font-bold text-xs">{amountWords}</span>
            </div>
            <span className="font-semibold text-neutral-500 text-[9px] italic">E. & O.E.</span>
          </div>

          {/* Bank Details & Declaration + Signatory (2-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-black divide-y sm:divide-y-0 sm:divide-x divide-black text-[10px]">
            {/* Left: Bank Details & Declaration */}
            <div className="p-2 space-y-2">
              {business.bank_name ? (
                <div>
                  <span className="font-bold text-[9px] uppercase tracking-wider block text-neutral-700">
                    Company&apos;s Bank Details
                  </span>
                  <p>Bank Name : <span className="font-bold">{business.bank_name}</span></p>
                  <p>A/c No.   : <span className="font-mono font-bold">{business.bank_account || '—'}</span></p>
                  <p>Branch & IFS Code : <span className="font-semibold">{business.bank_branch || 'Main Branch'} &amp; {business.bank_ifsc || '—'}</span></p>
                </div>
              ) : (
                <div className="text-[9px] text-neutral-500 italic">
                  Company bank details can be configured in business settings.
                </div>
              )}

              <div className="pt-1 border-t border-neutral-300">
                <span className="font-bold text-[9px] uppercase tracking-wider block text-neutral-700">
                  Declaration
                </span>
                <p className="text-[9px] text-neutral-700 leading-tight">
                  We declare that this invoice shows the actual price of the goods described
                  and that all particulars are true and correct.
                </p>
              </div>
            </div>

            {/* Right: Signature Box */}
            <div className="p-2 flex flex-col justify-between text-right">
              <span className="font-bold text-[10px] uppercase block">
                for {business.name}
              </span>

              <div className="pt-10 text-center">
                <span className="font-bold text-[10px] border-t border-black px-8 pt-1 inline-block uppercase">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Computer Generated Invoice Notice */}
          <div className="text-center py-1 text-[9px] font-semibold text-neutral-600">
            This is a Computer Generated Invoice · SUBJECT TO JURISDICTION
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TEMPLATE 2: SALES STATEMENT / TALLY LEDGER                      */}
      {/* ============================================================== */}
      {templateMode === 'tally-ledger' && (
        <div
          ref={printRef}
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          className="bg-white p-4 sm:p-6 border border-black text-black shadow-md max-w-3xl mx-auto space-y-0 print-page text-[11px] leading-tight select-text"
        >
          <div className="border-b border-black text-center p-2 space-y-0.5">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              {business.name}
            </h2>
            {business.address && <p className="text-[10px] text-neutral-800">{business.address}</p>}
            {business.gstin && (
              <p className="text-[10px] font-semibold">
                GSTIN: <span className="font-mono">{business.gstin}</span>
              </p>
            )}
          </div>

          <div className="border-b border-black p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-[10px]">
            <div>
              <span className="font-bold text-xs uppercase block text-black">
                Sales Statement
              </span>
              <span className="font-extrabold text-sm block">{invoice.buyer_name}</span>
              {buyerParty?.address && (
                <span className="text-[10px] text-neutral-700">{buyerParty.address}</span>
              )}
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[9px] text-neutral-600 block">Statement Date</span>
              <span className="font-bold">{formatTallyDateIST(invoice.bill_date)}</span>
              {buyerParty?.gstin && (
                <span className="text-[9px] text-neutral-600 block pt-0.5">
                  GSTIN: {buyerParty.gstin}
                </span>
              )}
            </div>
          </div>

          <div className="border-b border-black">
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
              <tbody className="divide-y-0">
                {ledgerEntries.map((entry, idx) => (
                  <tr key={idx}>
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
                    <td className="py-1 px-2 border-r border-black text-right font-mono">
                      {entry.debit ? formatIndianDecimals(entry.debit) : ''}
                    </td>
                    <td className="py-1 px-2 text-right font-mono">
                      {entry.credit ? formatIndianDecimals(entry.credit) : ''}
                    </td>
                  </tr>
                ))}

                <tr className="border-t border-b-2 border-black font-bold bg-white">
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black uppercase text-right">
                    Total
                  </td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black"></td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono">
                    ₹ {formatIndianDecimals(totalDebit)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    ₹ {formatIndianDecimals(totalCredit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-b border-black p-2 flex justify-between items-center text-[10px]">
            <div>
              <span className="text-[9px] text-neutral-600 block uppercase">
                Net Debit Balance
              </span>
              <span className="font-bold text-xs">
                ₹ {formatIndianDecimals(netBalance)} Dr ({amountToIndianWords(netBalance, 'Indian Rupees')})
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-[10px] uppercase block">for {business.name}</span>
              <div className="pt-6">
                <span className="font-bold text-[9px] border-t border-black px-6 pt-1 inline-block uppercase">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>

          <div className="text-center py-1 text-[9px] font-semibold text-neutral-600">
            This is a Computer Generated Statement · Subject to Jurisdiction
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TEMPLATE 3: MANDI KACHA SLIP (SCREEN 8 ORIGINAL)               */}
      {/* ============================================================== */}
      {templateMode === 'kacha-slip' && (
        <div
          ref={printRef}
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          className="bg-white p-6 rounded-2xl border-2 border-black text-black font-sans shadow-md max-w-2xl mx-auto space-y-4 print-page select-text"
        >
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black tracking-widest uppercase">
              {business.name}
            </h1>
            {business.address && (
              <p className="text-xs font-semibold tracking-wide">
                {business.address} · Phone {business.phone || '—'}
              </p>
            )}
            {business.gstin && (
              <p className="text-xs font-semibold tracking-wider">
                GSTIN: {business.gstin}
              </p>
            )}
            <div className="border-b-2 border-black pt-2" />
          </div>

          <div className="border border-black text-xs divide-y divide-black">
            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-700">
                  BILL NO. (T.P.)
                </span>
                <span className="text-xl font-black">{invoice.bill_no}</span>
              </div>
              <div className="p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-700">
                  DATE
                </span>
                <span className="text-base font-extrabold">
                  {formatDate(invoice.bill_date, 'short')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-700">
                  PARTY
                </span>
                <p className="font-extrabold text-sm">{invoice.buyer_name}</p>
                <p className="text-xs text-neutral-800">{invoice.buyer_town || 'Local'}</p>
                {buyerPhone && (
                  <p className="text-[11px] font-semibold text-neutral-700 pt-1">
                    PHONE: {buyerPhone}
                  </p>
                )}
              </div>

              <div className="p-2.5 space-y-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-700">
                    TRANSPORT
                  </span>
                  <p className="font-extrabold text-xs">
                    {invoice.transporter_name || 'Direct / None'}
                  </p>
                </div>

                <div className="grid grid-cols-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-700 block">BROKER</span>
                    <span className="font-semibold">{invoice.broker_name || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-700 block">VEHICLE NO.</span>
                    <span className="font-semibold">{invoice.vehicle_no || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-black overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-black text-[11px] font-black">
                  <th className="p-2 border-r border-black w-8 text-center">#</th>
                  <th className="p-2 border-r border-black">Material</th>
                  <th className="p-2 border-r border-black text-right w-14">Pieces</th>
                  <th className="p-2 border-r border-black text-right w-14">Kg / pc</th>
                  <th className="p-2 border-r border-black text-right w-18">Total kg</th>
                  <th className="p-2 border-r border-black text-right w-22">Rate ₹ / qtl</th>
                  <th className="p-2 text-right w-24">Amount ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300">
                {invoice.lines?.map((line, idx) => (
                  <tr key={idx} className="font-semibold">
                    <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-black font-extrabold">{line.item_name}</td>
                    <td className="p-2 border-r border-black text-right">{line.pieces}</td>
                    <td className="p-2 border-r border-black text-right">{line.kg_per_piece}</td>
                    <td className="p-2 border-r border-black text-right font-bold">
                      {formatIndianNumber(line.total_kg)}
                    </td>
                    <td className="p-2 border-r border-black text-right">
                      {formatIndianDecimals(line.rate)}
                    </td>
                    <td className="p-2 text-right font-extrabold">
                      {formatIndianDecimals(line.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-black font-black bg-neutral-50">
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
                    {formatIndianDecimals(invoice.subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-1">
            <div className="w-64 border border-black text-xs divide-y divide-black">
              <div className="flex justify-between p-2">
                <span className="font-semibold text-neutral-700">Material amount</span>
                <span className="font-bold">{formatIndianDecimals(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-semibold text-neutral-700">Extra Charges</span>
                <span className="font-bold">{formatIndianDecimals(invoice.extra_charges)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-neutral-100 text-sm font-black">
                <span>Grand Total</span>
                <span className="text-base font-extrabold">
                  ₹ {formatIndianDecimals(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-black p-2.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-700 mb-0.5">
              AMOUNT IN WORDS
            </span>
            <p className="font-extrabold text-sm">{amountWords}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-700">
                Notes
              </span>
              <p className="text-[11px] text-neutral-700 leading-snug">
                {invoice.notes || 'Goods once sold cannot be taken back. Payment due on delivery.'}
              </p>
            </div>

            <div className="text-center pt-6 space-y-1">
              <div className="border-t border-black w-48 mx-auto" />
              <span className="text-xs font-bold uppercase tracking-wide block">
                For {business.name} · Sign
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
