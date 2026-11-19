// src/components/BillSavedScreen.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatCurrency, formatIndianNumber, formatDate } from '@/lib/formatters';
import { Check, MessageCircle, Download, Printer, ArrowLeft, AlertTriangle, X, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { downloadInvoicePDF } from '@/lib/pdfGenerator';

export function BillSavedScreen() {
  const {
    language,
    setActiveView,
    lastSavedInvoice,
    selectedInvoice,
    setSelectedInvoice,
    cancelInvoice,
    items,
    parties,
    business,
  } = useJamabook();
  const t = getT(language);

  const invoice = lastSavedInvoice || selectedInvoice;
  const slipRef = useRef<HTMLDivElement>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Party requested cancellation');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Trigger celebration confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#184E3A', '#2E7D32', '#C25E1A', '#F2ECE1'],
      });
    } catch {
      // Ignored if confetti not supported in environment
    }
  }, []);

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

  // Calculate stock before & after for the main item
  const mainLine = invoice.lines && invoice.lines[0];
  const itemObj = items.find((i) => i.id === mainLine?.item_id);
  const currentStock = itemObj?.pieces_in_stock || 0;
  const previousStock = currentStock + (mainLine?.pieces || 0);

  const buyerParty = parties?.find(
    (p) => p.id === invoice.buyer_id || p.name?.toLowerCase() === invoice.buyer_name?.toLowerCase()
  );

  const handleDownloadPDF = () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      const success = downloadInvoicePDF(invoice, business, buyerParty);
      if (!success) {
        setSelectedInvoice(invoice);
        setActiveView('invoice-view');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      setSelectedInvoice(invoice);
      setActiveView('invoice-view');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const cleanDigits = (invoice.buyer_phone || '').replace(/[^\d]/g, '');
    const normalizedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const dateFormatted = formatDate(invoice.bill_date, 'short');
    const msg = `*${business.name} - Bill No. ${invoice.bill_no}*\nDate: ${dateFormatted}\nParty: ${invoice.buyer_name}${invoice.buyer_town ? `, ${invoice.buyer_town}` : ''}\nTransport: ${invoice.transporter_name || 'Direct'}\nTotal: ₹${formatIndianNumber(invoice.total)}\n\nThank you for your business!`;

    const url = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSaveImage = async () => {
    if (!slipRef.current) return;
    try {
      setIsGeneratingImage(true);
      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Bill-${invoice.bill_no}-${invoice.buyer_name.replace(/\s+/g, '_')}.png`;
      a.click();
    } catch (err) {
      console.error('Image capture failed:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePrint = () => {
    setSelectedInvoice(invoice);
    setActiveView('invoice-view');
  };

  const handleConfirmCancel = () => {
    cancelInvoice(invoice.id, cancelReason);
    setShowCancelModal(false);
    setActiveView('home');
  };

  return (
    <div className="pb-28 pt-2 space-y-5 animate-fade-in">
      {/* 1. Success Icon & Header */}
      <div className="text-center space-y-1.5 pt-2">
        <div className="w-14 h-14 bg-[#184E3A] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>
        <h2 className="text-2xl font-black text-[#19221E] tracking-tight">
          Bill {invoice.bill_no} saved
        </h2>
        {mainLine && (
          <p className="text-xs font-semibold text-[#56645E]">
            Stock updated: {mainLine.item_name}{' '}
            <span className="font-bold text-[#19221E]">{previousStock}</span> →{' '}
            <span className="font-bold text-[#184E3A]">{currentStock} pcs</span>
          </p>
        )}
      </div>

      {/* 2. Authentic Kacha Mandi Slip Preview Card (Matching Screen 3) */}
      <div
        ref={slipRef}
        className="bg-white p-5 rounded-3xl border border-[#E5DFD1] shadow-sm space-y-3 relative overflow-hidden"
      >
        {/* Brand Header */}
        <div className="text-center pb-1">
          <span className="text-xl font-black tracking-widest text-[#19221E] uppercase inline-block pb-1 border-b-2 border-[#184E3A]">
            {business.name}
          </span>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
          <div>
            <span className="text-[#56645E] block text-[11px] font-medium">T.P. / Bill No.</span>
            <span className="font-extrabold text-base text-[#19221E]">{invoice.bill_no}</span>
          </div>

          <div>
            <span className="text-[#56645E] block text-[11px] font-medium">Date</span>
            <span className="font-bold text-[#19221E]">
              {formatDate(invoice.bill_date, 'short')}
            </span>
          </div>

          <div>
            <span className="text-[#56645E] block text-[11px] font-medium">Transport</span>
            <span className="font-bold text-[#19221E]">
              {invoice.transporter_name || 'Direct'}
            </span>
          </div>

          <div>
            <span className="text-[#56645E] block text-[11px] font-medium">Party</span>
            <span className="font-bold text-[#19221E] leading-snug block">
              {invoice.buyer_name}
              {invoice.buyer_town ? `, ${invoice.buyer_town}` : ''}
            </span>
          </div>
        </div>

        {/* Dashed Separator */}
        <div className="border-t border-dashed border-[#D9D2C3] my-2" />

        {/* Item Line(s) */}
        <div className="space-y-2 text-xs">
          {invoice.lines?.map((line, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <div className="pr-2">
                <span className="font-bold text-sm text-[#19221E] block">
                  {line.item_name}
                </span>
                <span className="text-[#56645E] text-[11px] block mt-0.5">
                  {line.pieces} pcs × {line.kg_per_piece} kg = {formatIndianNumber(line.total_kg)} kg ({(line.total_kg / 100).toFixed(0)} qtl)
                </span>
                <span className="text-[#56645E] text-[11px] block">
                  @ ₹{formatIndianNumber(line.rate)} per quintal
                </span>
              </div>
              <span className="font-extrabold text-sm text-[#19221E] text-right">
                {formatIndianNumber(line.amount)}
              </span>
            </div>
          ))}

          {/* Extra Charges */}
          {invoice.charges?.map((c, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs pt-1">
              <span className="text-[#56645E] font-medium">{c.label}</span>
              <span className="font-bold text-[#19221E]">{formatIndianNumber(c.amount)}</span>
            </div>
          ))}
        </div>

        {/* Solid Separator */}
        <div className="border-t border-[#19221E] pt-2" />

        {/* Total Row */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-bold text-[#19221E]">{t.total}</span>
          <span className="text-2xl font-black text-[#19221E] tracking-tight">
            ₹{formatIndianNumber(invoice.total)}
          </span>
        </div>

        {/* Sign Box */}
        <div className="pt-4 flex justify-end">
          <div className="text-center w-28">
            <div className="border-b border-[#A8A29E] mb-1" />
            <span className="text-[11px] font-semibold text-[#56645E]">{t.sign}</span>
          </div>
        </div>
      </div>

      {/* 3. Actions Section */}
      <div className="space-y-2.5">
        {/* WhatsApp Share & Tally PDF Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={handleShareWhatsApp}
            className="w-full bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>{t.shareOnWhatsApp}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="w-full bg-black hover:bg-neutral-800 disabled:bg-neutral-500 active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>{t.downloadTallyPdf}</span>
              </>
            )}
          </button>
        </div>

        {/* Save Image & View / Print */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleSaveImage}
            disabled={isGeneratingImage}
            className="w-full bg-white border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-[#56645E]" />
            <span>{isGeneratingImage ? 'Saving...' : t.saveImage}</span>
          </button>

          <button
            onClick={handlePrint}
            className="w-full bg-[#E7EFE9] border border-[#184E3A]/20 hover:bg-[#D5E4D8] text-[#184E3A] py-3 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-[#184E3A]" />
            <span>Tally Invoice &amp; Print</span>
          </button>
        </div>

        {/* Done & Cancel links */}
        <div className="flex items-center justify-between pt-2 px-1">
          <button
            onClick={() => setActiveView('home')}
            className="text-sm font-extrabold text-[#19221E] hover:underline py-2"
          >
            {t.done}
          </button>

          {invoice.status === 'active' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-bold text-[#C25E1A] hover:underline py-2"
            >
              {t.cancelThisBill}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Bill Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-[#C25E1A]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-extrabold text-[#19221E]">
                Cancel Bill {invoice.bill_no}?
              </h3>
            </div>

            <p className="text-xs text-[#56645E] leading-relaxed">
              Cancelling this bill will restore stock back into the ledger and mark this bill cancelled. This action is recorded in the audit log and cannot be undone.
            </p>

            <div>
              <label className="text-xs font-bold text-[#56645E] block mb-1">
                Reason for cancellation *
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Order changed by party"
                className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold focus:outline-none focus:border-[#184E3A]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#F3EFE6] text-[#56645E]"
              >
                Keep Bill
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
