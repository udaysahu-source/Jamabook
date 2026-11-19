// src/components/StockScreen.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatIndianNumber, formatDate } from '@/lib/formatters';
import { Plus, SlidersHorizontal, AlertTriangle, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { Item } from '@/types';

export function StockScreen() {
  const { language, items, stockMovements, addStockIn, addStockAdjustment, addItem } = useJamabook();
  const t = getT(language);

  const totalPiecesInHand = items.reduce((sum, item) => sum + (item.pieces_in_stock || 0), 0);

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
    <div className="pb-28 pt-2 space-y-5 animate-fade-in">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#19221E] tracking-tight">
            {t.stock} · {t.stockHindi}
          </h2>
          <p className="text-sm font-semibold text-[#56645E] mt-0.5">
            {items.length} {t.items} · {formatIndianNumber(totalPiecesInHand)} {t.stockInHand}
          </p>
        </div>
        <button
          onClick={() => setShowAddItemModal(true)}
          className="px-3.5 py-1.5 bg-[#184E3A] text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-[#123E2E] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* 2. Item Cards (Matching Screen 5) */}
      <div className="space-y-3.5">
        {items.length === 0 ? (
          <div className="bg-white p-6 rounded-3xl border border-[#E5DFD1] text-center space-y-3 shadow-xs">
            <h3 className="font-extrabold text-base text-[#19221E]">No commodities registered yet</h3>
            <p className="text-xs text-[#56645E] max-w-xs mx-auto">
              Register your trading commodities (e.g. Mung Prestige Pro, Chana, Urad) to track bags and pieces in hand.
            </p>
            <button
              onClick={() => setShowAddItemModal(true)}
              className="px-4 py-2.5 bg-[#184E3A] text-white rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add First Commodity</span>
            </button>
          </div>
        ) : (
          items.map((item) => {
            const inStock = item.pieces_in_stock || 0;
            const isLow = item.low_stock_pieces && inStock <= item.low_stock_pieces;
            const totalKg = inStock * (item.kg_per_piece || 0);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer shadow-xs ${
                  selectedItemId === item.id
                    ? 'border-[#184E3A] ring-1 ring-[#184E3A]/20'
                    : 'border-[#E5DFD1] hover:border-[#D0C6B4]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="pr-2">
                    <h3 className="text-lg font-black text-[#19221E] leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs font-semibold text-[#56645E] mt-0.5">
                      {formatIndianNumber(totalKg)} kg · {item.kg_per_piece} kg per piece
                    </p>
                    {isLow && (
                      <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#C25E1A] text-white text-[11px] font-bold tracking-wide">
                        {t.lowStockBadge}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-4xl font-black tracking-tight ${
                        isLow ? 'text-[#C25E1A]' : 'text-[#19221E]'
                      }`}
                    >
                      {formatIndianNumber(inStock)}
                    </span>
                    <span className="text-sm font-bold text-[#56645E] ml-1">
                      {t.pcs}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Stock In & Adjust */}
                <div className="grid grid-cols-2 gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenStockIn(item);
                    }}
                    className="bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>{t.stockIn}</span>
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
                    <span>{t.adjust}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Recent Movement Ledger (Matching Screen 5) */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-extrabold text-sm text-[#19221E] tracking-tight">
            {t.recentMovement} · {activeItem?.name}
          </h4>
          <span className="text-xs font-semibold text-[#56645E]">
            Ledger
          </span>
        </div>

        <div className="space-y-2">
          {itemMovements.length === 0 ? (
            <div className="bg-white p-4 rounded-2xl border border-[#E5DFD1] text-center text-xs text-[#56645E]">
              No movements recorded for this item yet.
            </div>
          ) : (
            itemMovements.slice(0, 6).map((mov) => {
              const isPositive = mov.pieces > 0;
              return (
                <div
                  key={mov.id}
                  className="bg-white p-3.5 rounded-2xl border border-[#E5DFD1] flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-base font-black w-14 ${
                        isPositive ? 'text-[#184E3A]' : 'text-[#19221E]'
                      }`}
                    >
                      {isPositive ? `+${mov.pieces}` : `${mov.pieces}`}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#19221E] truncate">
                        {mov.note || (isPositive ? 'Purchase' : 'Sale')}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-[#56645E] shrink-0">
                    {formatDate(mov.moved_on, 'short')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Stock In Modal */}
      {showStockInModal && targetItemForStockIn && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#19221E]">Stock In (Purchase)</h3>
                <p className="text-xs text-[#56645E]">{targetItemForStockIn.name}</p>
              </div>
              <button
                onClick={() => setShowStockInModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] text-[#56645E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Pieces to Add *
                </label>
                <input
                  type="number"
                  value={stockInPieces}
                  onChange={(e) =>
                    setStockInPieces(e.target.value === '' ? '' : parseInt(e.target.value) || 0)
                  }
                  className="w-full border border-[#D9D2C3] rounded-2xl p-3 text-xl font-black text-center focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Supplier / Note (optional)
                </label>
                <input
                  type="text"
                  value={stockInNote}
                  onChange={(e) => setStockInNote(e.target.value)}
                  placeholder="e.g. Received from mill"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowStockInModal(false)}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#F3EFE6] text-[#56645E]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitStockIn}
                disabled={!stockInPieces || stockInPieces <= 0}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#184E3A] text-white disabled:opacity-50"
              >
                Save Stock In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && targetItemForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#19221E]">Adjust Stock</h3>
                <p className="text-xs text-[#56645E]">{targetItemForAdjust.name}</p>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] text-[#56645E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Pieces difference (+ to add, - to reduce) *
                </label>
                <input
                  type="number"
                  placeholder="+5 or -5"
                  value={adjustPieces}
                  onChange={(e) =>
                    setAdjustPieces(e.target.value === '' ? '' : parseInt(e.target.value) || 0)
                  }
                  className="w-full border border-[#D9D2C3] rounded-2xl p-3 text-xl font-black text-center focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Physical recount / Damaged bag"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#F3EFE6] text-[#56645E]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAdjust}
                disabled={adjustPieces === '' || adjustPieces === 0}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#184E3A] text-white disabled:opacity-50"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Commodity Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#19221E]">Add Commodity</h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3EFE6] text-[#56645E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Item / Commodity Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mung Prestige Pro"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold focus:outline-none focus:border-[#184E3A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#56645E] block mb-1">
                    Kg per piece *
                  </label>
                  <input
                    type="number"
                    value={newItemKg}
                    onChange={(e) =>
                      setNewItemKg(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                    }
                    className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold focus:outline-none focus:border-[#184E3A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#56645E] block mb-1">
                    Default Rate ₹
                  </label>
                  <input
                    type="number"
                    value={newItemRate}
                    onChange={(e) =>
                      setNewItemRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                    }
                    className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold focus:outline-none focus:border-[#184E3A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Rate Unit
                </label>
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value as any)}
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2 text-xs font-bold bg-white"
                >
                  <option value="per_quintal">Per Quintal (100 kg)</option>
                  <option value="per_kg">Per Kg</option>
                  <option value="per_piece">Per Piece / Bag</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Low Stock Alert (pieces)
                </label>
                <input
                  type="number"
                  value={newItemLowStock}
                  onChange={(e) =>
                    setNewItemLowStock(e.target.value === '' ? '' : parseInt(e.target.value) || 0)
                  }
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#F3EFE6] text-[#56645E]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewCommodity}
                disabled={!newItemName.trim() || !newItemKg || Number(newItemKg) <= 0}
                className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#184E3A] text-white disabled:opacity-50"
              >
                Save Commodity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
