// src/components/OnboardingModal.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { Building2, Landmark, Receipt, ArrowRight, ShieldCheck } from 'lucide-react';
import { BusinessProfileSchema } from '@/lib/validations';

export function OnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { business, updateBusinessProfile } = useJamabook();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(business.name || '');
  const [address, setAddress] = useState(business.address || '');
  const [phone, setPhone] = useState(business.phone || '');
  const [gstin, setGstin] = useState(business.gstin || '');
  const [state, setState] = useState(business.state || 'Gujarat');
  const [stateCode, setStateCode] = useState(business.state_code || '24');
  const [email, setEmail] = useState(business.email || '');

  // Step 2: Invoice Setup
  const [billPrefix, setBillPrefix] = useState(business.bill_prefix || '');
  const [nextBillNo, setNextBillNo] = useState<number>(business.next_bill_no || 4450);

  // Step 3: Banking & Tally Details
  const [bankName, setBankName] = useState(business.bank_name || '');
  const [bankAccount, setBankAccount] = useState(business.bank_account || '');
  const [bankIfsc, setBankIfsc] = useState(business.bank_ifsc || '');
  const [bankBranch, setBankBranch] = useState(business.bank_branch || '');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleComplete = () => {
    if (!name.trim()) {
      setError('Business name is required');
      setStep(1);
      return;
    }

    const updates = {
      name: name.trim(),
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      state: state.trim() || undefined,
      state_code: stateCode.trim() || undefined,
      email: email.trim() || undefined,
      bill_prefix: billPrefix.trim(),
      next_bill_no: Number(nextBillNo) || 4450,
      bank_name: bankName.trim() || undefined,
      bank_account: bankAccount.trim() || undefined,
      bank_ifsc: bankIfsc.trim().toUpperCase() || undefined,
      bank_branch: bankBranch.trim() || undefined,
      is_onboarded: true,
    };

    const res = updateBusinessProfile(updates);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to save business profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E5DFD1] space-y-5 animate-in zoom-in-95">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#F2ECE1] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#184E3A] text-white flex items-center justify-center font-black text-sm">
              {step}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#19221E]">
                {step === 1 && 'Business Profile'}
                {step === 2 && 'Invoice & Bill Numbering'}
                {step === 3 && 'Bank & Tally Details'}
              </h3>
              <p className="text-[11px] text-[#56645E]">Step {step} of 3</p>
            </div>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-6 h-1.5 rounded-full transition-colors ${
                  s === step ? 'bg-[#184E3A]' : s < step ? 'bg-[#2E7D32]' : 'bg-[#E5DFD1]'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-[#56645E] block mb-1">
                Firm / Trader Business Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Radha Krishna Traders (RTC)"
                className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-bold focus:border-[#184E3A] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#56645E] block mb-1">
                APMC Mandi / Shop Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop No. 14, APMC Market Yard No. 2, Unjha"
                className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-medium focus:border-[#184E3A] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#56645E] block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98250 12345"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-medium focus:border-[#184E3A] outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#56645E] block mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="24AABCR4450F1Z2"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-medium font-mono uppercase focus:border-[#184E3A] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#56645E] block mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Gujarat / Rajasthan"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-medium focus:border-[#184E3A] outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#56645E] block mb-1">State Code</label>
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="e.g. 24 or 08"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-medium focus:border-[#184E3A] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Invoice Setup */}
        {step === 2 && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF8F3] rounded-2xl border border-[#E5DFD1] text-[11px] text-[#56645E] leading-relaxed">
              Bills increment automatically starting from your current physical paper slip book number.
            </div>

            <div>
              <label className="font-bold text-[#56645E] block mb-1">
                Starting Next Bill Number *
              </label>
              <input
                type="number"
                value={nextBillNo}
                onChange={(e) => setNextBillNo(Number(e.target.value))}
                placeholder="4450"
                className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-black text-sm text-[#184E3A] focus:border-[#184E3A] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#56645E] block mb-1">
                Invoice Prefix (Optional)
              </label>
              <input
                type="text"
                value={billPrefix}
                onChange={(e) => setBillPrefix(e.target.value)}
                placeholder="e.g. RTC/ or leave blank"
                className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-mono focus:border-[#184E3A] outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Bank Details for Tally Invoices & Ledger */}
        {step === 3 && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF8F3] rounded-2xl border border-[#E5DFD1] text-[11px] text-[#56645E] leading-relaxed">
              These details print directly onto your Tally-style invoices and ledger PDFs so buyers can pay via NEFT/RTGS.
            </div>

            <div>
              <label className="font-bold text-[#56645E] block mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-bold focus:border-[#184E3A] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#56645E] block mb-1">Bank Account Number</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. 30894562109"
                className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-mono focus:border-[#184E3A] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#56645E] block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  placeholder="SBIN0001234"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 font-mono uppercase focus:border-[#184E3A] outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#56645E] block mb-1">Branch Name</label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="APMC Yard Branch"
                  className="w-full border border-[#D9D2C3] rounded-2xl p-2.5 focus:border-[#184E3A] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-2 pt-2 border-t border-[#F2ECE1]">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2.5 rounded-2xl bg-[#F3EFE6] text-[#56645E] font-bold text-xs"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  setError('Business name is required');
                  return;
                }
                setError(null);
                setStep((s) => (s + 1) as any);
              }}
              className="flex-1 py-2.5 rounded-2xl bg-[#184E3A] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-[#123E2E]"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 py-2.5 rounded-2xl bg-[#184E3A] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-[#123E2E]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Complete Onboarding</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
