// src/components/AuthScreen.tsx
'use client';

import React, { useState } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { SignUpSchema, SignInSchema, PinAuthSchema } from '@/lib/validations';
import { ThemeToggle, LanguageToggle } from '@/components/ThemeAndLanguageToggles';
import { Lock, Mail, Building2, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

export function AuthScreen() {
  const { language, login, signup, unlockWithPin, hasPinSetup, loadDemoData } = useJamabook();
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

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setAuthError(null);

    const validation = PinAuthSchema.safeParse({ pin });
    if (!validation.success) {
      setFieldErrors({ pin: 'Please enter a valid 4-digit PIN' });
      return;
    }

    setIsLoading(true);
    const ok = await unlockWithPin(pin);
    setIsLoading(false);
    if (!ok) {
      setAuthError('Incorrect PIN');
    }
  };

  const handleUseDemoAccount = () => {
    setEmail('trader@rtc.com');
    setPassword('MandiTrader2026');
    loadDemoData();
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] dark:bg-[#101613] text-[#19221E] dark:text-[#F0F4F2] flex flex-col justify-center items-center px-4 py-8 relative transition-colors duration-200">
      {/* Top right theme & language switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#184E3A] dark:bg-[#226E52] text-white rounded-3xl mx-auto flex items-center justify-center font-black text-xl shadow-md">
            RTC
          </div>
          <h1 className="text-2xl font-black text-[#19221E] dark:text-[#F0F4F2] tracking-tight">
            Jamabook
          </h1>
          <p className="text-xs font-semibold text-[#56645E] dark:text-[#8E9F97]">
            {language === 'hi'
              ? 'मंडी बिलिंग, स्टॉक बहीखाता व तगादा'
              : 'Mandi Billing, Stock Ledger & WhatsApp Follow-ups'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-[#18221D] p-6 rounded-3xl border border-[#E5DFD1] dark:border-[#27362E] shadow-sm space-y-4">
          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-[#F1EBE1] dark:bg-[#131B17] p-1 rounded-2xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
                setFieldErrors({});
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-[#184E3A] dark:bg-[#226E52] text-white shadow-xs'
                  : 'text-[#56645E] dark:text-[#8E9F97] hover:text-[#19221E] dark:hover:text-[#F0F4F2]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('pin');
                setAuthError(null);
                setFieldErrors({});
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'pin'
                  ? 'bg-[#184E3A] dark:bg-[#226E52] text-white shadow-xs'
                  : 'text-[#56645E] dark:text-[#8E9F97] hover:text-[#19221E] dark:hover:text-[#F0F4F2]'
              }`}
            >
              PIN Unlock
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
                  ? 'bg-[#184E3A] dark:bg-[#226E52] text-white shadow-xs'
                  : 'text-[#56645E] dark:text-[#8E9F97] hover:text-[#19221E] dark:hover:text-[#F0F4F2]'
              }`}
            >
              New Firm
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
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@rtc.com"
                    className="w-full bg-[#FAF8F5] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                  />
                  <Mail className="w-4 h-4 text-[#56645E] dark:text-[#8E9F97] absolute left-3.5 top-3" />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF8F5] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                  />
                  <Lock className="w-4 h-4 text-[#56645E] dark:text-[#8E9F97] absolute left-3.5 top-3" />
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">
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

          {/* PIN UNLOCK FORM */}
          {mode === 'pin' && (
            <form onSubmit={handlePinUnlock} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">
                  4-Digit Security PIN *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full bg-[#FAF8F5] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl pl-10 pr-3 py-2.5 text-center text-lg font-black tracking-widest text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                  />
                  <KeyRound className="w-4 h-4 text-[#56645E] dark:text-[#8E9F97] absolute left-3.5 top-3.5" />
                </div>
                {fieldErrors.pin && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">
                    {fieldErrors.pin}
                  </p>
                )}
                <span className="text-[10px] text-[#8C9892] dark:text-[#748780] block mt-1">
                  Enter your device app lock PIN to unlock the ledger.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#184E3A] hover:bg-[#123E2E] dark:bg-[#226E52] dark:hover:bg-[#1A5741] active:scale-[0.98] text-white py-3 rounded-2xl font-black text-xs tracking-wide shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{isLoading ? 'Unlocking...' : 'Unlock Ledger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">
                  Business / Mandi Shop Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. RTC or Sri Balaji Traders"
                    className="w-full bg-[#FAF8F5] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl pl-10 pr-3 py-2 text-xs font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                  />
                  <Building2 className="w-4 h-4 text-[#56645E] dark:text-[#8E9F97] absolute left-3.5 top-2.5" />
                </div>
                {fieldErrors.businessName && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-0.5">
                    {fieldErrors.businessName}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">
                  Starting Bill Number *
                </label>
                <input
                  type="number"
                  value={startingBillNo}
                  onChange={(e) => setStartingBillNo(parseInt(e.target.value) || 1)}
                  placeholder="4450"
                  className="w-full bg-[#FAF8F5] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl px-3 py-2 text-xs font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                />
                <span className="text-[10px] text-[#8C9892] dark:text-[#748780]">
                  Your handwritten slip number (e.g. 4450)
                </span>
                {fieldErrors.startingBillNo && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-0.5">
                    {fieldErrors.startingBillNo}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@mybiz.com"
                  className="w-full bg-[#FAF8F5] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl px-3 py-2 text-xs font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                />
                {fieldErrors.email && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-0.5">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97] block mb-1">
                  Password * (Min 8 chars, letter + number)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF8F5] dark:bg-[#131B17] border border-[#D9D2C3] dark:border-[#27362E] rounded-2xl px-3 py-2 text-xs font-bold text-[#19221E] dark:text-[#F0F4F2] focus:outline-none focus:border-[#184E3A]"
                />
                {fieldErrors.password && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-0.5">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#184E3A] hover:bg-[#123E2E] dark:bg-[#226E52] dark:hover:bg-[#1A5741] active:scale-[0.98] text-white py-3 rounded-2xl font-black text-xs tracking-wide shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Creating...' : 'Create Clean Ledger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Fill Button */}
          <div className="pt-2 border-t border-[#F2ECE1] dark:border-[#27362E] text-center">
            <button
              type="button"
              onClick={handleUseDemoAccount}
              className="text-xs font-bold text-[#184E3A] dark:text-emerald-400 hover:underline"
            >
              Sign in with Owner Demo Account
            </button>
          </div>
        </div>

        {/* Security badge note */}
        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-[#56645E] dark:text-[#8E9F97]">
          <ShieldCheck className="w-4 h-4 text-[#184E3A] dark:text-emerald-400" />
          <span>OWASP ASVS L2 Aligned · Supabase RLS Protected</span>
        </div>
      </div>
    </div>
  );
}
