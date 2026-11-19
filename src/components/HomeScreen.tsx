// src/components/HomeScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatCurrency, formatIndianNumber } from '@/lib/formatters';
import { todayIST } from '@/lib/dates';
import {
  Plus,
  MessageCircle,
  ChevronRight,
  AlertCircle,
  PhoneCall,
  Sparkles,
  TrendingUp,
  Package,
  Clock,
  Printer,
  FileText,
  BadgeAlert,
} from 'lucide-react';
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
  const totalStockKg = items.reduce(
    (sum, item) => sum + (item.pieces_in_stock || 0) * (item.kg_per_piece || 0),
    0
  );
  const totalStockQuintals = (totalStockKg / 100).toFixed(1);

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

  // Today's billed totals
  const todayInvoices = invoices.filter(
    (inv) => inv.status !== 'cancelled' && inv.bill_date.startsWith(todayStr)
  );
  const todayTotalSales = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Recent active invoices
  const recentInvoices = invoices.slice(0, 6);

  const handleOpenInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setActiveView('invoice-view');
  };

  const handleWhatsApp = (phone?: string, contactName?: string, note?: string) => {
    if (!phone) return;
    const cleanDigits = phone.replace(/[^\d]/g, '');
    const normalizedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const greeting = language === 'hi' ? 'नमस्ते' : 'Namaste';
    const msg = `${greeting} ${contactName || 'ji'}, ${
      note || `${business.name} se sampark kar rahe hain. Stock aur rate update ke liye batayein.`
    }`;
    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="pb-16 pt-1 space-y-6 animate-fade-in">
      {/* Onboarding Banner if not completed */}
      {!business.is_onboarded && (
        <div className="bg-[#E7EFE9] border border-[#184E3A]/20 p-4 rounded-3xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#184E3A] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#184E3A]">
                {language === 'hi' ? 'अपनी मंडी फर्म सेटअप करें' : 'Setup your Mandi Firm'}
              </p>
              <p className="text-xs text-[#56645E]">
                {language === 'hi'
                  ? 'Tally बिलों के लिए पता, GSTIN और बैंक विवरण कॉन्फ़िगर करें'
                  : 'Configure address, GSTIN and bank details for authentic Tally bills'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-4 py-2 bg-[#184E3A] hover:bg-[#123E2E] text-white rounded-xl text-xs font-black shrink-0 transition-colors shadow-2xs"
          >
            {language === 'hi' ? 'सेटअप' : 'Setup'}
          </button>
        </div>
      )}

      {/* Responsive Grid: 1-col on mobile, 12-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ================= LEFT MAIN COLUMN (Col 7 on Desktop) ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Greeting & Date Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#C25E1A] bg-[#FCEFE7] px-2 py-0.5 rounded-full">
                  Mandi Trading Desk
                </span>
                <span className="text-xs text-[#56645E] font-medium hidden sm:inline">·</span>
                <span className="text-xs text-[#56645E] font-semibold hidden sm:inline">
                  {business.name || 'RTC Mandi'}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#19221E] tracking-tight mt-1">
                {t.namaste}
              </h2>
              <p className="text-sm font-semibold text-[#56645E] capitalize mt-0.5">
                {todayDisplay}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#E5DFD1] text-xs font-bold text-[#19221E] self-start sm:self-auto shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bill Series #{business.bill_prefix || 'RTC'}-{business.next_bill_no}</span>
            </div>
          </div>

          {/* Hero Action Card: New Bill (Bolder & High Impact) */}
          <button
            onClick={() => setActiveView('bill-new')}
            className="w-full text-left bg-gradient-to-br from-[#184E3A] via-[#123E2E] to-[#0A241A] text-white p-6 sm:p-7 rounded-3xl shadow-md hover:shadow-xl transition-all transform active:scale-[0.99] group relative overflow-hidden ring-1 ring-black/5"
          >
            {/* Subtle decorative grain background element */}
            <div className="absolute right-0 top-0 -mr-8 -mt-8 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-white/25 group-hover:scale-105 transition-all shadow-inner">
                  <Plus className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.5]" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200">
                    <span>{language === 'hi' ? 'त्वरित मंडी पर्चा' : 'Instant Mandi Billing'}</span>
                    <span className="hidden sm:inline bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-mono">
                      F2 / N
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mt-0.5">
                    {t.newBill}
                  </h3>
                  <p className="text-sm font-medium text-emerald-100/90 mt-0.5">
                    {t.newBillHindi} · 30 Seconds Speed Billing
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80 block">
                  {t.nextBill}
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white">
                  #{business.next_bill_no}
                </span>
              </div>
            </div>
          </button>

          {/* Mandi Metrics Cockpit Grid (Stock, Follow-ups, Today's Billing) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Stock Card */}
            <button
              onClick={() => setActiveView('stock')}
              className="text-left bg-white p-4 sm:p-5 rounded-3xl border border-[#E5DFD1] hover:border-[#C8BFAC] hover:shadow-sm transition-all active:scale-[0.98] shadow-xs group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#56645E]">
                  {t.stock} · {t.stockHindi}
                </span>
                <Package className="w-4 h-4 text-[#184E3A] group-hover:scale-110 transition-transform" />
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black font-mono text-[#19221E] tracking-tight">
                  {formatIndianNumber(totalStockPieces)}
                </span>
                <span className="text-xs font-extrabold text-[#56645E]">{t.pcs}</span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-[#56645E] pt-2 border-t border-[#F2ECE1]">
                <span>{totalStockQuintals} Qtl</span>
                {lowStockCount > 0 ? (
                  <span className="text-[#C25E1A] font-extrabold flex items-center gap-1">
                    <BadgeAlert className="w-3.5 h-3.5" />
                    {lowStockCount} {t.lowStock}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold">In Stock</span>
                )}
              </div>
            </button>

            {/* Follow-ups Card */}
            <button
              onClick={() => setActiveView('follow-ups')}
              className="text-left bg-[#FCF8EE] p-4 sm:p-5 rounded-3xl border border-[#EADBCA] hover:border-[#D0B99B] hover:shadow-sm transition-all active:scale-[0.98] shadow-xs group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#8C3D0E]">
                  {t.followUps} · {t.followUpsHindi}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#C25E1A] animate-ping" />
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black font-mono text-[#C25E1A] tracking-tight">
                  {dueTodayEnquiries.length}
                </span>
                <span className="text-xs font-extrabold text-[#C25E1A]">{t.dueToday}</span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-[#8C3D0E] pt-2 border-t border-[#EADBCA]/60">
                <span>{overdueCount > 0 ? `${overdueCount} Overdue` : 'All Caught Up'}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Today's Mandi Sales Card */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5DFD1] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#56645E]">
                  Today&apos;s Billed
                </span>
                <TrendingUp className="w-4 h-4 text-[#184E3A]" />
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#184E3A] tracking-tight">
                  {formatCurrency(todayTotalSales)}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-[#56645E] pt-2 border-t border-[#F2ECE1]">
                <span>{todayInvoices.length} Bills Today</span>
                <span className="text-emerald-700 font-bold">Active</span>
              </div>
            </div>
          </div>

          {/* Mandi Commodity Rates Quick Board */}
          <div className="bg-white rounded-3xl border border-[#E5DFD1] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2ECE1]">
              <div>
                <h4 className="font-extrabold text-sm text-[#19221E] uppercase tracking-wider">
                  Live Mandi Commodities &amp; Rates
                </h4>
                <p className="text-xs text-[#56645E]">
                  {language === 'hi' ? 'वर्तमान भाव व उपलब्ध बोरी' : 'Current rates & stock in warehouse'}
                </p>
              </div>
              <button
                onClick={() => setActiveView('stock')}
                className="text-xs font-extrabold text-[#184E3A] hover:underline"
              >
                {t.seeAll} ({items.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3.5">
              {items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F9F6F0] border border-[#E5DFD1]/80 hover:bg-[#F2EDE1] transition-colors"
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-[#19221E] truncate">{item.name}</h5>
                    <span className="text-[11px] font-medium text-[#56645E]">
                      {item.kg_per_piece} kg bag ·{' '}
                      <span className="font-bold text-[#19221E]">{item.pieces_in_stock} pcs</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black font-mono text-[#184E3A] block">
                      ₹{formatIndianNumber(item.default_rate || 0)}
                    </span>
                    <span className="text-[10px] font-semibold text-[#56645E]">
                      {item.rate_unit === 'per_quintal' ? '/ Qtl' : item.rate_unit === 'per_kg' ? '/ Kg' : '/ Bag'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (Col 5 on Desktop): Follow-ups & Recent Bills ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Follow-ups & Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-base text-[#19221E] tracking-tight">
                  {t.callOrMessageToday}
                </h4>
                <span className="w-5 h-5 rounded-full bg-[#C25E1A] text-white text-[11px] font-black flex items-center justify-center">
                  {dueTodayEnquiries.length}
                </span>
              </div>
              <button
                onClick={() => setActiveView('follow-ups')}
                className="text-xs font-extrabold text-[#184E3A] hover:underline"
              >
                {t.seeAll}
              </button>
            </div>

            <div className="space-y-2.5">
              {dueTodayEnquiries.length === 0 ? (
                <div className="bg-white p-5 rounded-3xl border border-[#E5DFD1] text-center text-xs text-[#56645E]">
                  <p className="font-bold text-[#19221E]">No follow-ups due today</p>
                  <p className="mt-0.5">All customer inquiries are addressed.</p>
                </div>
              ) : (
                dueTodayEnquiries.slice(0, 3).map((enq) => {
                  const isLate = enq.next_follow_up && enq.next_follow_up < todayStr;
                  const item = items.find((i) => i.id === enq.item_id);
                  const inStock = item?.pieces_in_stock || 0;
                  const isShort = inStock < (enq.pieces_wanted || 0);

                  return (
                    <div
                      key={enq.id}
                      className="bg-white p-4 rounded-3xl border border-[#E5DFD1] hover:border-[#D0C6B4] flex items-center justify-between shadow-xs transition-all"
                    >
                      <div className="pr-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-extrabold text-sm text-[#19221E] truncate">
                            {enq.contact_name}
                          </h5>
                          {isLate && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#FCEFE7] text-[#C25E1A]">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#56645E] mt-0.5 truncate">
                          <span className="font-medium">{item?.name || 'Goods'}</span>
                          <span> · {enq.pieces_wanted} pcs · </span>
                          {isShort ? (
                            <span className="text-[#C25E1A] font-bold">Only {inStock} in stock</span>
                          ) : (
                            <span className="text-[#184E3A] font-bold">{inStock} in stock</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {enq.phone && (
                          <a
                            href={`tel:${enq.phone}`}
                            className="w-9 h-9 rounded-full bg-[#F3EFE6] text-[#19221E] flex items-center justify-center hover:bg-[#EAE4D6] transition-colors"
                            title="Call Buyer"
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
                          className="w-9 h-9 rounded-full bg-[#E5EFE7] hover:bg-[#D5E6D8] text-[#184E3A] flex items-center justify-center transition-colors shadow-2xs"
                          title="Message on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Active Invoices with Tally Slip Quick View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-extrabold text-base text-[#19221E] tracking-tight">
                {t.recentBills}
              </h4>
              <span className="text-xs font-semibold text-[#56645E]">
                {recentInvoices.length} {t.recentBills.toLowerCase()}
              </span>
            </div>

            <div className="space-y-2.5">
              {recentInvoices.length === 0 ? (
                <div className="bg-white p-5 rounded-3xl border border-[#E5DFD1] text-center space-y-1">
                  <p className="text-xs font-bold text-[#19221E]">No bills created yet.</p>
                  <p className="text-[11px] text-[#56645E]">
                    Tap &quot;New Bill&quot; above to create your first digital mandi invoice.
                  </p>
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleOpenInvoice(inv)}
                    className="w-full text-left bg-white p-4 rounded-3xl border border-[#E5DFD1] hover:border-[#C8BFAC] hover:shadow-xs flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-[#184E3A] bg-[#E7EFE9] px-2 py-0.5 rounded-lg">
                          #{inv.bill_no}
                        </span>
                        <span className="font-extrabold text-sm text-[#19221E] truncate">
                          {inv.buyer_name}
                        </span>
                        {inv.status === 'cancelled' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            Cancelled
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[#56645E] mt-1 truncate">
                        {new Date(inv.bill_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {inv.transporter_name ? ` · ${inv.transporter_name}` : ''}
                        {inv.lines?.[0] ? ` · ${inv.lines[0].pieces} bags ${inv.lines[0].item_name}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span className="text-sm font-black font-mono text-[#19221E] group-hover:text-[#184E3A] transition-colors block">
                          {formatCurrency(inv.total)}
                        </span>
                        <span className="text-[10px] text-[#56645E] font-semibold">Tally Bill</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#A8A29E] group-hover:translate-x-0.5 group-hover:text-[#184E3A] transition-transform" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
