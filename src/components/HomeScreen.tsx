// src/components/HomeScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatCurrency, formatIndianNumber } from '@/lib/formatters';
import { todayIST } from '@/lib/dates';
import { Plus, MessageCircle, ChevronRight, AlertCircle, PhoneCall, Sparkles } from 'lucide-react';
import { Invoice } from '@/types';
import { OnboardingModal } from './OnboardingModal';

export function HomeScreen() {
  const {
    language,
    setActiveView,
    business,
    items,
    enquiries,
    invoices,
    setSelectedInvoice,
  } = useJamabook();
  const t = getT(language);

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Stock summary
  const totalStockPieces = items.reduce((sum, item) => sum + (item.pieces_in_stock || 0), 0);
  const lowStockCount = items.filter(
    (item) => item.low_stock_pieces && (item.pieces_in_stock || 0) <= item.low_stock_pieces
  ).length;

  // Follow-ups summary using Indian Standard Time
  const [todayStr, setTodayStr] = useState('2026-11-19');
  const [todayDisplay, setTodayDisplay] = useState('Thursday, 19 November');

  useEffect(() => {
    const today = todayIST();
    setTodayStr(today);
    const d = new Date();
    setTodayDisplay(
      d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    );
  }, [language]);

  const dueTodayEnquiries = enquiries.filter(
    (e) => e.status === 'open' && e.next_follow_up && e.next_follow_up <= todayStr
  );
  const overdueCount = enquiries.filter(
    (e) => e.status === 'open' && e.next_follow_up && e.next_follow_up < todayStr
  ).length;

  // Recent active invoices
  const recentInvoices = invoices.slice(0, 5);

  const handleOpenInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setActiveView('invoice-view');
  };

  const handleWhatsApp = (phone?: string, contactName?: string, note?: string) => {
    if (!phone) return;
    const cleanDigits = phone.replace(/[^\d]/g, '');
    const normalizedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const greeting = language === 'hi' ? 'नमस्ते' : 'Namaste';
    const msg = `${greeting} ${contactName || 'ji'}, ${note || `${business.name} se sampark kar rahe hain. Stock aur rate update ke liye batayein.`}`;
    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="pb-24 pt-2 space-y-5 animate-fade-in">
      {/* Onboarding Banner if not completed */}
      {!business.is_onboarded && (
        <div className="bg-[#E7EFE9] border border-[#184E3A]/20 p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#184E3A]" />
            <div>
              <p className="font-bold text-xs text-[#184E3A]">Setup your Mandi Firm</p>
              <p className="text-[11px] text-[#56645E]">Configure address, GSTIN and bank details for Tally bills</p>
            </div>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-3 py-1.5 bg-[#184E3A] text-white rounded-xl text-xs font-bold shrink-0"
          >
            Setup
          </button>
        </div>
      )}

      {/* 1. Greeting & Date */}
      <div>
        <h2 className="text-3xl font-extrabold text-[#19221E] tracking-tight">
          {t.namaste}
        </h2>
        <p className="text-sm font-semibold text-[#56645E] capitalize mt-0.5">
          {todayDisplay}
        </p>
      </div>

      {/* 2. Hero Action Card: New Bill */}
      <button
        onClick={() => setActiveView('bill-new')}
        className="w-full text-left bg-[#184E3A] hover:bg-[#133F2F] text-white p-5 rounded-3xl shadow-sm transition-all transform active:scale-[0.99] group relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white group-hover:bg-white/30 transition-colors">
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight leading-none">
                {t.newBill}
              </h3>
              <p className="text-sm font-medium text-emerald-200 mt-1">
                {t.newBillHindi}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 block">
              {t.nextBill}
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              {t.no} {business.next_bill_no}
            </span>
          </div>
        </div>
      </button>

      {/* 3. Metric Cards Grid: Stock & Follow-ups */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Stock Card */}
        <button
          onClick={() => setActiveView('stock')}
          className="text-left bg-white p-4 rounded-3xl border border-[#E5DFD1] hover:border-[#D0C6B4] transition-all active:scale-[0.98] shadow-xs"
        >
          <span className="text-xs font-bold text-[#56645E] block">
            {t.stock} · {t.stockHindi}
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-[#19221E] tracking-tight">
              {formatIndianNumber(totalStockPieces)}
            </span>
            <span className="text-sm font-semibold text-[#56645E]">
              {t.pcs}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#56645E]">
            <span>{items.length} {t.items}</span>
            {lowStockCount > 0 && (
              <>
                <span>·</span>
                <span className="text-[#C25E1A] font-bold">
                  {lowStockCount} {t.lowStock}
                </span>
              </>
            )}
          </div>
        </button>

        {/* Follow-ups Card */}
        <button
          onClick={() => setActiveView('follow-ups')}
          className="text-left bg-[#FCF8EE] p-4 rounded-3xl border border-[#EADBCA] hover:border-[#DCC8B0] transition-all active:scale-[0.98] shadow-xs"
        >
          <span className="text-xs font-bold text-[#56645E] block">
            {t.followUps} · {t.followUpsHindi}
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-[#C25E1A] tracking-tight">
              {dueTodayEnquiries.length}
            </span>
            <span className="text-xs font-bold text-[#C25E1A]">
              {t.dueToday}
            </span>
          </div>
          <div className="mt-2 text-xs font-semibold text-[#8C3D0E]">
            {overdueCount > 0 ? `${overdueCount} ${t.overdue}` : 'All caught up'}
          </div>
        </button>
      </div>

      {/* 4. Call or Message Today Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-extrabold text-base text-[#19221E] tracking-tight">
            {t.callOrMessageToday}
          </h4>
          <button
            onClick={() => setActiveView('follow-ups')}
            className="text-xs font-bold text-[#184E3A] hover:underline"
          >
            {t.seeAll} {dueTodayEnquiries.length}
          </button>
        </div>

        <div className="space-y-2">
          {dueTodayEnquiries.length === 0 ? (
            <div className="bg-white p-4 rounded-2xl border border-[#E5DFD1] text-center text-xs text-[#56645E]">
              No follow-ups due today. Log buyer inquiries to get WhatsApp reminders here.
            </div>
          ) : (
            dueTodayEnquiries.slice(0, 2).map((enq) => {
              const isLate = enq.next_follow_up && enq.next_follow_up < todayStr;
              const item = items.find((i) => i.id === enq.item_id);
              const inStock = item?.pieces_in_stock || 0;
              const isShort = inStock < (enq.pieces_wanted || 0);

              return (
                <div
                  key={enq.id}
                  className="bg-white p-3.5 rounded-2xl border border-[#E5DFD1] flex items-center justify-between shadow-xs"
                >
                  <div className="pr-2 min-w-0">
                    <h5 className="font-bold text-sm text-[#19221E] truncate">
                      {enq.contact_name}
                    </h5>
                    <p className="text-xs text-[#56645E] mt-0.5 truncate">
                      <span>{item?.name || 'Item'}</span>
                      <span> · {enq.pieces_wanted} pcs · </span>
                      {isLate ? (
                        <span className="text-[#C25E1A] font-bold">1 day late</span>
                      ) : isShort ? (
                        <span className="text-[#C25E1A] font-bold">only {inStock} in stock</span>
                      ) : (
                        <span className="text-[#184E3A] font-medium">{inStock} in stock</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {enq.phone && (
                      <a
                        href={`tel:${enq.phone}`}
                        className="w-10 h-10 rounded-full bg-[#F3EFE6] text-[#19221E] flex items-center justify-center hover:bg-[#EAE4D6] transition-colors"
                        title="Call"
                      >
                        <PhoneCall className="w-4 h-4 text-[#56645E]" />
                      </a>
                    )}
                    <button
                      onClick={() =>
                        handleWhatsApp(
                          enq.phone,
                          enq.contact_name,
                          `regarding ${item?.name || 'goods'} ${enq.pieces_wanted} pcs inquiry`
                        )
                      }
                      className="w-10 h-10 rounded-full bg-[#E5EFE7] hover:bg-[#D5E6D8] text-[#184E3A] flex items-center justify-center transition-colors shadow-2xs"
                      title="Message on WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Recent Bills Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-extrabold text-base text-[#19221E] tracking-tight">
            {t.recentBills}
          </h4>
          <span className="text-xs font-semibold text-[#56645E]">
            {recentInvoices.length} {t.recentBills.toLowerCase()}
          </span>
        </div>

        <div className="space-y-2">
          {recentInvoices.length === 0 ? (
            <div className="bg-white p-5 rounded-2xl border border-[#E5DFD1] text-center space-y-1">
              <p className="text-xs font-bold text-[#19221E]">No bills created yet.</p>
              <p className="text-[11px] text-[#56645E]">
                Tap &quot;New Bill&quot; above to create your first digital bill (#{business.next_bill_no}).
              </p>
            </div>
          ) : (
            recentInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => handleOpenInvoice(inv)}
                className="w-full text-left bg-white p-3.5 rounded-2xl border border-[#E5DFD1] hover:border-[#D0C6B4] flex items-center justify-between transition-all active:scale-[0.99] shadow-xs group"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-[#19221E]">
                      #{inv.bill_no}
                    </span>
                    <span className="text-sm text-[#56645E]">·</span>
                    <span className="font-bold text-sm text-[#19221E] truncate">
                      {inv.buyer_name}
                    </span>
                    {inv.status === 'cancelled' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 ml-1">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#56645E] mt-0.5 truncate">
                    {new Date(inv.bill_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {inv.transporter_name ? ` · ${inv.transporter_name}` : ''}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-[#19221E] group-hover:text-[#184E3A] transition-colors">
                    {formatCurrency(inv.total)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#A8A29E] inline-block ml-1" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
