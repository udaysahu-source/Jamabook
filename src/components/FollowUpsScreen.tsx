// src/components/FollowUpsScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatIndianNumber } from '@/lib/formatters';
import { todayIST } from '@/lib/dates';
import { AddEnquirySheet } from '@/components/AddEnquirySheet';
import { MessageCircle, Phone, Clock, Check, Plus, AlertCircle } from 'lucide-react';
import { Enquiry } from '@/types';

export function FollowUpsScreen() {
  const { language, enquiries, items, business, updateEnquiryStatus, snoozeEnquiry } = useJamabook();
  const t = getT(language);

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'done'>('today');
  const [isAddEnquiryOpen, setIsAddEnquiryOpen] = useState(false);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);

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

  const currentList =
    activeTab === 'today'
      ? todayEnquiries
      : activeTab === 'upcoming'
      ? upcomingEnquiries
      : doneEnquiries;

  const handleWhatsApp = (enq: Enquiry) => {
    const rawPhone = (enq.phone || '').replace(/[^\d]/g, '');
    if (!rawPhone) {
      alert('No phone number recorded for this contact.');
      return;
    }
    const normalizedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const item = items.find((i) => i.id === enq.item_id);
    const greeting = language === 'hi' ? 'नमस्ते' : 'Namaste';
    const msg = `${greeting} ${enq.contact_name} ji,\nRegarding your inquiry for ${enq.pieces_wanted} pcs of ${item?.name || 'goods'}.\nWe have stock ready for immediate delivery. Current rate is ₹${formatIndianNumber(item?.default_rate || 0)}/${item?.rate_unit === 'per_quintal' ? 'qtl' : 'bag'}.\nShould we book and dispatch today? - ${business.name}`;

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
    <div className="pb-28 pt-2 space-y-4 animate-fade-in relative min-h-[85vh]">
      {/* 1. Header */}
      <div>
        <h2 className="text-3xl font-black text-[#19221E] tracking-tight">
          {t.followUps} · {t.followUpsHindi}
        </h2>
        <p className="text-xs font-semibold text-[#56645E] mt-0.5">
          Buyers who asked on WhatsApp
        </p>
      </div>

      {/* 2. Segmented Filter Tabs (Matching Screen 6) */}
      <div className="grid grid-cols-3 gap-1 bg-[#F1EBE1] p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('today')}
          className={`py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'today'
              ? 'bg-[#184E3A] text-white shadow-xs'
              : 'text-[#56645E] hover:text-[#19221E]'
          }`}
        >
          {t.today} · {todayEnquiries.length}
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'upcoming'
              ? 'bg-[#184E3A] text-white shadow-xs'
              : 'text-[#56645E] hover:text-[#19221E]'
          }`}
        >
          {t.upcoming} · {upcomingEnquiries.length}
        </button>

        <button
          onClick={() => setActiveTab('done')}
          className={`py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'done'
              ? 'bg-[#184E3A] text-white shadow-xs'
              : 'text-[#56645E] hover:text-[#19221E]'
          }`}
        >
          {t.done}
        </button>
      </div>

      {/* 3. Enquiries Cards List (Matching Screen 6) */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#E5DFD1] text-center space-y-2">
            <p className="text-sm font-bold text-[#19221E]">
              {activeTab === 'today'
                ? 'No follow-ups due today!'
                : activeTab === 'upcoming'
                ? 'No upcoming inquiries scheduled.'
                : 'No completed inquiries yet.'}
            </p>
            <p className="text-xs text-[#56645E]">
              Tap &quot;+ Add enquiry&quot; to log buyers who messaged you on WhatsApp.
            </p>
          </div>
        ) : (
          currentList.map((enq) => {
            const item = items.find((i) => i.id === enq.item_id);
            const inStock = item?.pieces_in_stock || 0;
            const piecesWanted = enq.pieces_wanted || 0;
            const isShort = inStock < piecesWanted;
            const isLate = enq.next_follow_up && enq.next_follow_up < todayStr;

            return (
              <div
                key={enq.id}
                className="bg-white p-4 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3 relative"
              >
                {/* Top Row: Buyer Name & Urgency Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-[#19221E] leading-tight">
                      {enq.contact_name}
                    </h3>
                    <p className="text-xs font-bold text-[#19221E] mt-1">
                      Wants <span className="font-extrabold">{item?.name || 'Item'}</span> ·{' '}
                      {piecesWanted} pcs
                    </p>
                  </div>

                  {isLate && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#C25E1A] text-white text-[11px] font-extrabold tracking-wide shrink-0">
                      1 day late
                    </span>
                  )}
                </div>

                {/* Stock status indicator pill */}
                <div className="flex items-center gap-2">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                      isShort
                        ? 'bg-[#FCEFE7] text-[#C25E1A]'
                        : 'bg-[#E7EFE9] text-[#184E3A]'
                    }`}
                  >
                    {isShort ? (
                      <>Only {inStock} in stock · {piecesWanted - inStock} short</>
                    ) : (
                      <>In stock: {inStock} pcs · enough</>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-[#8C9892]">
                    {getAskedLabel(enq.created_at)}
                  </span>
                </div>

                {/* Actions Row: WhatsApp, Call, Snooze, Done */}
                <div className="flex items-center gap-2 pt-1">
                  {/* Big Primary WhatsApp Button */}
                  <button
                    onClick={() => handleWhatsApp(enq)}
                    className="flex-1 bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Phone Call */}
                  {enq.phone ? (
                    <a
                      href={`tel:${enq.phone}`}
                      className="w-11 h-11 rounded-2xl bg-white border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] flex items-center justify-center transition-colors shadow-2xs shrink-0"
                      title="Call"
                    >
                      <Phone className="w-4 h-4 text-[#56645E]" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-11 h-11 rounded-2xl bg-[#F8F5EE] border border-[#E5DFD1] text-[#C7BFB1] flex items-center justify-center shrink-0 cursor-not-allowed"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}

                  {/* Snooze Picker */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setSnoozeTargetId(snoozeTargetId === enq.id ? null : enq.id)
                      }
                      className="w-11 h-11 rounded-2xl bg-white border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] flex items-center justify-center transition-colors shadow-2xs shrink-0"
                      title="Snooze / Reschedule"
                    >
                      <Clock className="w-4 h-4 text-[#56645E]" />
                    </button>

                    {snoozeTargetId === enq.id && (
                      <div className="absolute right-0 bottom-12 z-30 bg-white border border-[#D9D2C3] rounded-2xl p-2 shadow-xl space-y-1 w-32 animate-in zoom-in-95">
                        <span className="text-[10px] font-bold text-[#56645E] block px-2 py-0.5 uppercase">
                          Snooze to
                        </span>
                        <button
                          onClick={() => {
                            snoozeEnquiry(enq.id, 1);
                            setSnoozeTargetId(null);
                          }}
                          className="w-full text-left p-1.5 rounded-xl text-xs font-bold text-[#19221E] hover:bg-[#E7EFE9] hover:text-[#184E3A]"
                        >
                          Tomorrow
                        </button>
                        <button
                          onClick={() => {
                            snoozeEnquiry(enq.id, 3);
                            setSnoozeTargetId(null);
                          }}
                          className="w-full text-left p-1.5 rounded-xl text-xs font-bold text-[#19221E] hover:bg-[#E7EFE9] hover:text-[#184E3A]"
                        >
                          3 days
                        </button>
                        <button
                          onClick={() => {
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

                  {/* Mark Done Checkmark */}
                  <button
                    onClick={() => updateEnquiryStatus(enq.id, 'won')}
                    className="w-11 h-11 rounded-2xl bg-white border border-[#D9D2C3] hover:bg-[#E7EFE9] hover:border-[#184E3A] text-[#19221E] hover:text-[#184E3A] flex items-center justify-center transition-colors shadow-2xs shrink-0"
                    title="Mark Done / Won"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Floating Action Button: + Add Enquiry (Terracotta Pill) */}
      <div className="fixed bottom-20 right-4 z-40 max-w-md">
        <button
          onClick={() => setIsAddEnquiryOpen(true)}
          className="bg-[#C25E1A] hover:bg-[#A84F14] active:scale-95 text-white px-5 py-3.5 rounded-full font-black text-sm tracking-wide shadow-lg flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>{t.addEnquiry}</span>
        </button>
      </div>

      {/* Add Enquiry Bottom Sheet */}
      <AddEnquirySheet
        isOpen={isAddEnquiryOpen}
        onClose={() => setIsAddEnquiryOpen(false)}
      />
    </div>
  );
}
