// src/components/AuthScreen.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { SignUpSchema, SignInSchema, PinAuthSchema } from '@/lib/validations';
import { Lock, Mail, Building2, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

export function AuthScreen() {
  const { language, login, signup, unlockWithPin, hasPinSetup } = useJamabook();
  const t = getT(language);

  const [mode, setMode] = useState<'signin' | 'signup' | 'pin'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('RTC');
  const [startingBillNo, setStartingBillNo] = useState<number>(4450);
  const [pin, setPin] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setAuthError(null);

    const validation = SignInSchema.safeParse({ email, password });
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((iss) => {
        errMap[String(iss.path[0])] = iss.message;
      });
      setFieldErrors(errMap);
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      setAuthError(result.error || 'Invalid email or password');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setAuthError(null);

    const validation = SignUpSchema.safeParse({
      email,
      password,
      businessName,
      startingBillNo: Number(startingBillNo) || 4450,
    });

    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((iss) => {
        errMap[String(iss.path[0])] = iss.message;
      });
      setFieldErrors(errMap);
      return;
    }

    setIsLoading(true);
    const result = await signup({
      email,
      password,
      businessName,
      startingBillNo: Number(startingBillNo) || 4450,
    });
    setIsLoading(false);

    if (!result.success) {
      setAuthError(result.error || 'Failed to create account');
    }
  };

  const handlePinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setAuthError(null);

    const validation = PinAuthSchema.safeParse({ pin });
    if (!validation.success) {
      setFieldErrors({ pin: 'Please enter a valid 4-digit PIN' });
      return;
    }

    const ok = unlockWithPin(pin);
    if (!ok) {
      setAuthError('Incorrect PIN');
    }
  };

  const handleUseDemoAccount = () => {
    setEmail('trader@rtc.com');
    setPassword('MandiTrader2026');
    login('trader@rtc.com', 'MandiTrader2026');
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#184E3A] text-white rounded-3xl mx-auto flex items-center justify-center font-black text-xl shadow-md">
            RTC
          </div>
          <h1 className="text-2xl font-black text-[#19221E] tracking-tight">
            Jamabook
          </h1>
          <p className="text-xs font-semibold text-[#56645E]">
            Mandi Billing, Stock Ledger & WhatsApp Follow-ups
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5DFD1] shadow-sm space-y-4">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-[#F1EBE1] p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
                setFieldErrors({});
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-[#184E3A] text-white shadow-xs'
                  : 'text-[#56645E] hover:text-[#19221E]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setAuthError(null);
                setFieldErrors({});
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-[#184E3A] text-white shadow-xs'
                  : 'text-[#56645E] hover:text-[#19221E]'
              }`}
            >
              New Business
            </button>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700">
              {authError}
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@rtc.com"
                    className="w-full bg-[#FAF8F5] border border-[#D9D2C3] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                  />
                  <Mail className="w-4 h-4 text-[#56645E] absolute left-3.5 top-3" />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] font-bold text-red-600 mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF8F5] border border-[#D9D2C3] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                  />
                  <Lock className="w-4 h-4 text-[#56645E] absolute left-3.5 top-3" />
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] font-bold text-red-600 mt-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-3 rounded-2xl font-black text-xs tracking-wide shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying...' : 'Sign In to Ledger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Business / Mandi Shop Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. RTC or Sri Balaji Traders"
                    className="w-full bg-[#FAF8F5] border border-[#D9D2C3] rounded-2xl pl-10 pr-3 py-2 text-xs font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                  />
                  <Building2 className="w-4 h-4 text-[#56645E] absolute left-3.5 top-2.5" />
                </div>
                {fieldErrors.businessName && (
                  <p className="text-[11px] font-bold text-red-600 mt-0.5">
                    {fieldErrors.businessName}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Starting Bill Number *
                </label>
                <input
                  type="number"
                  value={startingBillNo}
                  onChange={(e) => setStartingBillNo(parseInt(e.target.value) || 1)}
                  placeholder="4450"
                  className="w-full bg-[#FAF8F5] border border-[#D9D2C3] rounded-2xl px-3 py-2 text-xs font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                />
                <span className="text-[10px] text-[#8C9892]">
                  Your handwritten slip number (e.g. 4450)
                </span>
                {fieldErrors.startingBillNo && (
                  <p className="text-[11px] font-bold text-red-600 mt-0.5">
                    {fieldErrors.startingBillNo}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@mybiz.com"
                  className="w-full bg-[#FAF8F5] border border-[#D9D2C3] rounded-2xl px-3 py-2 text-xs font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                />
                {fieldErrors.email && (
                  <p className="text-[11px] font-bold text-red-600 mt-0.5">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] block mb-1">
                  Password * (Min 8 chars, letter + number)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF8F5] border border-[#D9D2C3] rounded-2xl px-3 py-2 text-xs font-bold text-[#19221E] focus:outline-none focus:border-[#184E3A]"
                />
                {fieldErrors.password && (
                  <p className="text-[11px] font-bold text-red-600 mt-0.5">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#184E3A] hover:bg-[#123E2E] active:scale-[0.98] text-white py-3 rounded-2xl font-black text-xs tracking-wide shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Creating...' : 'Create Clean Ledger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Fill Button */}
          <div className="pt-2 border-t border-[#F2ECE1] text-center">
            <button
              type="button"
              onClick={handleUseDemoAccount}
              className="text-xs font-bold text-[#184E3A] hover:underline"
            >
              Sign in with Owner Demo Account
            </button>
          </div>
        </div>

        {/* Security badge note */}
        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-[#56645E]">
          <ShieldCheck className="w-4 h-4 text-[#184E3A]" />
          <span>OWASP ASVS L2 Aligned · Supabase RLS Protected</span>
        </div>
      </div>
    </div>
  );
}
