// src/components/NewBillScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { RateUnit } from '@/types';
import { formatCurrency, formatIndianNumber, calculateLineAmount } from '@/lib/formatters';
import { ArrowLeft, Check, ChevronDown, Plus, X } from 'lucide-react';

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

  useEffect(() => {
    setBillDate(new Date().toISOString().split('T')[0]);
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
  const [extraLabel, setExtraLabel] = useState('Extra');
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
  lines.forEach((line) => {
    const p = typeof line.pieces === 'number' ? line.pieces : 0;
    const kg = typeof line.kg_per_piece === 'number' ? line.kg_per_piece : 0;
    const r = typeof line.rate === 'number' ? line.rate : 0;
    subtotal += calculateLineAmount(p, kg, r, line.rate_unit);
  });

  const numericExtra = typeof extraAmount === 'number' ? extraAmount : 0;
  const grandTotal = subtotal + numericExtra;

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
    <div className="pb-32 pt-1 space-y-4 animate-fade-in">
      {/* 1. Header with back & bill number badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('home')}
            className="w-10 h-10 rounded-full bg-white border border-[#E5DFD1] flex items-center justify-center text-[#19221E] hover:bg-[#F2ECE1] transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-[#19221E] tracking-tight">
              {t.newBill} · {t.newBillHindi}
            </h2>
          </div>
        </div>

        <div className="bg-[#19221E] text-white px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide shadow-xs">
          {t.no} {business.next_bill_no}
        </div>
      </div>

      {/* 2. Pre-filled context notice banner */}
      {lastBillNoUsed && (
        <div className="bg-[#E7EFE9] border border-[#C6DEC9] p-3 rounded-2xl flex items-start gap-2.5 shadow-2xs">
          <div className="w-5 h-5 rounded-full bg-[#184E3A] text-white flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <p className="text-xs font-semibold text-[#184E3A] leading-relaxed">
            Filled from this buyer&apos;s last bill (#{lastBillNoUsed}). Change anything you need.
          </p>
        </div>
      )}

      {/* 3. Buyer Selection Section */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#56645E]">
          {t.buyer} · {t.buyerHindi}
        </label>

        {/* Selected Buyer Box */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-[#184E3A] flex items-center justify-between shadow-xs">
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
            onClick={() => setShowBuyerDropdown(!showBuyerDropdown)}
            className="text-sm font-bold text-[#184E3A] hover:underline px-2 py-1"
          >
            {t.change}
          </button>
        </div>

        {/* Buyer Dropdown if opened */}
        {showBuyerDropdown && (
          <div className="bg-white border border-[#D9D2C3] rounded-2xl p-2 shadow-lg space-y-1 animate-in fade-in zoom-in-95">
            {buyers.map((b) => (
              <button
                key={b.id}
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
          {buyers.slice(0, 3).map((b) => {
            const isSelected = selectedBuyer?.id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBuyer(b)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#184E3A] text-white shadow-xs'
                    : 'bg-white text-[#19221E] border border-[#E5DFD1] hover:bg-[#F2ECE1]'
                }`}
              >
                {b.name}
              </button>
            );
          })}
          <button
            onClick={() => setShowNewBuyerModal(true)}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#F2ECE1] text-[#184E3A] hover:bg-[#E5DFD1] flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>
      </div>

      {/* 4. Transport & Broker Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-[#56645E] block mb-1">
            {t.transport} · {t.transportHindi}
          </label>
          <div className="relative">
            <select
              value={selectedTransporter}
              onChange={(e) => setSelectedTransporter(e.target.value)}
              className="w-full bg-white border border-[#E5DFD1] rounded-2xl px-3 py-2.5 text-sm font-bold text-[#19221E] appearance-none focus:outline-none focus:border-[#184E3A] shadow-2xs"
            >
              {transporters.map((tr) => (
                <option key={tr.id} value={tr.name}>
                  {tr.name}
                </option>
              ))}
              <option value="Direct / Self">Direct / Self</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#56645E] absolute right-3 top-3 pointer-events-none" />
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
              className="w-full bg-white border border-[#E5DFD1] rounded-2xl px-3 py-2.5 text-sm font-bold text-[#19221E] appearance-none focus:outline-none focus:border-[#184E3A] shadow-2xs"
            >
              <option value="">None</option>
              {brokers.map((br) => (
                <option key={br.id} value={br.name}>
                  {br.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#56645E] absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 5. Date & Vehicle No. Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-[#56645E] block mb-1">
            {t.date} · {t.dateHindi}
          </label>
          <input
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            className="w-full bg-white border border-[#E5DFD1] rounded-2xl px-3 py-2.5 text-sm font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A] shadow-2xs"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#56645E] block mb-1">
            {t.vehicleNo}
          </label>
          <input
            type="text"
            placeholder="AP 00 XX 0000"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            className="w-full bg-white border border-[#E5DFD1] rounded-2xl px-3 py-2.5 text-sm font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A] shadow-2xs uppercase placeholder:normal-case placeholder:font-normal placeholder:text-[#A8A29E]"
          />
        </div>
      </div>

      {/* 6. Item Lines Section */}
      <div className="space-y-3 pt-1">
        {lines.map((line, index) => {
          const piecesNum = typeof line.pieces === 'number' ? line.pieces : 0;
          const kgNum = typeof line.kg_per_piece === 'number' ? line.kg_per_piece : 0;
          const rateNum = typeof line.rate === 'number' ? line.rate : 0;
          const lineAmount = calculateLineAmount(piecesNum, kgNum, rateNum, line.rate_unit);
          const totalKg = piecesNum * kgNum;
          const totalQuintal = totalKg / 100;

          return (
            <div
              key={index}
              className="bg-white p-4 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#56645E] uppercase tracking-wider">
                  {t.item} {index + 1}
                </span>
                {lines.length > 1 && (
                  <button
                    onClick={() => removeLine(index)}
                    className="w-7 h-7 rounded-full bg-[#F3EFE6] text-[#56645E] hover:text-red-600 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Material Dropdown */}
              <div className="relative">
                <select
                  value={line.item_id}
                  onChange={(e) => handleItemSelect(index, e.target.value)}
                  className="w-full bg-white border border-[#D9D2C3] rounded-2xl px-3.5 py-2.5 text-sm font-extrabold text-[#19221E] appearance-none focus:outline-none focus:border-[#184E3A]"
                >
                  {items.length === 0 ? (
                    <option value="">No items yet · Add commodity</option>
                  ) : (
                    items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.pieces_in_stock} in stock)
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-[#56645E] absolute right-3.5 top-3 pointer-events-none" />
              </div>

              {/* 3-Column Inputs: Pieces, Kg/Piece, Rate */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#56645E] block mb-1">
                    {t.pieces}
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
                    className="w-full bg-white border border-[#D9D2C3] rounded-2xl px-3 py-2 text-center text-base font-black text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#56645E] block mb-1">
                    {t.kgPerPiece}
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
                    className="w-full bg-white border border-[#D9D2C3] rounded-2xl px-3 py-2 text-center text-base font-black text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#56645E] block mb-1">
                    {t.rate}
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
                    className="w-full bg-white border border-[#D9D2C3] rounded-2xl px-3 py-2 text-center text-base font-black text-[#19221E] focus:outline-none focus:border-[#184E3A]"
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
                          ? 'bg-[#184E3A] text-white shadow-xs'
                          : 'text-[#56645E] hover:text-[#19221E]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Live Formula Banner: "50 × 30 kg = 1,500 kg = 15 quintal -> ₹1,65,750" */}
              <div className="bg-[#E7EFE9] border border-[#C6DEC9] p-2.5 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-semibold text-[#184E3A]">
                  {line.rate_unit === 'per_quintal'
                    ? `${piecesNum} × ${kgNum} kg = ${formatIndianNumber(totalKg)} kg = ${formatIndianNumber(totalQuintal)} quintal`
                    : line.rate_unit === 'per_kg'
                    ? `${piecesNum} × ${kgNum} kg = ${formatIndianNumber(totalKg)} kg`
                    : `${piecesNum} pcs @ ₹${formatIndianNumber(rateNum)}`}
                </span>
                <span className="font-extrabold text-sm text-[#184E3A]">
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
          className="w-full py-3.5 border-2 border-dashed border-[#B9CDBF] rounded-3xl text-sm font-bold text-[#184E3A] hover:bg-[#E7EFE9]/40 flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.addAnotherItem}</span>
        </button>
      </div>

      {/* 7. Extra Charges */}
      <div className="bg-white p-3.5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-2">
        <label className="text-xs font-bold text-[#56645E] block">
          {t.extraCharge}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={extraLabel}
            onChange={(e) => setExtraLabel(e.target.value)}
            placeholder="Extra (e.g. loading)"
            className="w-full bg-white border border-[#D9D2C3] rounded-2xl px-3 py-2 text-sm font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
          />
          <div className="relative">
            <span className="absolute left-3.5 top-2 text-sm font-bold text-[#56645E]">₹</span>
            <input
              type="number"
              value={extraAmount}
              onChange={(e) =>
                setExtraAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
              }
              placeholder="0"
              className="w-full bg-white border border-[#D9D2C3] rounded-2xl pl-8 pr-3 py-2 text-sm font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
            />
          </div>
        </div>
      </div>

      {/* Error display if any */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-2xl">
          {errorMessage}
        </div>
      )}

      {/* 8. Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DFD1] px-4 py-3 shadow-lg no-print">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-[#56645E] uppercase tracking-wider block">
              {t.total}
            </span>
            <span className="text-2xl font-black text-[#19221E] tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <button
            onClick={handleSaveBill}
            className="flex-1 max-w-[200px] bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-3.5 px-5 rounded-2xl font-extrabold text-sm tracking-wide shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <span>{t.saveAndShare}</span>
            <span className="text-base font-bold">›</span>
          </button>
        </div>
      </div>

      {/* New Buyer Quick Modal */}
      {showNewBuyerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#19221E]">Add New Buyer</h3>
              <button
                onClick={() => setShowNewBuyerModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] text-[#56645E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">Party / Buyer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Balaji Traders"
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">Town / Mandi</label>
                <input
                  type="text"
                  placeholder="e.g. Warangal"
                  value={newBuyerTown}
                  onChange={(e) => setNewBuyerTown(e.target.value)}
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">WhatsApp / Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98000 00000"
                  value={newBuyerPhone}
                  onChange={(e) => setNewBuyerPhone(e.target.value)}
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowNewBuyerModal(false)}
                className="flex-1 py-2.5 rounded-2xl font-bold text-sm bg-[#F3EFE6] text-[#56645E]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewBuyer}
                disabled={!newBuyerName.trim()}
                className="flex-1 py-2.5 rounded-2xl font-bold text-sm bg-[#184E3A] text-white disabled:opacity-50"
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
