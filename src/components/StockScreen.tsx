// src/components/StockScreen.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatIndianNumber, formatDate } from '@/lib/formatters';
import {
  Plus,
  SlidersHorizontal,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Package,
  Layers,
  History,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { Item } from '@/types';

export function StockScreen() {
  const { language, items, stockMovements, addStockIn, addStockAdjustment, addItem } = useJamabook();
  const t = getT(language);

  const totalPiecesInHand = items.reduce((sum, item) => sum + (item.pieces_in_stock || 0), 0);
  const totalWeightKg = items.reduce(
    (sum, item) => sum + (item.pieces_in_stock || 0) * (item.kg_per_piece || 0),
    0
  );
  const totalQuintals = (totalWeightKg / 100).toFixed(1);
  const lowStockCount = items.filter(
    (item) => item.low_stock_pieces && (item.pieces_in_stock || 0) <= item.low_stock_pieces
  ).length;

  // Selected item for recent movement preview (default first item)
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const activeItem = items.find((i) => i.id === selectedItemId) || items[0];

  // Quick Add Item Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemKg, setNewItemKg] = useState<number | ''>(30);
  const [newItemRate, setNewItemRate] = useState<number | ''>(11000);
  const [newItemUnit, setNewItemUnit] = useState<'per_quintal' | 'per_kg' | 'per_piece'>('per_quintal');
  const [newItemLowStock, setNewItemLowStock] = useState<number | ''>(20);

  // Stock In Modal State
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [targetItemForStockIn, setTargetItemForStockIn] = useState<Item | null>(null);
  const [stockInPieces, setStockInPieces] = useState<number | ''>(50);
  const [stockInNote, setStockInNote] = useState('');

  // Adjust Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetItemForAdjust, setTargetItemForAdjust] = useState<Item | null>(null);
  const [adjustPieces, setAdjustPieces] = useState<number | ''>('');
  const [adjustNote, setAdjustNote] = useState('Stock count check');

  // Movements for the selected item
  const itemMovements = stockMovements
    .filter((m) => m.item_id === (activeItem?.id || ''))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleOpenStockIn = (item: Item) => {
    setTargetItemForStockIn(item);
    setStockInPieces(50);
    setStockInNote(`Purchase from mill`);
    setShowStockInModal(true);
  };

  const handleOpenAdjust = (item: Item) => {
    setTargetItemForAdjust(item);
    setAdjustPieces('');
    setAdjustNote('Physical bag recount');
    setShowAdjustModal(true);
  };

  const handleSubmitStockIn = () => {
    if (!targetItemForStockIn || !stockInPieces || stockInPieces <= 0) return;
    addStockIn(targetItemForStockIn.id, Number(stockInPieces), stockInNote);
    setShowStockInModal(false);
  };

  const handleSubmitAdjust = () => {
    if (!targetItemForAdjust || adjustPieces === '' || adjustPieces === 0) return;
    addStockAdjustment(targetItemForAdjust.id, Number(adjustPieces), adjustNote);
    setShowAdjustModal(false);
  };

  const handleCreateNewCommodity = () => {
    if (!newItemName.trim() || !newItemKg || Number(newItemKg) <= 0) return;
    const res = addItem({
      name: newItemName.trim(),
      kg_per_piece: Number(newItemKg),
      default_rate: newItemRate === '' ? undefined : Number(newItemRate),
      rate_unit: newItemUnit,
      low_stock_pieces: newItemLowStock === '' ? undefined : Number(newItemLowStock),
      is_active: true,
    });
    if (res.success && res.item) {
      setSelectedItemId(res.item.id);
      setShowAddItemModal(false);
      setNewItemName('');
    }
  };

  return (
    <div className="pb-28 lg:pb-12 pt-1 space-y-6 animate-fade-in">
      {/* 1. Header with Top Stock Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#184E3A] bg-[#E7EFE9] px-2.5 py-0.5 rounded-full">
              Warehouse Inventory
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#19221E] tracking-tight mt-1">
            {t.stock} · {t.stockHindi}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#56645E] mt-0.5">
            {items.length} Mandi Commodities Registered · Total Warehouse Inventory
          </p>
        </div>

        <button
          onClick={() => setShowAddItemModal(true)}
          className="px-4 py-2.5 bg-[#184E3A] hover:bg-[#123E2E] text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Commodity</span>
        </button>
      </div>

      {/* Top Metric Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-3xl border border-[#E5DFD1] shadow-xs">
          <span className="text-[11px] font-black uppercase text-[#56645E] block">Total Pieces</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#19221E]">
              {formatIndianNumber(totalPiecesInHand)}
            </span>
            <span className="text-xs font-bold text-[#56645E]">Bags</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E5DFD1] shadow-xs">
          <span className="text-[11px] font-black uppercase text-[#56645E] block">Total Weight</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#184E3A]">
              {totalQuintals}
            </span>
            <span className="text-xs font-bold text-[#56645E]">Qtl</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E5DFD1] shadow-xs">
          <span className="text-[11px] font-black uppercase text-[#56645E] block">Commodities</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#19221E]">
              {items.length}
            </span>
            <span className="text-xs font-bold text-[#56645E]">Active</span>
          </div>
        </div>

        <div className="bg-[#FCF8EE] p-4 rounded-3xl border border-[#EADBCA] shadow-xs">
          <span className="text-[11px] font-black uppercase text-[#8C3D0E] block">Low Stock Alert</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${lowStockCount > 0 ? 'text-[#C25E1A]' : 'text-emerald-700'}`}>
              {lowStockCount}
            </span>
            <span className="text-xs font-bold text-[#8C3D0E]">Items</span>
          </div>
        </div>
      </div>

      {/* Responsive Grid: 1-col on mobile, 12-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ================= LEFT MAIN: COMMODITY LIST (Col 7 on Desktop) ================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#56645E]">
              Commodity Warehouses
            </h4>
            <span className="text-xs text-[#56645E]">Click to view movement ledger</span>
          </div>

          {items.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-[#E5DFD1] text-center space-y-3 shadow-xs">
              <Package className="w-10 h-10 text-[#184E3A] mx-auto opacity-70" />
              <h3 className="font-extrabold text-base text-[#19221E]">No commodities registered yet</h3>
              <p className="text-xs text-[#56645E] max-w-xs mx-auto">
                Register your trading commodities (e.g. Mung Prestige Pro, Chana, Urad) to track bags and pieces in hand.
              </p>
              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-5 py-2.5 bg-[#184E3A] text-white rounded-2xl text-xs font-black inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add First Commodity</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {items.map((item) => {
                const inStock = item.pieces_in_stock || 0;
                const isLow = item.low_stock_pieces && inStock <= item.low_stock_pieces;
                const totalKg = inStock * (item.kg_per_piece || 0);
                const isSelected = selectedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'border-[#184E3A] ring-2 ring-[#184E3A]/20 bg-[#FDFAF3]'
                        : 'border-[#E5DFD1] hover:border-[#C8BFAC]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="pr-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-[#19221E] leading-snug truncate">
                            {item.name}
                          </h3>
                          {isSelected && (
                            <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-[#184E3A]" />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#56645E] mt-0.5">
                          {formatIndianNumber(totalKg)} kg · {item.kg_per_piece} kg per bag packing
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-mono font-bold text-[#184E3A] bg-[#E7EFE9] px-2 py-0.5 rounded-lg">
                            Rate: ₹{formatIndianNumber(item.default_rate || 0)}/{item.rate_unit === 'per_quintal' ? 'Qtl' : 'kg'}
                          </span>
                          {isLow && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#C25E1A] text-white text-[10px] font-black tracking-wide">
                              {t.lowStockBadge}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-baseline justify-end gap-1">
                          <span
                            className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                              isLow ? 'text-[#C25E1A]' : 'text-[#19221E]'
                            }`}
                          >
                            {formatIndianNumber(inStock)}
                          </span>
                          <span className="text-xs font-black text-[#56645E]">{t.pcs}</span>
                        </div>
                        <span className="text-[11px] font-bold text-[#56645E] block mt-0.5">
                          {(totalKg / 100).toFixed(1)} Qtl
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Stock In & Adjust */}
                    <div className="grid grid-cols-2 gap-3 pt-4 mt-2 border-t border-[#F2ECE1]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStockIn(item);
                        }}
                        className="bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>{t.stockIn} (आवक)</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAdjust(item);
                        }}
                        className="bg-white border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#56645E]" />
                        <span>{t.adjust} (पुनर्गणना)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: STOCK LEDGER FOR ACTIVE ITEM (Col 5 on Desktop) ================= */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#184E3A]" />
              <h4 className="font-extrabold text-sm text-[#19221E] uppercase tracking-wider">
                Commodity Ledger
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-[#184E3A] bg-[#E7EFE9] px-2 py-0.5 rounded-lg truncate max-w-[150px]">
              {activeItem?.name || 'Selected'}
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3.5">
            <div className="flex justify-between items-center pb-3 border-b border-[#F2ECE1]">
              <div>
                <p className="font-black text-base text-[#19221E]">{activeItem?.name}</p>
                <p className="text-xs text-[#56645E]">
                  Packing: {activeItem?.kg_per_piece} kg · Min: {activeItem?.low_stock_pieces || 10} bags
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-[#19221E]">
                  {formatIndianNumber(activeItem?.pieces_in_stock || 0)}
                </span>
                <span className="text-xs font-bold text-[#56645E] ml-1">Bags</span>
              </div>
            </div>

            {/* Movement Entries */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {itemMovements.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#56645E] bg-[#F9F6F0] rounded-2xl">
                  No stock entries logged for this item yet.
                </div>
              ) : (
                itemMovements.map((mov) => {
                  const isPositive = mov.pieces > 0;
                  return (
                    <div
                      key={mov.id}
                      className="p-3 rounded-2xl bg-[#F9F6F0] border border-[#E5DFD1]/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-orange-100 text-[#C25E1A]'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#19221E] truncate">
                            {mov.note || (isPositive ? 'Stock In (Mill)' : 'Sale Bill')}
                          </p>
                          <p className="text-[10px] text-[#56645E]">{formatDate(mov.moved_on, 'short')}</p>
                        </div>
                      </div>

                      <span
                        className={`text-sm font-black font-mono shrink-0 ${
                          isPositive ? 'text-emerald-700' : 'text-[#19221E]'
                        }`}
                      >
                        {isPositive ? `+${mov.pieces}` : `${mov.pieces}`} pcs
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Commodity Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#19221E]">New Trading Commodity</h3>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] text-[#56645E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">Commodity Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mung Prestige Pro / Chana"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#56645E] block mb-1">Bag Packing (Kg) *</label>
                  <input
                    type="number"
                    value={newItemKg}
                    onChange={(e) =>
                      setNewItemKg(e.target.value === '' ? '' : Math.max(1, parseFloat(e.target.value) || 0))
                    }
                    className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold font-mono focus:outline-none focus:border-[#184E3A]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#56645E] block mb-1">Low Stock Warning</label>
                  <input
                    type="number"
                    value={newItemLowStock}
                    onChange={(e) =>
                      setNewItemLowStock(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold font-mono focus:outline-none focus:border-[#184E3A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">Default Rate (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newItemRate}
                    onChange={(e) =>
                      setNewItemRate(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="flex-1 bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold font-mono focus:outline-none focus:border-[#184E3A]"
                  />
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value as any)}
                    className="bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl px-3 text-xs font-bold"
                  >
                    <option value="per_quintal">/ Quintal</option>
                    <option value="per_kg">/ Kg</option>
                    <option value="per_piece">/ Bag</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[#F3EFE6] text-[#56645E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewCommodity}
                disabled={!newItemName.trim() || !newItemKg}
                className="flex-1 py-3 rounded-2xl font-black text-sm bg-[#184E3A] text-white disabled:opacity-50"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      {showStockInModal && targetItemForStockIn && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#19221E]">{t.stockIn} (आवक)</h3>
                <p className="text-xs text-[#56645E]">{targetItemForStockIn.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowStockInModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] text-[#56645E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Received Bags / Pieces *
                </label>
                <input
                  type="number"
                  value={stockInPieces}
                  onChange={(e) =>
                    setStockInPieces(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0))
                  }
                  className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-base font-black font-mono focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Source / Supplier / Mill
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purchase from Guntur mill"
                  value={stockInNote}
                  onChange={(e) => setStockInNote(e.target.value)}
                  className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowStockInModal(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[#F3EFE6] text-[#56645E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitStockIn}
                disabled={!stockInPieces || stockInPieces <= 0}
                className="flex-1 py-3 rounded-2xl font-black text-sm bg-[#184E3A] text-white disabled:opacity-50"
              >
                Add to Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && targetItemForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#19221E]">{t.adjust} (पुनर्गणना)</h3>
                <p className="text-xs text-[#56645E]">{targetItemForAdjust.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] text-[#56645E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Pieces Adjustment (+ or -) *
                </label>
                <input
                  type="number"
                  placeholder="+5 or -5"
                  value={adjustPieces}
                  onChange={(e) =>
                    setAdjustPieces(e.target.value === '' ? '' : parseInt(e.target.value) || 0)
                  }
                  className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-base font-black font-mono focus:outline-none focus:border-[#184E3A]"
                />
                <p className="text-[10px] text-[#56645E] mt-1">
                  Current stock in warehouse: {targetItemForAdjust.pieces_in_stock} bags
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full bg-[#F9F6F0] border border-[#D9D2C3] rounded-2xl p-2.5 text-sm font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[#F3EFE6] text-[#56645E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAdjust}
                disabled={adjustPieces === '' || adjustPieces === 0}
                className="flex-1 py-3 rounded-2xl font-black text-sm bg-[#184E3A] text-white disabled:opacity-50"
              >
                Confirm Recount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
