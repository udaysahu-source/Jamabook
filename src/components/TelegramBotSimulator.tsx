// src/components/TelegramBotSimulator.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatCurrency, formatIndianNumber, calculateLineAmount } from '@/lib/formatters';
import { Check, Mic, Send, Bot, Sparkles, ArrowLeft } from 'lucide-react';

export function TelegramBotSimulator() {
  const {
    language,
    setActiveView,
    business,
    parties,
    items,
    createInvoice,
  } = useJamabook();
  const t = getT(language);

  const [inputMessage, setInputMessage] = useState(
    'Boina Vardharaju, Nav Transport, Mung Prestige Pro 50 x 30kg @11050 per quintal, extra 50'
  );

  const [chatState, setChatState] = useState<'draft' | 'confirmed' | 'cancelled'>('draft');
  const [isParsing, setIsParsing] = useState(false);

  // Match buyer, item, transport from input or defaults
  const matchedBuyer =
    parties.find((p) => p.is_buyer && p.name.toLowerCase().includes('boina')) ||
    parties.find((p) => p.is_buyer) || {
      id: 'p1',
      name: 'Boina Vardharaju and Co.',
      town: 'Naraspeta',
      phone: '+919440123456',
    };

  const matchedItem =
    items.find((i) => i.name.toLowerCase().includes('prestige')) ||
    items[0] || {
      id: 'i1',
      name: 'Mung Prestige Pro',
      kg_per_piece: 30,
      default_rate: 11050,
      rate_unit: 'per_quintal',
      pieces_in_stock: 100,
    };

  const matchedTransport =
    parties.find((p) => p.is_transporter && p.name.toLowerCase().includes('nav'))?.name ||
    'Nav. Transport';

  const pieces = 50;
  const kgPerPiece = 30;
  const rate = 11050;
  const extra = 50;
  const lineAmount = calculateLineAmount(pieces, kgPerPiece, rate, 'per_quintal');
  const total = lineAmount + extra;

  const currentStock = matchedItem.pieces_in_stock || 100;
  const stockAfter = Math.max(0, currentStock - pieces);

  const handleSendPrompt = (text: string) => {
    setIsParsing(true);
    setInputMessage(text);
    setTimeout(() => {
      setIsParsing(false);
      setChatState('draft');
    }, 400);
  };

  const handleConfirmDraft = () => {
    const result = createInvoice({
      buyer_id: matchedBuyer.id,
      buyer_name: matchedBuyer.name,
      buyer_town: matchedBuyer.town,
      buyer_phone: matchedBuyer.phone,
      transporter_name: matchedTransport,
      bill_date: new Date().toISOString().split('T')[0],
      lines: [
        {
          item_id: matchedItem.id,
          item_name: matchedItem.name,
          pieces,
          kg_per_piece: kgPerPiece,
          rate,
          rate_unit: 'per_quintal',
        },
      ],
      charges: [{ label: 'Extra', amount: extra }],
    });

    if (result.success) {
      setChatState('confirmed');
    }
  };

  return (
    <div className="pb-28 pt-1 space-y-4 animate-fade-in max-w-md mx-auto">
      {/* 1. Header (Matching Screen 4) */}
      <div className="flex items-center justify-between border-b border-[#E5DFD1] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('home')}
            className="w-9 h-9 rounded-full bg-white border border-[#E5DFD1] flex items-center justify-center text-[#19221E] hover:bg-[#F2ECE1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-[#184E3A] flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
            RTC
          </div>

          <div>
            <h2 className="font-extrabold text-base text-[#19221E] leading-tight flex items-center gap-1.5">
              <span>{t.telegramBot}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </h2>
            <p className="text-xs font-semibold text-[#56645E]">
              {t.telegramNotice}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold bg-[#E7EFE9] text-[#184E3A] px-2 py-0.5 rounded-full">
          Phase 5
        </span>
      </div>

      {/* Preset Fast Testing Messages */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[10px] font-bold text-[#56645E] shrink-0 uppercase tracking-wider">
          Presets:
        </span>
        <button
          onClick={() =>
            handleSendPrompt(
              'Boina Vardharaju, Nav Transport, Mung Prestige Pro 50 x 30kg @11050 per quintal, extra 50'
            )
          }
          className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-[#E5DFD1] text-[#19221E] hover:bg-[#F2ECE1] shrink-0 shadow-2xs"
        >
          Slip 4449
        </button>
        <button
          onClick={() =>
            handleSendPrompt(
              'Sri Lakshmi Traders, Mung Super 20 bags of 30kg @9800 per quintal'
            )
          }
          className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-[#E5DFD1] text-[#19221E] hover:bg-[#F2ECE1] shrink-0 shadow-2xs"
        >
          Sri Lakshmi
        </button>
      </div>

      {/* 2. Chat Conversation View (Matching Screen 4) */}
      <div className="space-y-4 pt-1">
        {/* User Message Bubble */}
        <div className="flex justify-end">
          <div className="bg-[#DCF8C6] text-[#19221E] p-3.5 rounded-3xl rounded-tr-xs max-w-[85%] shadow-xs space-y-1">
            <p className="text-xs font-bold leading-relaxed">{inputMessage}</p>
            <div className="text-right">
              <span className="text-[10px] font-medium text-[#56645E]">09:21</span>
            </div>
          </div>
        </div>

        {/* Bot Response Card (Draft Bill No. 4450) */}
        {chatState === 'draft' && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4.5 rounded-3xl rounded-tl-xs border border-[#E5DFD1] max-w-[95%] shadow-sm space-y-3">
              {/* Draft Header */}
              <div>
                <h4 className="font-black text-base text-[#19221E]">
                  Draft bill No. {business.next_bill_no}
                </h4>
                <div className="flex items-center gap-1.5 mt-1 text-[#184E3A] text-xs font-bold">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Buyer, transport and item matched your saved list</span>
                </div>
              </div>

              {/* Matched Fields Key-Value Table */}
              <div className="text-xs space-y-2 py-1">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-[#56645E] font-medium">Buyer</span>
                  <span className="col-span-2 font-bold text-[#19221E]">
                    {matchedBuyer.name}, {matchedBuyer.town}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-[#56645E] font-medium">Transport</span>
                  <span className="col-span-2 font-bold text-[#19221E]">
                    {matchedTransport}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-[#56645E] font-medium">Item</span>
                  <span className="col-span-2 font-bold text-[#19221E]">
                    {matchedItem.name}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-[#56645E] font-medium">Quantity</span>
                  <span className="col-span-2 font-bold text-[#19221E]">
                    {pieces} pcs × {kgPerPiece} kg = 15 quintal
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-[#56645E] font-medium">Rate</span>
                  <span className="col-span-2 font-bold text-[#19221E]">
                    ₹{formatIndianNumber(rate)} per quintal
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-[#56645E] font-medium">Extra</span>
                  <span className="col-span-2 font-bold text-[#19221E]">
                    ₹{formatIndianNumber(extra)}
                  </span>
                </div>

                <div className="border-t border-[#E5DFD1] pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-[#19221E]">Total</span>
                  <span className="text-xl font-black text-[#19221E]">
                    ₹{formatIndianNumber(total)}
                  </span>
                </div>
              </div>

              {/* Stock Forecast Notice */}
              <p className="text-xs font-semibold text-[#56645E]">
                Stock after this bill: {matchedItem.name}{' '}
                <span className="font-bold text-[#19221E]">{currentStock}</span> →{' '}
                <span className="font-bold text-[#184E3A]">{stockAfter} pcs</span>
              </p>

              <div className="text-right">
                <span className="text-[10px] font-medium text-[#56645E]">09:21</span>
              </div>

              {/* 3 Interactive Action Buttons: Confirm / Edit / Cancel */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={handleConfirmDraft}
                  className="bg-[#184E3A] hover:bg-[#123E2E] active:scale-95 text-white py-2.5 rounded-2xl font-black text-xs shadow-xs transition-all text-center"
                >
                  {t.confirm}
                </button>

                <button
                  onClick={() => setActiveView('bill-new')}
                  className="bg-white border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] py-2.5 rounded-2xl font-bold text-xs shadow-2xs transition-colors text-center"
                >
                  {t.edit}
                </button>

                <button
                  onClick={() => setChatState('cancelled')}
                  className="bg-white border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#56645E] py-2.5 rounded-2xl font-bold text-xs shadow-2xs transition-colors text-center"
                >
                  {t.cancel}
                </button>
              </div>

              <p className="text-[11px] font-semibold text-[#8C9892] text-center pt-1">
                {t.nothingSavedUntilConfirm}
              </p>
            </div>
          </div>
        )}

        {chatState === 'confirmed' && (
          <div className="bg-[#E7EFE9] border border-[#C6DEC9] p-4 rounded-3xl text-center space-y-2">
            <div className="w-10 h-10 bg-[#184E3A] text-white rounded-full flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <h4 className="font-extrabold text-sm text-[#184E3A]">
              Bill created and saved successfully!
            </h4>
            <p className="text-xs text-[#56645E]">
              Stock updated. Ready to share with buyer.
            </p>
            <button
              onClick={() => setActiveView('bill-saved')}
              className="mt-2 px-4 py-2 bg-[#184E3A] text-white rounded-xl text-xs font-bold"
            >
              View Saved Bill & Share
            </button>
          </div>
        )}

        {chatState === 'cancelled' && (
          <div className="bg-gray-100 p-4 rounded-3xl text-center text-xs text-[#56645E]">
            Draft cancelled. No database changes were made.
            <button
              onClick={() => setChatState('draft')}
              className="block mx-auto mt-2 font-bold text-[#184E3A] underline"
            >
              Restart Draft
            </button>
          </div>
        )}
      </div>

      {/* 3. Bottom Voice / Message Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DFD1] p-3 pb-safe shadow-lg no-print">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t.enterMessageOrVoice}
            className="flex-1 bg-[#F5F2EB] border border-[#E5DFD1] rounded-full px-4 py-2.5 text-xs font-semibold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
          />

          <button
            onClick={() => handleSendPrompt(inputMessage)}
            disabled={isParsing}
            className="w-10 h-10 rounded-full bg-[#184E3A] text-white flex items-center justify-center hover:bg-[#123E2E] transition-transform active:scale-95 shadow-xs shrink-0"
            title="Send Message"
          >
            {isParsing ? (
              <span className="animate-spin text-xs">●</span>
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            className="w-10 h-10 rounded-full bg-[#184E3A] text-white flex items-center justify-center hover:bg-[#123E2E] transition-transform active:scale-95 shadow-xs shrink-0"
            title="Voice Note"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
