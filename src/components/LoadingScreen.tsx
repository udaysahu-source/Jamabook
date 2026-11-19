// src/components/LoadingScreen.tsx
'use client';

import React from 'react';

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#F8F5EE] dark:bg-[#101613] text-[#19221E] dark:text-[#F0F4F2] flex flex-col items-center justify-center p-6 select-none transition-colors duration-300">
      <div className="flex flex-col items-center space-y-6 max-w-xs text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Mandi Emblem with Spinning Glow Rings */}
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Glow */}
          <div className="absolute w-24 h-24 rounded-3xl bg-[#184E3A]/20 dark:bg-emerald-500/20 blur-xl animate-pulse" />

          {/* Rotating Gradient Spinner Ring */}
          <div className="absolute w-20 h-20 rounded-3xl border-2 border-transparent border-t-[#184E3A] dark:border-t-emerald-400 border-r-[#C25E1A] dark:border-r-[#E06D24] animate-spin" />

          {/* Center Brand Badge */}
          <div className="w-16 h-16 rounded-2xl bg-[#184E3A] dark:bg-[#1E5C44] text-white flex items-center justify-center font-black text-xl tracking-tight shadow-lg ring-4 ring-white dark:ring-[#16211C]">
            RTC
          </div>
        </div>

        {/* Brand Text */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[#19221E] dark:text-[#F0F4F2]">
            Jamabook
          </h1>
          <p className="text-xs font-bold text-[#56645E] dark:text-[#8E9F97]">
            RTC Mandi Billing &amp; Stock
          </p>
        </div>

        {/* Shimmer Animated Progress Bar */}
        <div className="w-48 h-1.5 bg-[#E5DFD1] dark:bg-[#22332A] rounded-full overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#184E3A] dark:via-emerald-400 to-transparent rounded-full animate-[shimmer_1.5s_infinite]" />
        </div>

        {/* Subtitle / Status */}
        <p className="text-[11px] font-semibold text-[#56645E] dark:text-[#8E9F97] animate-pulse">
          {message || 'खाता व पर्चा लोड हो रहा है... / Loading trader ledger...'}
        </p>
      </div>
    </div>
  );
}
