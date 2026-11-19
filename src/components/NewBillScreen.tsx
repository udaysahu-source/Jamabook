// src/components/NewBillScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { RateUnit } from '@/types';
import {
  formatCurrency,
  formatIndianNumber,
  formatIndianDecimals,
  calculateLineAmount,
  amountToIndianWords,
} from '@/lib/formatters';
import { todayIST, formatTallyDateIST } from '@/lib/dates';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Plus,
  X,
  Loader2,
  Printer,
  Sparkles,
  Receipt,
} from 'lucide-react';

interface LineState {
  item_id: string;
  item_name: string;
  pieces: number | '';
  kg_per_piece: number | '';
  rate: number | '';
  rate_unit: RateUnit;
}

export function NewBillScreen() {
  const {
    language,
    setActiveView,
    business,
    parties,
    items,
    getLastBillForBuyer,
    createInvoice,
    addParty,
  } = useJamabook();
  const t = getT(language);

  // Filter parties
  const buyers = parties.filter((p) => p.is_buyer && p.is_active);
  const transporters = parties.filter((p) => p.is_transporter && p.is_active);
  const brokers = parties.filter((p) => p.is_broker && p.is_active);

  // Default active buyer (first buyer or Boina Vardharaju)
  const defaultBuyer =
    buyers.find((b) => b.name.includes('Boina')) || buyers[0] || null;

  const [selectedBuyer, setSelectedBuyer] = useState(defaultBuyer);
  const [selectedTransporter, setSelectedTransporter] = useState(
    transporters[0]?.name || 'Nav. Transport'
  );
  const [selectedBroker, setSelectedBroker] = useState('');
  const [billDate, setBillDate] = useState('2026-11-19');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBillDate(todayIST());
  }, []);

  const [vehicleNo, setVehicleNo] = useState('');
  const [lastBillNoUsed, setLastBillNoUsed] = useState<number | null>(4449);
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);
  const [showNewBuyerModal, setShowNewBuyerModal] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerTown, setNewBuyerTown] = useState('');
  const [newBuyerPhone, setNewBuyerPhone] = useState('');

  // Items lines state
  const defaultItem = items[0];
  const [lines, setLines] = useState<LineState[]>([
    {
      item_id: defaultItem?.id || '',
      item_name: defaultItem?.name || 'Mung Prestige Pro',
      pieces: 50,
      kg_per_piece: defaultItem?.kg_per_piece || 30,
      rate: defaultItem?.default_rate || 11050,
      rate_unit: defaultItem?.rate_unit || 'per_quintal',
    },
  ]);

  // Extra charges state
  const [extraLabel, setExtraLabel] = useState('Extra (Hamali)');
  const [extraAmount, setExtraAmount] = useState<number | ''>(50);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If buyer changes, check their last bill and optionally pre-fill
  const handleSelectBuyer = (buyer: typeof defaultBuyer) => {
    setSelectedBuyer(buyer);
    setShowBuyerDropdown(false);
    if (!buyer) return;

    const lastBill = getLastBillForBuyer(buyer.id);
    if (lastBill) {
      setLastBillNoUsed(lastBill.bill_no);
      if (lastBill.transporter_name) setSelectedTransporter(lastBill.transporter_name);
      if (lastBill.broker_name) setSelectedBroker(lastBill.broker_name);
      if (lastBill.lines && lastBill.lines.length > 0) {
        setLines(
          lastBill.lines.map((l) => ({
            item_id: l.item_id,
            item_name: l.item_name,
            pieces: l.pieces,
            kg_per_piece: l.kg_per_piece,
            rate: l.rate,
            rate_unit: l.rate_unit,
          }))
        );
      }
      if (lastBill.charges && lastBill.charges[0]) {
        setExtraLabel(lastBill.charges[0].label);
        setExtraAmount(lastBill.charges[0].amount);
      }
    } else {
      setLastBillNoUsed(null);
    }
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setLines((prev) =>
      prev.map((line, idx) =>
        idx === index
          ? {
              ...line,
              item_id: item.id,
              item_name: item.name,
              kg_per_piece: item.kg_per_piece,
              rate: item.default_rate || line.rate,
              rate_unit: item.rate_unit || line.rate_unit,
            }
          : line
      )
    );
  };

  const updateLine = (index: number, field: keyof LineState, value: any) => {
    setLines((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, [field]: value } : line))
    );
  };

  const addLine = () => {
    const nextItem = items[lines.length % items.length] || items[0];
    setLines((prev) => [
      ...prev,
      {
        item_id: nextItem?.id || '',
        item_name: nextItem?.name || '',
        pieces: 10,
        kg_per_piece: nextItem?.kg_per_piece || 30,
        rate: nextItem?.default_rate || 10000,
        rate_unit: nextItem?.rate_unit || 'per_quintal',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Live calculations
  let subtotal = 0;
  let totalBags = 0;
  let totalWeightKg = 0;

  lines.forEach((line) => {
    const p = typeof line.pieces === 'number' ? line.pieces : 0;
    const kg = typeof line.kg_per_piece === 'number' ? line.kg_per_piece : 0;
    const r = typeof line.rate === 'number' ? line.rate : 0;
    subtotal += calculateLineAmount(p, kg, r, line.rate_unit);
    totalBags += p;
    totalWeightKg += p * kg;
  });

  const numericExtra = typeof extraAmount === 'number' ? extraAmount : 0;
  const grandTotal = subtotal + numericExtra;
  const amountWords = amountToIndianWords(grandTotal, 'Indian Rupees');

  const handleSaveBill = () => {
    setErrorMessage(null);
    if (!selectedBuyer) {
      setErrorMessage('Please select a buyer');
      return;
    }

    const validLines = lines.map((l) => ({
      item_id: l.item_id,
      item_name: l.item_name,
      pieces: Number(l.pieces) || 0,
      kg_per_piece: Number(l.kg_per_piece) || 0,
      rate: Number(l.rate) || 0,
      rate_unit: l.rate_unit,
    }));

    if (validLines.some((l) => l.pieces <= 0 || l.rate <= 0)) {
      setErrorMessage('All items must have valid pieces (>0) and rate (>0)');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    const transporterObj = transporters.find((t) => t.name === selectedTransporter);
    const brokerObj = brokers.find((b) => b.name === selectedBroker);

    const result = createInvoice({
      buyer_id: selectedBuyer.id,
      buyer_name: selectedBuyer.name,
      buyer_town: selectedBuyer.town,
      buyer_phone: selectedBuyer.phone,
      transporter_id: transporterObj?.id,
      transporter_name: selectedTransporter || undefined,
      broker_id: brokerObj?.id,
      broker_name: selectedBroker || undefined,
      bill_date: billDate,
      vehicle_no: vehicleNo.trim() || undefined,
      lines: validLines,
      charges: numericExtra > 0 ? [{ label: extraLabel || 'Extra', amount: numericExtra }] : [],
    });

    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to save bill');
    }
  };

  const handleCreateNewBuyer = () => {
    if (!newBuyerName.trim()) return;
    const created = addParty({
      name: newBuyerName.trim(),
      town: newBuyerTown.trim() || undefined,
      phone: newBuyerPhone.trim() || undefined,
      is_buyer: true,
      is_transporter: false,
      is_broker: false,
      is_active: true,
    });
    if (created.success && created.party) {
      setSelectedBuyer(created.party);
    }
    setShowNewBuyerModal(false);
    setNewBuyerName('');
    setNewBuyerTown('');
    setNewBuyerPhone('');
  };

  return (
    <div className="pb-32 lg:pb-12 pt-1 space-y-6 animate-fade-in">
      {/* 1. Top Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('home')}
            className="w-10 h-10 rounded-2xl bg-white border border-[#E5DFD1] flex items-center justify-center text-[#19221E] hover:bg-[#F2ECE1] transition-colors shadow-2xs group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#C25E1A] bg-[#FCEFE7] px-2 py-0.5 rounded-full">
                Speed Mandi Billing
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#19221E] tracking-tight mt-0.5">
              {t.newBill} · {t.newBillHindi}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#184E3A] text-white px-3.5 py-1.5 rounded-2xl shadow-xs font-mono font-black text-sm">
          <span>{business.bill_prefix || 'RTC'}</span>
          <span>#{business.next_bill_no}</span>
        </div>
      </div>

      {/* Responsive Grid: 1-col on mobile, 12-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ================= LEFT COLUMN: BILLING FORM (Col 7 on Desktop) ================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Pre-filled context notice banner */}
          {lastBillNoUsed && (
            <div className="bg-[#E7EFE9] border border-[#C6DEC9] p-3.5 rounded-2xl flex items-start gap-2.5 shadow-2xs">
              <div className="w-5 h-5 rounded-full bg-[#184E3A] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <p className="text-xs font-semibold text-[#184E3A] leading-relaxed">
                Pre-filled from this buyer&apos;s last bill (#{lastBillNoUsed}). You can modify pieces, rates, or transport.
              </p>
            </div>
          )}

          {/* Buyer Selection Section */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#56645E]">
                {t.buyer} · {t.buyerHindi}
              </label>
              <button
                type="button"
                onClick={() => setShowNewBuyerModal(true)}
                className="text-xs font-black text-[#184E3A] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                + New Buyer
              </button>
            </div>

            {/* Selected Buyer Card */}
            <div className="bg-[#F9F6F0] p-3.5 rounded-2xl border-2 border-[#184E3A] flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <h4 className="font-extrabold text-base text-[#19221E] truncate">
                  {selectedBuyer?.name || 'Select Buyer'}
                </h4>
                <p className="text-xs font-medium text-[#56645E] mt-0.5">
                  {selectedBuyer?.town || 'Town not specified'}
                  {selectedBuyer?.phone ? ` · ${selectedBuyer.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBuyerDropdown(!showBuyerDropdown)}
                className="text-xs font-black bg-white px-3 py-1.5 rounded-xl border border-[#D9D2C3] text-[#184E3A] hover:bg-[#EBE5D8] transition-colors"
              >
                {t.change}
              </button>
            </div>

            {/* Buyer Dropdown if opened */}
            {showBuyerDropdown && (
              <div className="bg-white border border-[#D9D2C3] rounded-2xl p-2 shadow-lg space-y-1 max-h-48 overflow-y-auto animate-in fade-in">
                {buyers.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBuyer(b)}
                    className={`w-full text-left p-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                      selectedBuyer?.id === b.id
                        ? 'bg-[#E7EFE9] text-[#184E3A]'
                        : 'hover:bg-[#F8F5EE] text-[#19221E]'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-xs text-[#56645E]">{b.town}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Buyer Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {buyers.slice(0, 4).map((b) => {
                const isSelected = selectedBuyer?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBuyer(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#184E3A] text-white shadow-xs'
                        : 'bg-white text-[#19221E] border border-[#E5DFD1] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transport, Broker, Date & Vehicle Inputs */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#56645E]">
              Dispatch &amp; Mandi Log
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  {t.transport} · {t.transportHindi}
                </label>
                <div className="relative">
                  <select
                    value={selectedTransporter}
                    onChange={(e) => setSelectedTransporter(e.target.value)}
                    className="w-full bg-[#F9F6F0] border border-[#E5DFD1] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[#19221E] appearance-none focus:outline-none focus:border-[#184E3A]"
                  >
                    {transporters.map((tr) => (
                      <option key={tr.id} value={tr.name}>
                        {tr.name}
                      </option>
                    ))}
                    <option value="Direct / Self">Direct / Self</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#56645E] absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  {t.broker} · {t.brokerHindi}
                </label>
                <div className="relative">
                  <select
                    value={selectedBroker}
                    onChange={(e) => setSelectedBroker(e.target.value)}
                    className="w-full bg-[#F9F6F0] border border-[#E5DFD1] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[#19221E] appearance-none focus:outline-none focus:border-[#184E3A]"
                  >
                    <option value="">None / Direct</option>
                    {brokers.map((br) => (
                      <option key={br.id} value={br.name}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#56645E] absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  {t.date} · {t.dateHindi}
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full bg-[#F9F6F0] border border-[#E5DFD1] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  {t.vehicleNo}
                </label>
                <input
                  type="text"
                  placeholder="e.g. AP 02 TA 8844"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full bg-[#F9F6F0] border border-[#E5DFD1] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A] uppercase placeholder:normal-case placeholder:font-normal placeholder:text-[#A8A29E]"
                />
              </div>
            </div>
          </div>

          {/* Commodity Line Items */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#56645E]">
                Mandi Commodities &amp; Pricing
              </h4>
              <span className="text-xs font-bold text-[#184E3A]">
                {lines.length} Line Items
              </span>
            </div>

            {lines.map((line, index) => {
              const piecesNum = typeof line.pieces === 'number' ? line.pieces : 0;
              const kgNum = typeof line.kg_per_piece === 'number' ? line.kg_per_piece : 0;
              const rateNum = typeof line.rate === 'number' ? line.rate : 0;
              const lineAmount = calculateLineAmount(piecesNum, kgNum, rateNum, line.rate_unit);
              const totalKg = piecesNum * kgNum;
              const totalQuintal = (totalKg / 100).toFixed(2);

              return (
                <div
                  key={index}
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#56645E] uppercase tracking-wider">
                      Item #{index + 1}
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="w-7 h-7 rounded-full bg-[#F3EFE6] text-[#56645E] hover:text-red-600 flex items-center justify-center transition-colors"
                        title="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Commodity Picker */}
                  <div className="relative">
                    <select
                      value={line.item_id}
                      onChange={(e) => handleItemSelect(index, e.target.value)}
                      className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl px-4 py-2.5 text-sm font-black text-[#19221E] appearance-none focus:outline-none focus:border-[#184E3A]"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.pieces_in_stock} in stock)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#56645E] absolute right-3.5 top-3 pointer-events-none" />
                  </div>

                  {/* 3-Column Inputs: Pieces, Kg/Piece, Rate */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-black uppercase text-[#56645E] block mb-1">
                        {t.pieces} (Bags)
                      </label>
                      <input
                        type="number"
                        value={line.pieces}
                        onChange={(e) =>
                          updateLine(
                            index,
                            'pieces',
                            e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0)
                          )
                        }
                        className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl px-3 py-2 text-center text-base font-black font-mono text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-[#56645E] block mb-1">
                        {t.kgPerPiece} (Kg)
                      </label>
                      <input
                        type="number"
                        value={line.kg_per_piece}
                        onChange={(e) =>
                          updateLine(
                            index,
                            'kg_per_piece',
                            e.target.value === '' ? '' : Math.max(0.1, parseFloat(e.target.value) || 0)
                          )
                        }
                        className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl px-3 py-2 text-center text-base font-black font-mono text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-[#56645E] block mb-1">
                        {t.rate} (₹)
                      </label>
                      <input
                        type="number"
                        value={line.rate}
                        onChange={(e) =>
                          updateLine(
                            index,
                            'rate',
                            e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0)
                          )
                        }
                        className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl px-3 py-2 text-center text-base font-black font-mono text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                      />
                    </div>
                  </div>

                  {/* Segmented Rate Unit Switcher */}
                  <div className="grid grid-cols-3 gap-1 bg-[#F1EBE1] p-1 rounded-2xl">
                    {(['per_quintal', 'per_kg', 'per_piece'] as RateUnit[]).map((unit) => {
                      const isActive = line.rate_unit === unit;
                      const label =
                        unit === 'per_quintal'
                          ? t.perQuintal
                          : unit === 'per_kg'
                          ? t.perKg
                          : t.perPiece;
                      return (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => updateLine(index, 'rate_unit', unit)}
                          className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                            isActive
                              ? 'bg-[#184E3A] text-white shadow-xs font-black'
                              : 'text-[#56645E] hover:text-[#19221E]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Line Formula Calculation Banner */}
                  <div className="bg-[#E7EFE9] border border-[#C6DEC9] p-3 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#184E3A]">
                      {line.rate_unit === 'per_quintal'
                        ? `${piecesNum} Bags × ${kgNum} kg = ${formatIndianNumber(totalWeightKg)} kg (${totalQuintal} Qtl)`
                        : line.rate_unit === 'per_kg'
                        ? `${piecesNum} Bags × ${kgNum} kg = ${formatIndianNumber(totalWeightKg)} kg`
                        : `${piecesNum} Bags @ ₹${formatIndianNumber(rateNum)}`}
                    </span>
                    <span className="font-black font-mono text-sm text-[#184E3A]">
                      {formatCurrency(lineAmount)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Add Another Item Button */}
            <button
              type="button"
              onClick={addLine}
              className="w-full py-4 border-2 border-dashed border-[#B9CDBF] rounded-3xl text-sm font-black text-[#184E3A] hover:bg-[#E7EFE9]/40 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>{t.addAnotherItem}</span>
            </button>
          </div>

          {/* Extra Charges */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-[#56645E] block">
              {t.extraCharge} (Hamali, Mandi Cess, Bardana)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={extraLabel}
                onChange={(e) => setExtraLabel(e.target.value)}
                placeholder="Extra description"
                className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
              />
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-[#56645E]">₹</span>
                <input
                  type="number"
                  value={extraAmount}
                  onChange={(e) =>
                    setExtraAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl pl-8 pr-3 py-2.5 text-sm font-black font-mono text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3.5 rounded-2xl">
              {errorMessage}
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: LIVE TALLY PRIME SLIP PREVIEW (Col 5 on Desktop) ================= */}
        <div className="hidden lg:block lg:col-span-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#184E3A]" />
              <h4 className="font-extrabold text-sm text-[#19221E] uppercase tracking-wider">
                Live Tally Bill Preview
              </h4>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Real-time Slip
            </span>
          </div>

          {/* Authentic Tally Prime Tax Invoice Box */}
          <div className="bg-white border-2 border-black p-4 text-[11px] font-sans text-black shadow-md space-y-3 select-none">
            {/* Header */}
            <div className="text-center border-b border-black pb-2">
              <h3 className="font-black text-sm tracking-wide uppercase">Tax Invoice</h3>
              <p className="text-[10px] text-gray-700">See Rule 46 of CGST Rules, 2017</p>
            </div>

            {/* Seller & Invoice Details */}
            <div className="grid grid-cols-2 gap-2 border-b border-black pb-2">
              <div>
                <p className="font-black text-xs">{business.name || 'RTC Mandi'}</p>
                <p className="text-[10px] text-gray-800">{business.address || 'Ganj Mandi, Warangal'}</p>
                <p className="text-[10px]">GSTIN: <span className="font-mono font-bold">{business.gstin || '36AABCU9603R1ZM'}</span></p>
                <p className="text-[10px]">State: Telangana (36)</p>
              </div>
              <div className="text-right space-y-0.5">
                <p>Invoice No: <span className="font-mono font-black">#{business.bill_prefix || 'RTC'}-{business.next_bill_no}</span></p>
                <p>Dated: <span className="font-mono font-bold">{formatTallyDateIST(billDate)}</span></p>
                <p>Vehicle: <span className="font-mono font-bold">{vehicleNo || 'Direct'}</span></p>
                <p>Transport: <span className="font-bold">{selectedTransporter}</span></p>
              </div>
            </div>

            {/* Buyer Block */}
            <div className="border-b border-black pb-2">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Bill To / Buyer:</p>
              <p className="font-black text-xs">{selectedBuyer?.name || 'Cash Buyer'}</p>
              <p className="text-[10px]">{selectedBuyer?.town || 'Mandi'}</p>
              {selectedBuyer?.phone && <p className="text-[10px]">Ph: {selectedBuyer.phone}</p>}
            </div>

            {/* Item Table */}
            <div className="border border-black overflow-hidden">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-black font-black">
                    <th className="p-1 border-r border-black w-6">Sl</th>
                    <th className="p-1 border-r border-black">Description</th>
                    <th className="p-1 border-r border-black text-right">Qty</th>
                    <th className="p-1 border-r border-black text-right">Rate</th>
                    <th className="p-1 border-r border-black text-center">per</th>
                    <th className="p-1 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const p = typeof l.pieces === 'number' ? l.pieces : 0;
                    const kg = typeof l.kg_per_piece === 'number' ? l.kg_per_piece : 0;
                    const r = typeof l.rate === 'number' ? l.rate : 0;
                    const amt = calculateLineAmount(p, kg, r, l.rate_unit);
                    const qtl = (p * kg) / 100;

                    return (
                      <tr key={i} className="border-b border-gray-300">
                        <td className="p-1 border-r border-black font-mono">{i + 1}</td>
                        <td className="p-1 border-r border-black font-bold truncate max-w-[120px]">
                          {l.item_name}
                        </td>
                        <td className="p-1 border-r border-black text-right font-mono font-bold">
                          {p} Bags ({qtl.toFixed(2)} Qtl)
                        </td>
                        <td className="p-1 border-r border-black text-right font-mono">
                          {formatIndianDecimals(r)}
                        </td>
                        <td className="p-1 border-r border-black text-center text-[9px]">
                          {l.rate_unit === 'per_quintal' ? 'Qtl' : l.rate_unit === 'per_kg' ? 'kg' : 'Bag'}
                        </td>
                        <td className="p-1 text-right font-mono font-bold">
                          {formatIndianDecimals(amt)}
                        </td>
                      </tr>
                    );
                  })}
                  {numericExtra > 0 && (
                    <tr className="border-b border-gray-300 italic">
                      <td className="p-1 border-r border-black font-mono">-</td>
                      <td className="p-1 border-r border-black font-bold">{extraLabel || 'Extra Charges'}</td>
                      <td className="p-1 border-r border-black text-right font-mono">1</td>
                      <td className="p-1 border-r border-black text-right font-mono">{formatIndianDecimals(numericExtra)}</td>
                      <td className="p-1 border-r border-black text-center text-[9px]">Item</td>
                      <td className="p-1 text-right font-mono font-bold">{formatIndianDecimals(numericExtra)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black font-black bg-gray-50">
                    <td colSpan={2} className="p-1 border-r border-black">Total</td>
                    <td className="p-1 border-r border-black text-right font-mono">{totalBags} Bags</td>
                    <td colSpan={2} className="p-1 border-r border-black"></td>
                    <td className="p-1 text-right font-mono text-xs">{formatIndianDecimals(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Amount in Words */}
            <div className="border-b border-black pb-2 text-[10px]">
              <span className="font-bold">Amount in Words: </span>
              <span className="italic">{amountWords}</span>
            </div>

            {/* Tally Declaration Footer */}
            <div className="flex justify-between items-end pt-1 text-[9px] text-gray-700">
              <div>
                <p>This is a Computer Generated Invoice.</p>
                <p>Bank: {business.bank_name || 'SBI'} · A/c: {business.bank_account || '39981029482'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">For {business.name || 'RTC Mandi'}</p>
                <p className="pt-4 font-semibold">Authorised Signatory</p>
              </div>
            </div>
          </div>

          {/* Desktop Save Action Button */}
          <button
            onClick={handleSaveBill}
            disabled={isSaving}
            className="w-full py-4 px-6 bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving Bill...</span>
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>Save &amp; Generate Tally Slip ({formatCurrency(grandTotal)})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131B17]/95 backdrop-blur-md border-t border-[#E5DFD1] dark:border-[#27362E] px-4 py-3 shadow-lg lg:hidden no-print transition-colors duration-200">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#56645E] dark:text-[#8E9F97] block">
              {t.total}
            </span>
            <span className="text-2xl font-black font-mono text-[#19221E] dark:text-[#F0F4F2] tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <button
            onClick={handleSaveBill}
            disabled={isSaving}
            className="flex-1 max-w-[200px] bg-[#184E3A] hover:bg-[#123E2E] dark:bg-[#226E52] dark:hover:bg-[#1A5741] active:scale-[0.98] disabled:opacity-50 text-white py-3.5 px-5 rounded-2xl font-black text-sm tracking-wide shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[48px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>{t.saveAndShare}</span>
                <span className="text-base font-bold">›</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* New Buyer Quick Modal */}
      {showNewBuyerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18221D] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-[#E5DFD1] dark:border-[#27362E] animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#19221E] dark:text-[#F0F4F2]">Add New Buyer</h3>
              <button
                type="button"
                onClick={() => setShowNewBuyerModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] dark:bg-[#233129] text-[#56645E] dark:text-[#8E9F97] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">Party / Buyer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Balaji Traders"
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  className="w-full bg-[#F9F6F0] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl p-2.5 text-sm font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">Town / Mandi</label>
                <input
                  type="text"
                  placeholder="e.g. Warangal"
                  value={newBuyerTown}
                  onChange={(e) => setNewBuyerTown(e.target.value)}
                  className="w-full bg-[#F9F6F0] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl p-2.5 text-sm font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">WhatsApp / Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98000 00000"
                  value={newBuyerPhone}
                  onChange={(e) => setNewBuyerPhone(e.target.value)}
                  className="w-full bg-[#F9F6F0] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl p-2.5 text-sm font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNewBuyerModal(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[#F3EFE6] dark:bg-[#233129] text-[#56645E] dark:text-[#8E9F97]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewBuyer}
                disabled={!newBuyerName.trim()}
                className="flex-1 py-3 rounded-2xl font-black text-sm bg-[#184E3A] dark:bg-[#226E52] text-white disabled:opacity-50"
              >
                Save Buyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
