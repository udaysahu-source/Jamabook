// src/components/ThemeAndLanguageToggles.tsx
'use client';

import React from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { Sun, Moon, Languages } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useJamabook();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative inline-flex items-center h-8 w-14 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#184E3A] focus:ring-offset-2 ${
        isDark
          ? 'bg-[#18261F] border border-[#2B3E33]'
          : 'bg-[#EAE4D6] border border-[#D9D2C3]'
      } ${className}`}
    >
      {/* Sliding thumb */}
      <span
        className={`pointer-events-none inline-flex items-center justify-center h-6 w-6 rounded-full shadow-md transform transition-all duration-300 ease-out ${
          isDark
            ? 'translate-x-6 bg-[#226E52] text-emerald-100 ring-1 ring-emerald-400/40'
            : 'translate-x-0 bg-white text-amber-500 ring-1 ring-amber-300/60'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 fill-current animate-in zoom-in-75 duration-200" />
        ) : (
          <Sun className="w-3.5 h-3.5 fill-current animate-in zoom-in-75 duration-200" />
        )}
      </span>

      {/* Background icons for visual cues */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none select-none text-[10px]">
        <span
          className={`transition-opacity duration-200 ${
            isDark ? 'opacity-0' : 'opacity-40 text-[#56645E]'
          }`}
        >
          <Moon className="w-3 h-3" />
        </span>
        <span
          className={`transition-opacity duration-200 ${
            isDark ? 'opacity-40 text-emerald-300' : 'opacity-0'
          }`}
        >
          <Sun className="w-3 h-3" />
        </span>
      </span>
    </button>
  );
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, toggleLanguage } = useJamabook();
  const isHindi = language === 'hi';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Toggle language between English and Hindi"
      title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
      className={`relative inline-flex items-center h-8 w-20 rounded-full p-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#184E3A] focus:ring-offset-2 select-none active:scale-95 ${
        isHindi
          ? 'bg-[#EBE5D8] dark:bg-[#18261F] border border-[#D9D2C3] dark:border-[#2B3E33]'
          : 'bg-[#EBE5D8] dark:bg-[#18261F] border border-[#D9D2C3] dark:border-[#2B3E33]'
      } ${className}`}
    >
      {/* Sliding Pill Indicator */}
      <span
        className={`absolute top-1 bottom-1 w-[34px] rounded-full bg-[#184E3A] dark:bg-[#226E52] text-white shadow-xs transition-transform duration-300 ease-out transform ${
          isHindi ? 'translate-x-[36px]' : 'translate-x-0'
        }`}
      />

      {/* Segment Labels */}
      <div className="relative z-10 w-full flex items-center justify-around text-xs font-black">
        <span
          className={`w-8 text-center transition-colors duration-200 ${
            !isHindi ? 'text-white' : 'text-[#56645E] dark:text-[#95A69F]'
          }`}
        >
          EN
        </span>
        <span
          className={`w-8 text-center transition-colors duration-200 font-hindi ${
            isHindi ? 'text-white' : 'text-[#56645E] dark:text-[#95A69F]'
          }`}
        >
          हि
        </span>
      </div>
    </button>
  );
}
