// src/components/SettingsScreen.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { Download, Building2, Users, Package, RefreshCw, Plus, Check } from 'lucide-react';
import { formatIndianNumber } from '@/lib/formatters';

export function SettingsScreen() {
  const {
    user,
    logout,
    language,
    toggleLanguage,
    business,
    parties,
    items,
    invoices,
    stockMovements,
    clearLedger,
    loadDemoData,
    addParty,
    addItem,
  } = useJamabook();
  const t = getT(language);

  const [activeTab, setActiveTab] = useState<'biz' | 'parties' | 'items' | 'export'>('biz');

  // New Party State
  const [showAddParty, setShowAddParty] = useState(false);
  const [pName, setPName] = useState('');
  const [pTown, setPTown] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pType, setPType] = useState<'buyer' | 'transporter' | 'broker'>('buyer');

  // New Item State
  const [showAddItem, setShowAddItem] = useState(false);
  const [iName, setIName] = useState('');
  const [iKg, setIKg] = useState<number | ''>(30);
  const [iRate, setIRate] = useState<number | ''>(10000);
  const [iUnit, setIUnit] = useState<'per_quintal' | 'per_kg' | 'per_piece'>('per_quintal');
  const [iLowStock, setILowStock] = useState<number | ''>(15);

  const handleCreateParty = () => {
    if (!pName.trim()) return;
    addParty({
      name: pName.trim(),
      town: pTown.trim() || undefined,
      phone: pPhone.trim() || undefined,
      is_buyer: pType === 'buyer',
      is_transporter: pType === 'transporter',
      is_broker: pType === 'broker',
      is_active: true,
    });
    setShowAddParty(false);
    setPName('');
    setPTown('');
    setPPhone('');
  };

  const handleCreateItem = () => {
    if (!iName.trim() || !iKg || Number(iKg) <= 0) return;
    addItem({
      name: iName.trim(),
      kg_per_piece: Number(iKg),
      default_rate: iRate === '' ? undefined : Number(iRate),
      rate_unit: iUnit,
      low_stock_pieces: iLowStock === '' ? undefined : Number(iLowStock),
      is_active: true,
    });
    setShowAddItem(false);
    setIName('');
  };

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportInvoices = () => {
    const rows = invoices.map((inv) => ({
      'Bill No': inv.bill_no,
      Date: inv.bill_date,
      Buyer: inv.buyer_name,
      Town: inv.buyer_town || '',
      Transport: inv.transporter_name || '',
      Subtotal: inv.subtotal,
      'Extra Charges': inv.extra_charges,
      Total: inv.total,
      Status: inv.status,
    }));
    exportCSV(rows, `RTC-Invoices-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportStock = () => {
    const rows = stockMovements.map((mov) => {
      const it = items.find((i) => i.id === mov.item_id);
      return {
        Date: mov.moved_on,
        Material: it?.name || mov.item_id,
        Pieces: mov.pieces,
        Type: mov.movement_type,
        Note: mov.note || '',
      };
    });
    exportCSV(rows, `RTC-Stock-Ledger-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="pb-28 pt-2 space-y-4 animate-fade-in max-w-md mx-auto">
      {/* 1. Header */}
      <div>
        <h2 className="text-3xl font-black text-[#19221E] tracking-tight">
          {t.settings}
        </h2>
        <p className="text-xs font-semibold text-[#56645E] mt-0.5">
          Business details, master lists & Excel export
        </p>
      </div>

      {/* 2. Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-[#F1EBE1] p-1 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('biz')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'biz'
              ? 'bg-[#184E3A] text-white shadow-xs'
              : 'text-[#56645E] hover:text-[#19221E]'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('parties')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'parties'
              ? 'bg-[#184E3A] text-white shadow-xs'
              : 'text-[#56645E] hover:text-[#19221E]'
          }`}
        >
          Parties
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'items'
              ? 'bg-[#184E3A] text-white shadow-xs'
              : 'text-[#56645E] hover:text-[#19221E]'
          }`}
        >
          Items
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'export'
              ? 'bg-[#184E3A] text-white shadow-xs'
              : 'text-[#56645E] hover:text-[#19221E]'
          }`}
        >
          Export
        </button>
      </div>

      {/* Tab 1: Business Profile */}
      {activeTab === 'biz' && (
        <div className="space-y-3.5">
          <div className="bg-white p-4.5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#184E3A] text-white flex items-center justify-center font-black text-lg shadow-sm">
                RTC
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#19221E]">
                  {business.name}
                </h3>
                <p className="text-xs text-[#56645E] font-medium">Grain & Mandi Trader</p>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1 border-t border-[#F2ECE1]">
              <div className="flex justify-between py-1">
                <span className="text-[#56645E] font-semibold">Address:</span>
                <span className="font-bold text-[#19221E] text-right max-w-[200px]">
                  {business.address}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#56645E] font-semibold">Phone:</span>
                <span className="font-bold text-[#19221E]">{business.phone}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#56645E] font-semibold">GSTIN:</span>
                <span className="font-bold text-[#19221E]">{business.gstin}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#56645E] font-semibold">Next Bill Counter:</span>
                <span className="font-black text-sm text-[#184E3A]">
                  #{business.next_bill_no}
                </span>
              </div>
            </div>
          </div>

          {/* User Account & Authorization Card */}
          <div className="bg-white p-4 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#56645E] block">
                  Logged in as
                </span>
                <p className="text-xs font-bold text-[#19221E] truncate max-w-[200px]">
                  {user?.email || 'trader@rtc.com'}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#E7EFE9] text-[#184E3A]">
                {user?.role || 'owner'}
              </span>
            </div>

            <button
              onClick={logout}
              className="w-full py-2.5 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors text-center block"
            >
              Log Out of Account
            </button>
          </div>

          {/* Language Selector */}
          <div className="bg-white p-4 rounded-3xl border border-[#E5DFD1] shadow-xs flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-[#19221E]">Language / भाषा</h4>
              <p className="text-xs text-[#56645E]">Switch between English & Hindi</p>
            </div>
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 bg-[#F2ECE1] hover:bg-[#E5DFD1] text-[#184E3A] font-extrabold text-xs rounded-2xl transition-colors"
            >
              {t.langToggle}
            </button>
          </div>

          {/* Demo & Clean Ledger Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                loadDemoData();
                alert('Loaded realistic Mandi demo data (Radha Krishna Traders - RTC)!');
              }}
              className="text-xs font-bold text-[#184E3A] bg-[#E7EFE9] hover:bg-[#D5E4D8] px-4 py-2 rounded-2xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Realistic Mandi Demo Data</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Clear all ledger entries and start with a fresh clean state?')) {
                  clearLedger();
                }
              }}
              className="text-xs font-bold text-[#C25E1A] hover:underline flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clear Ledger Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Parties */}
      {activeTab === 'parties' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56645E]">
              {parties.length} registered parties
            </span>
            <button
              onClick={() => setShowAddParty(true)}
              className="px-3 py-1.5 bg-[#184E3A] text-white rounded-full text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Party
            </button>
          </div>

          <div className="space-y-2">
            {parties.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3.5 rounded-2xl border border-[#E5DFD1] flex items-center justify-between shadow-2xs"
              >
                <div>
                  <h4 className="font-bold text-sm text-[#19221E]">{p.name}</h4>
                  <p className="text-xs text-[#56645E]">
                    {p.town || 'No town'} {p.phone ? `· ${p.phone}` : ''}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E7EFE9] text-[#184E3A]">
                  {p.is_buyer ? 'Buyer' : p.is_transporter ? 'Transport' : 'Broker'}
                </span>
              </div>
            ))}
          </div>

          {/* Add Party Modal */}
          {showAddParty && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl">
                <h3 className="font-black text-base text-[#19221E]">Add New Party</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#56645E] block mb-1">Name *</label>
                    <input
                      type="text"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#56645E] block mb-1">Town / Mandi</label>
                    <input
                      type="text"
                      value={pTown}
                      onChange={(e) => setPTown(e.target.value)}
                      className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#56645E] block mb-1">Role / Type</label>
                    <select
                      value={pType}
                      onChange={(e) => setPType(e.target.value as any)}
                      className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold bg-white"
                    >
                      <option value="buyer">Buyer / Customer</option>
                      <option value="transporter">Transporter</option>
                      <option value="broker">Broker / Dalal</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowAddParty(false)}
                    className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#F3EFE6] text-[#56645E]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateParty}
                    disabled={!pName.trim()}
                    className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#184E3A] text-white disabled:opacity-50"
                  >
                    Save Party
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Items */}
      {activeTab === 'items' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56645E]">
              {items.length} commodities
            </span>
            <button
              onClick={() => setShowAddItem(true)}
              className="px-3 py-1.5 bg-[#184E3A] text-white rounded-full text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="bg-white p-3.5 rounded-2xl border border-[#E5DFD1] flex items-center justify-between shadow-2xs"
              >
                <div>
                  <h4 className="font-bold text-sm text-[#19221E]">{it.name}</h4>
                  <p className="text-xs text-[#56645E]">
                    {it.kg_per_piece} kg/pc · Default rate: ₹{it.default_rate || 0} /{' '}
                    {it.rate_unit === 'per_quintal' ? 'qtl' : 'pc'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-[#184E3A]">
                    {it.pieces_in_stock} pcs
                  </span>
                  <span className="text-[10px] text-[#56645E] block">in hand</span>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Modal */}
          {showAddItem && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl">
                <h3 className="font-black text-base text-[#19221E]">Add Commodity Item</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#56645E] block mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={iName}
                      onChange={(e) => setIName(e.target.value)}
                      placeholder="e.g. Chana Desi"
                      className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-[#56645E] block mb-1">Kg / piece *</label>
                      <input
                        type="number"
                        value={iKg}
                        onChange={(e) => setIKg(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#56645E] block mb-1">Rate ₹</label>
                      <input
                        type="number"
                        value={iRate}
                        onChange={(e) => setIRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowAddItem(false)}
                    className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#F3EFE6] text-[#56645E]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateItem}
                    disabled={!iName.trim()}
                    className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-[#184E3A] text-white disabled:opacity-50"
                  >
                    Save Item
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Export to Excel / CSV */}
      {activeTab === 'export' && (
        <div className="space-y-3">
          <div className="bg-white p-4.5 rounded-3xl border border-[#E5DFD1] shadow-xs space-y-3">
            <h3 className="font-extrabold text-base text-[#19221E]">
              1-Tap Data Export
            </h3>
            <p className="text-xs text-[#56645E] leading-relaxed">
              Download clean spreadsheet files directly for accounting, audit, or backup.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleExportInvoices}
                className="w-full bg-[#184E3A] hover:bg-[#123E2E] text-white p-3.5 rounded-2xl font-bold text-xs flex items-center justify-between shadow-2xs transition-all active:scale-[0.99]"
              >
                <span>Export All Invoices (CSV)</span>
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportStock}
                className="w-full bg-white border border-[#D9D2C3] hover:bg-[#F2ECE1] text-[#19221E] p-3.5 rounded-2xl font-bold text-xs flex items-center justify-between shadow-2xs transition-colors active:scale-[0.99]"
              >
                <span>Export Stock Ledger (CSV)</span>
                <Download className="w-4 h-4 text-[#56645E]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
