// src/components/FollowUpsScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatIndianNumber } from '@/lib/formatters';
import { todayIST } from '@/lib/dates';
import { AddEnquirySheet } from '@/components/AddEnquirySheet';
import {
  MessageCircle,
  Phone,
  Clock,
  Check,
  Plus,
  AlertCircle,
  Search,
  Send,
  User,
  Sparkles,
} from 'lucide-react';
import { Enquiry } from '@/types';

export function FollowUpsScreen() {
  const { language, enquiries, items, business, updateEnquiryStatus, snoozeEnquiry, setActiveView } = useJamabook();
  const t = getT(language);

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'done'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEnquiryOpen, setIsAddEnquiryOpen] = useState(false);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);

  const [todayStr, setTodayStr] = useState('2026-11-19');

  useEffect(() => {
    setTodayStr(todayIST());
  }, []);

  // Partition enquiries into Today, Upcoming, and Done
  const todayEnquiries = enquiries.filter(
    (e) => e.status === 'open' && e.next_follow_up && e.next_follow_up <= todayStr
  );
  const upcomingEnquiries = enquiries.filter(
    (e) => e.status === 'open' && e.next_follow_up && e.next_follow_up > todayStr
  );
  const doneEnquiries = enquiries.filter(
    (e) => e.status === 'won' || e.status === 'lost' || e.status === 'quoted'
  );

  const currentPartition =
    activeTab === 'today'
      ? todayEnquiries
      : activeTab === 'upcoming'
      ? upcomingEnquiries
      : doneEnquiries;

  const currentList = currentPartition.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const item = items.find((i) => i.id === e.item_id);
    return (
      e.contact_name.toLowerCase().includes(q) ||
      (e.phone && e.phone.includes(q)) ||
      (item && item.name.toLowerCase().includes(q))
    );
  });

  const activeEnquiry =
    enquiries.find((e) => e.id === selectedEnquiryId) || currentList[0] || enquiries[0];

  const handleWhatsApp = (enq: Enquiry, customNote?: string) => {
    const rawPhone = (enq.phone || '').replace(/[^\d]/g, '');
    if (!rawPhone) {
      alert('No phone number recorded for this contact.');
      return;
    }
    const normalizedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const item = items.find((i) => i.id === enq.item_id);
    const greeting = language === 'hi' ? 'नमस्ते' : 'Namaste';
    const msg =
      customNote ||
      `${greeting} ${enq.contact_name} ji,\nRegarding your inquiry for ${enq.pieces_wanted} pcs of ${item?.name || 'goods'}.\nWe have stock ready for immediate delivery. Current rate is ₹${formatIndianNumber(item?.default_rate || 0)}/${item?.rate_unit === 'per_quintal' ? 'qtl' : 'bag'}.\nShould we book and dispatch today? - ${business.name}`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const getAskedLabel = (createdAt: string) => {
    try {
      const nowMs = new Date(todayStr).getTime();
      const createdMs = new Date(createdAt).getTime();
      const diffDays = Math.floor((nowMs - createdMs) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Asked today';
      if (diffDays === 1) return 'Asked yesterday';
      return `Asked ${diffDays} days ago`;
    } catch {
      return 'Asked recently';
    }
  };

  return (
    <div className="pb-28 lg:pb-12 pt-1 space-y-6 animate-fade-in relative min-h-[85vh]">
      {/* 1. Header with Add Enquiry CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#C25E1A] dark:text-[#E06D24] bg-[#FCEFE7] dark:bg-[#2D1B11] px-2.5 py-0.5 rounded-full">
              Khata &amp; Buyer Inquiries
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#19221E] dark:text-[#F0F4F2] tracking-tight mt-1">
            {t.followUps} · {t.followUpsHindi}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#56645E] dark:text-[#8E9F97] mt-0.5">
            WhatsApp buyer follow-ups, price inquiries, and payment reminders
          </p>
        </div>

        <button
          onClick={() => setIsAddEnquiryOpen(true)}
          className="px-4 py-2.5 bg-[#C25E1A] hover:bg-[#A84F14] text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Log Buyer Enquiry</span>
        </button>
      </div>

      {/* 2. Filter Bar: Segmented Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-1 bg-[#F1EBE1] dark:bg-[#131B17] p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-2 px-4 text-xs font-black rounded-xl transition-all ${
              activeTab === 'today'
                ? 'bg-[#184E3A] dark:bg-[#226E52] text-white shadow-xs'
                : 'text-[#56645E] dark:text-[#8E9F97] hover:text-[#19221E] dark:hover:text-[#F0F4F2]'
            }`}
          >
            {t.today} ({todayEnquiries.length})
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-2 px-4 text-xs font-black rounded-xl transition-all ${
              activeTab === 'upcoming'
                ? 'bg-[#184E3A] dark:bg-[#226E52] text-white shadow-xs'
                : 'text-[#56645E] dark:text-[#8E9F97] hover:text-[#19221E] dark:hover:text-[#F0F4F2]'
            }`}
          >
            {t.upcoming} ({upcomingEnquiries.length})
          </button>

          <button
            onClick={() => setActiveTab('done')}
            className={`py-2 px-4 text-xs font-black rounded-xl transition-all ${
              activeTab === 'done'
                ? 'bg-[#184E3A] dark:bg-[#226E52] text-white shadow-xs'
                : 'text-[#56645E] dark:text-[#8E9F97] hover:text-[#19221E] dark:hover:text-[#F0F4F2]'
            }`}
          >
            {t.done} ({doneEnquiries.length})
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#7A8881] dark:text-[#8E9F97] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search buyer or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#18221D] border border-[#E5DFD1] dark:border-[#27362E] text-[#19221E] dark:text-[#F0F4F2] rounded-2xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:border-[#184E3A]"
          />
        </div>
      </div>

      {/* Responsive Grid: 1-col on mobile, 12-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ================= LEFT MAIN: ENQUIRY LIST (Col 7 on Desktop) ================= */}
        <div className="lg:col-span-7 space-y-3.5">
          {currentList.length === 0 ? (
            <div className="bg-white dark:bg-[#18221D] p-8 rounded-3xl border border-[#E5DFD1] dark:border-[#27362E] text-center space-y-2 shadow-xs">
              <p className="text-sm font-bold text-[#19221E] dark:text-[#F0F4F2]">
                {activeTab === 'today'
                  ? 'No follow-ups due today!'
                  : activeTab === 'upcoming'
                  ? 'No upcoming inquiries scheduled.'
                  : 'No completed inquiries yet.'}
              </p>
              <p className="text-xs text-[#56645E] dark:text-[#8E9F97]">
                Tap &quot;+ Log Buyer Enquiry&quot; above to add buyers who called or messaged you on WhatsApp.
              </p>
            </div>
          ) : (
            currentList.map((enq) => {
              const item = items.find((i) => i.id === enq.item_id);
              const inStock = item?.pieces_in_stock || 0;
              const piecesWanted = enq.pieces_wanted || 0;
              const isShort = inStock < piecesWanted;
              const isLate = enq.next_follow_up && enq.next_follow_up < todayStr;
              const isSelected = activeEnquiry?.id === enq.id;

              return (
                <div
                  key={enq.id}
                  onClick={() => setSelectedEnquiryId(enq.id)}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer shadow-xs space-y-3 relative ${
                    isSelected
                      ? 'border-[#C25E1A] dark:border-[#E06D24] ring-2 ring-[#C25E1A]/20 dark:ring-[#E06D24]/20 bg-[#FDFAF4] dark:bg-[#201812]'
                      : 'bg-white dark:bg-[#18221D] border-[#E5DFD1] dark:border-[#27362E] hover:border-[#D0C6B4] dark:hover:border-[#384C41]'
                  }`}
                >
                  {/* Top Row: Buyer Name & Urgency Badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-[#19221E] dark:text-[#F0F4F2] leading-tight">
                          {enq.contact_name}
                        </h3>
                        {isSelected && (
                          <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-[#C25E1A] dark:bg-[#E06D24]" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#19221E] dark:text-[#F0F4F2] mt-1">
                        Inquiry: <span className="font-extrabold text-[#184E3A] dark:text-emerald-400">{item?.name || 'Item'}</span> ·{' '}
                        {piecesWanted} bags
                      </p>
                    </div>

                    {isLate && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#C25E1A] dark:bg-[#E06D24] text-white text-[11px] font-extrabold tracking-wide shrink-0">
                        1 day late
                      </span>
                    )}
                  </div>

                  {/* Stock status indicator pill */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        isShort ? 'bg-[#FCEFE7] text-[#C25E1A]' : 'bg-[#E7EFE9] text-[#184E3A]'
                      }`}
                    >
                      {isShort ? (
                        <>Only {inStock} in stock · {piecesWanted - inStock} short</>
                      ) : (
                        <>In stock: {inStock} bags · Ready</>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-[#8C9892]">
                      {getAskedLabel(enq.created_at)}
                    </span>
                  </div>

                  {/* Actions Row: WhatsApp, Call, Snooze, Done */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#F2ECE1]">
                    {/* Primary WhatsApp Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsApp(enq);
                      }}
                      className="flex-1 bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>WhatsApp Message</span>
                    </button>

                    {/* Phone Call */}
                    {enq.phone ? (
                      <a
                        href={`tel:${enq.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-10 rounded-2xl bg-[#F9F6F0] border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] flex items-center justify-center transition-colors shadow-2xs shrink-0"
                        title="Call Buyer"
                      >
                        <Phone className="w-4 h-4 text-[#56645E]" />
                      </a>
                    ) : null}

                    {/* Snooze Picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSnoozeTargetId(snoozeTargetId === enq.id ? null : enq.id);
                        }}
                        className="w-10 h-10 rounded-2xl bg-[#F9F6F0] border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] flex items-center justify-center transition-colors shadow-2xs shrink-0"
                        title="Snooze"
                      >
                        <Clock className="w-4 h-4 text-[#56645E]" />
                      </button>

                      {snoozeTargetId === enq.id && (
                        <div className="absolute right-0 bottom-12 z-30 bg-white border border-[#D9D2C3] rounded-2xl p-2 shadow-xl space-y-1 w-32 animate-in zoom-in-95">
                          <span className="text-[10px] font-bold text-[#56645E] block px-2 py-0.5 uppercase">
                            Snooze to
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              snoozeEnquiry(enq.id, 1);
                              setSnoozeTargetId(null);
                            }}
                            className="w-full text-left p-1.5 rounded-xl text-xs font-bold text-[#19221E] hover:bg-[#E7EFE9] hover:text-[#184E3A]"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              snoozeEnquiry(enq.id, 3);
                              setSnoozeTargetId(null);
                            }}
                            className="w-full text-left p-1.5 rounded-xl text-xs font-bold text-[#19221E] hover:bg-[#E7EFE9] hover:text-[#184E3A]"
                          >
                            3 days
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              snoozeEnquiry(enq.id, 7);
                              setSnoozeTargetId(null);
                            }}
                            className="w-full text-left p-1.5 rounded-xl text-xs font-bold text-[#19221E] hover:bg-[#E7EFE9] hover:text-[#184E3A]"
                          >
                            Next week
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mark Won / Checkmark */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateEnquiryStatus(enq.id, 'won');
                      }}
                      className="w-10 h-10 rounded-2xl bg-[#F9F6F0] border border-[#D9D2C3] hover:bg-[#E7EFE9] hover:border-[#184E3A] text-[#19221E] hover:text-[#184E3A] flex items-center justify-center transition-colors shadow-2xs shrink-0"
                      title="Mark Won"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ================= RIGHT COLUMN: WHATSAPP DRAWER & TEMPLATES (Col 5 on Desktop) ================= */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#184E3A] dark:text-emerald-400" />
              <h4 className="font-extrabold text-sm text-[#19221E] dark:text-[#F0F4F2] uppercase tracking-wider">
                Mandi Message Templates
              </h4>
            </div>
            <span className="text-[11px] font-bold text-[#184E3A] dark:text-emerald-400 bg-[#E7EFE9] dark:bg-[#1A3428] px-2 py-0.5 rounded-full">
              1-Click Send
            </span>
          </div>

          {activeEnquiry ? (
            <div className="bg-white dark:bg-[#18221D] p-5 rounded-3xl border border-[#E5DFD1] dark:border-[#27362E] shadow-xs space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-[#F2ECE1] dark:border-[#27362E]">
                <div>
                  <h4 className="font-black text-base text-[#19221E] dark:text-[#F0F4F2]">{activeEnquiry.contact_name}</h4>
                  <p className="text-xs text-[#56645E] dark:text-[#8E9F97]">Ph: {activeEnquiry.phone || 'No phone'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('bill-new')}
                  className="px-3 py-1.5 bg-[#184E3A] dark:bg-[#226E52] text-white rounded-xl text-xs font-black hover:bg-[#123E2E] dark:hover:bg-[#1A5741]"
                >
                  Convert to Bill
                </button>
              </div>

              {/* Template Options */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97]">Select WhatsApp message template:</p>

                {/* Template 1: Stock Ready */}
                <div
                  onClick={() => {
                    const item = items.find((i) => i.id === activeEnquiry.item_id);
                    handleWhatsApp(
                      activeEnquiry,
                      `नमस्ते ${activeEnquiry.contact_name} जी,\nआपके द्वारा पूछे गए ${activeEnquiry.pieces_wanted} बोरी ${item?.name || 'माल'} का स्टॉक उपलब्ध है। आज का भाव ₹${formatIndianNumber(item?.default_rate || 0)}/${item?.rate_unit === 'per_quintal' ? 'क्विंटल' : 'बोरी'} है। क्या आज गाड़ी लोड करवा दें? - ${business.name}`
                    );
                  }}
                  className="p-3 rounded-2xl bg-[#F9F6F0] dark:bg-[#131B17] hover:bg-[#F0ECE1] dark:hover:bg-[#19241F] border border-[#E5DFD1] dark:border-[#27362E] cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#184E3A] dark:text-emerald-400">1. स्टॉक उपलब्ध व भाव कन्फर्मेशन</span>
                    <Send className="w-3.5 h-3.5 text-[#184E3A] dark:text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-[#56645E] dark:text-[#8E9F97] line-clamp-2">
                    नमस्ते ji, आपके द्वारा पूछे गए माल का स्टॉक उपलब्ध है। आज का भाव...
                  </p>
                </div>

                {/* Template 2: Payment Reminder */}
                <div
                  onClick={() => {
                    handleWhatsApp(
                      activeEnquiry,
                      `नमस्ते ${activeEnquiry.contact_name} जी,\n${business.name} से विनती है कि पुराने बिल का बकाया भुगतान आज करवा दें ताकि अगली गाड़ी बिना रुकावट भेजी जा सके। खाता विवरण: ${business.bank_name || 'SBI'} A/c ${business.bank_account || '39981029482'}। धन्यवाद!`
                    );
                  }}
                  className="p-3 rounded-2xl bg-[#F9F6F0] dark:bg-[#131B17] hover:bg-[#F0ECE1] dark:hover:bg-[#19241F] border border-[#E5DFD1] dark:border-[#27362E] cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#C25E1A] dark:text-[#E06D24]">2. खाता तगादा व भुगतान स्मरण</span>
                    <Send className="w-3.5 h-3.5 text-[#C25E1A] dark:text-[#E06D24]" />
                  </div>
                  <p className="text-[11px] text-[#56645E] dark:text-[#8E9F97] line-clamp-2">
                    पुराने बिल का बकाया भुगतान आज करवा दें ताकि अगली गाड़ी बिना रुकावट भेजी जा सके...
                  </p>
                </div>
              </div>

              {/* Direct Open in WhatsApp Button */}
              <button
                type="button"
                onClick={() => handleWhatsApp(activeEnquiry)}
                className="w-full py-3 bg-[#184E3A] hover:bg-[#123E2E] dark:bg-[#226E52] dark:hover:bg-[#1A5741] text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Open in WhatsApp</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#18221D] p-6 rounded-3xl border border-[#E5DFD1] dark:border-[#27362E] text-center text-xs text-[#56645E] dark:text-[#8E9F97]">
              Select an inquiry on the left to see WhatsApp templates.
            </div>
          )}
        </div>
      </div>

      {/* Add Enquiry Bottom Sheet */}
      <AddEnquirySheet
        isOpen={isAddEnquiryOpen}
        onClose={() => setIsAddEnquiryOpen(false)}
      />
    </div>
  );
}
