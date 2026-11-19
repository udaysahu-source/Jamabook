// src/components/KachaInvoiceSlip.tsx
'use client';

import React, { useRef, useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { formatCurrency, formatIndianNumber, formatDate, amountToIndianWords } from '@/lib/formatters';
import { ArrowLeft, Printer, Download, MessageCircle, Check } from 'lucide-react';
import html2canvas from 'html2canvas';

export function KachaInvoiceSlip() {
  const { selectedInvoice, setActiveView, business, parties } = useJamabook();
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const buyerParty = parties.find((p) => p.id === invoice.buyer_id);
  const buyerPhone = invoice.buyer_phone || buyerParty?.phone || '+91 94401 23456';

  const totalPieces = (invoice.lines || []).reduce((sum, l) => sum + l.pieces, 0);
  const totalKg = (invoice.lines || []).reduce((sum, l) => sum + l.total_kg, 0);
  const amountWords = amountToIndianWords(invoice.total);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `RTC-Bill-${invoice.bill_no}.png`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsApp = () => {
    const cleanPhone = buyerPhone.replace(/[^\d]/g, '');
    const dateFormatted = formatDate(invoice.bill_date, 'short');
    const msg = `*RTC - Bill No. ${invoice.bill_no} (T.P.)*\nDate: ${dateFormatted}\nParty: ${invoice.buyer_name}${invoice.buyer_town ? `, ${invoice.buyer_town}` : ''}\nTransport: ${invoice.transporter_name || 'Direct'}\nTotal Pieces: ${totalPieces} pcs (${formatIndianNumber(totalKg)} kg)\n*Total Amount: ₹${formatIndianNumber(invoice.total)}*\nAmount in words: ${amountWords}\n\nThank you for your business!`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="pb-28 pt-1 space-y-4 animate-fade-in">
      {/* Top Controls Bar (Hidden during print) */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#184E3A] bg-white border border-[#E5DFD1] px-3.5 py-2 rounded-2xl hover:bg-[#F2ECE1] transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex items-center gap-1 text-xs font-bold text-[#19221E] bg-white border border-[#D9D2C3] px-3 py-2 rounded-2xl hover:bg-[#F2ECE1] transition-colors shadow-2xs"
            title="Download PNG Slip"
          >
            <Download className="w-3.5 h-3.5 text-[#56645E]" />
            <span className="hidden sm:inline">Image</span>
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

      {/* Physical Mandi Invoice Paper (Matching Screen 8 exact layout) */}
      <div
        ref={printRef}
        className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-black text-black font-sans shadow-md max-w-2xl mx-auto space-y-4 print-page"
      >
        {/* 1. Header: RTC & Business Information */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest uppercase">
            {business.name || 'RTC'}
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-wide">
            {business.address || '[YOUR BUSINESS ADDRESS LINE]'} · Phone{' '}
            {business.phone || '[YOUR PHONE]'}
          </p>
          <p className="text-xs font-semibold tracking-wider">
            GSTIN: {business.gstin || '[IF ANY]'}
          </p>
          <div className="border-b-2 border-black pt-2" />
        </div>

        {/* 2. Bill Metadata 2x2 Grid */}
        <div className="border border-black text-xs divide-y divide-black">
          {/* Top Row: Bill No & Date */}
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

          {/* Bottom Row: Party & Transport / Broker / Vehicle */}
          <div className="grid grid-cols-2 divide-x divide-black">
            <div className="p-2.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
                PARTY
              </span>
              <p className="font-extrabold text-sm leading-snug">
                {invoice.buyer_name}
              </p>
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

        {/* 3. Items Table (Matching Screen 8) */}
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
                  <td className="p-2 border-r border-black font-extrabold">{line.item_name}</td>
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
              {/* Optional blank rows for authentic ledger look */}
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

        {/* 4. Totals Breakdown Card (Right aligned) */}
        <div className="flex justify-end pt-1">
          <div className="w-64 border border-black text-xs divide-y divide-black">
            <div className="flex justify-between p-2">
              <span className="font-semibold text-gray-700">Material amount</span>
              <span className="font-bold">{formatIndianNumber(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between p-2">
              <span className="font-semibold text-gray-700">Extra</span>
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

        {/* 5. Amount in Words */}
        <div className="border border-black p-2.5 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700 mb-0.5">
            AMOUNT IN WORDS
          </span>
          <p className="font-extrabold text-sm">{amountWords}</p>
        </div>

        {/* 6. Notes & Sign Footer */}
        <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
              Notes
            </span>
            <p className="text-[11px] text-gray-700 leading-snug">
              {invoice.notes || 'Goods once sold cannot be taken back. Payment due on delivery.'}
            </p>
          </div>

          <div className="text-center pt-6 space-y-1">
            <div className="border-t border-black w-48 mx-auto" />
            <span className="text-xs font-bold uppercase tracking-wide block">
              For {business.name || 'RTC'} · Sign
            </span>
          </div>
        </div>

        {/* Bottom Timestamp */}
        <div className="border-t border-gray-300 pt-3 text-center text-[10px] font-semibold text-gray-500">
          Thank you for your business · Bill {invoice.bill_no} · Generated{' '}
          {formatDate(invoice.bill_date, 'short')}
        </div>
      </div>
    </div>
  );
}
