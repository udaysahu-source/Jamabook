// src/components/AddEnquirySheet.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { X, Minus, Plus } from 'lucide-react';

interface AddEnquirySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEnquirySheet({ isOpen, onClose }: AddEnquirySheetProps) {
  const { language, parties, items, addEnquiry } = useJamabook();
  const t = getT(language);

  const buyers = parties.filter((p) => p.is_buyer && p.is_active);
  const [buyerName, setBuyerName] = useState(buyers[0]?.name || '');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | undefined>(buyers[0]?.id);
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [pieces, setPieces] = useState<number>(40);
  const [remindOption, setRemindOption] = useState<'today' | 'tomorrow' | '3days' | 'custom'>('tomorrow');
  const [customDate, setCustomDate] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === selectedItemId) || items[0];
  const inStock = currentItem?.pieces_in_stock || 0;
  const isEnough = inStock >= pieces;

  // Calculate target reminder date
  const getReminderDateString = () => {
    const d = new Date();
    if (remindOption === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (remindOption === '3days') d.setDate(d.getDate() + 3);
    else if (remindOption === 'custom' && customDate) return customDate;
    return d.toISOString().split('T')[0];
  };

  const reminderDisplayDate = () => {
    const dateStr = getReminderDateString();
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const handleSelectBuyerChip = (b: typeof buyers[0]) => {
    setBuyerName(b.name);
    setSelectedBuyerId(b.id);
  };

  const handleSave = () => {
    if (!buyerName.trim() || !selectedItemId || pieces <= 0) return;
    const buyerObj = parties.find((p) => p.name === buyerName);
    
    addEnquiry({
      party_id: selectedBuyerId || buyerObj?.id,
      contact_name: buyerName.trim(),
      phone: buyerObj?.phone,
      item_id: selectedItemId,
      pieces_wanted: pieces,
      next_follow_up: getReminderDateString(),
      note: note.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center">
      <div className="bg-[#F8F5EE] rounded-t-[32px] sm:rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 border-t sm:border border-[#E5DFD1] max-h-[90vh] overflow-y-auto">
        {/* Header with pill handle & close button */}
        <div className="text-center relative pt-1">
          <div className="w-10 h-1 bg-[#D9D2C3] rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-[#19221E] tracking-tight">
              {t.addEnquiry} · {t.addEnquiryHindi}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#EAE4D6] text-[#56645E] flex items-center justify-center hover:bg-[#DDD6C5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. Who messaged you? */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#56645E] block">
            {t.whoMessaged}
          </label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => {
              setBuyerName(e.target.value);
              setSelectedBuyerId(undefined);
            }}
            placeholder="Type party name..."
            className="w-full bg-white border border-[#D9D2C3] rounded-2xl p-3 text-base font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A] shadow-2xs"
          />

          {/* Quick Buyer Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {buyers.slice(0, 3).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBuyerChip(b)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  buyerName === b.name
                    ? 'bg-[#184E3A] text-white shadow-xs'
                    : 'bg-white text-[#19221E] border border-[#E5DFD1] hover:bg-[#F2ECE1]'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Material */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#56645E] block">
            {t.material}
          </label>
          <div className="flex flex-wrap gap-2">
            {items.map((it) => {
              const isSelected = selectedItemId === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelectedItemId(it.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#184E3A] text-white shadow-xs'
                      : 'bg-white text-[#19221E] border border-[#E5DFD1] hover:bg-[#F2ECE1]'
                  }`}
                >
                  {it.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. How many pieces? (Stepper + live stock check) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#56645E] block">
            {t.howManyPieces}
          </label>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPieces((prev) => Math.max(1, prev - 10))}
              className="w-12 h-12 rounded-2xl bg-white border border-[#D9D2C3] text-[#19221E] flex items-center justify-center hover:bg-[#F2ECE1] transition-colors shadow-2xs active:scale-95"
            >
              <Minus className="w-5 h-5" />
            </button>

            <input
              type="number"
              value={pieces}
              onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value) || 0))}
              className="flex-1 bg-white border border-[#D9D2C3] rounded-2xl h-12 text-center text-xl font-black text-[#19221E] focus:outline-none focus:border-[#184E3A] shadow-2xs"
            />

            <button
              type="button"
              onClick={() => setPieces((prev) => prev + 10)}
              className="w-12 h-12 rounded-2xl bg-white border border-[#D9D2C3] text-[#19221E] flex items-center justify-center hover:bg-[#F2ECE1] transition-colors shadow-2xs active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Live stock indicator pill */}
            <div
              className={`px-3 py-2 rounded-2xl text-xs font-bold shrink-0 ${
                isEnough
                  ? 'bg-[#E7EFE9] text-[#184E3A]'
                  : 'bg-[#FCEFE7] text-[#C25E1A]'
              }`}
            >
              {inStock} in stock · {isEnough ? 'enough' : 'short'}
            </div>
          </div>
        </div>

        {/* 4. Remind me */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#56645E] block">
            {t.remindMe}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'today', label: t.today },
                { id: 'tomorrow', label: t.tomorrow },
                { id: '3days', label: t.threeDays },
                { id: 'custom', label: t.pickDate },
              ] as const
            ).map((opt) => {
              const isSelected = remindOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRemindOption(opt.id)}
                  className={`py-2 px-1 text-xs font-bold rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-[#184E3A] text-white shadow-xs'
                      : 'bg-white text-[#19221E] border border-[#E5DFD1] hover:bg-[#F2ECE1]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {remindOption === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-white border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold mt-2"
            />
          )}
        </div>

        {/* 5. Note (Optional) */}
        <div className="space-y-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.noteOptional}
            className="w-full bg-white border border-[#D9D2C3] rounded-2xl p-3 text-xs font-semibold text-[#19221E] focus:outline-none focus:border-[#184E3A] placeholder:text-[#A8A29E]"
          />
        </div>

        {/* 6. Save Button & Reminder feedback */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!buyerName.trim() || pieces <= 0}
            className="w-full bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-sm transition-all disabled:opacity-50"
          >
            {t.saveEnquiry}
          </button>

          <p className="text-center text-[11px] font-semibold text-[#56645E]">
            {t.weWillRemindYou} {reminderDisplayDate()}, 9:00 am
          </p>
        </div>
      </div>
    </div>
  );
}
