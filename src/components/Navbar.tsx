// src/components/Navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook, AppView } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { Home, Package, Bell, Bot, Sliders } from 'lucide-react';

export function TopHeader() {
  const { language, toggleLanguage, business, activeView, setActiveView } = useJamabook();
  const t = getT(language);

  return (
    <header className="sticky top-0 z-40 bg-[#F8F5EE]/95 backdrop-blur-md border-b border-[#E5DFD1] px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Brand Badge & Name */}
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#184E3A] flex items-center justify-center text-white font-extrabold text-sm tracking-tight shadow-sm transition-transform group-hover:scale-105">
            RTC
          </div>
          <div>
            <h1 className="font-bold text-base text-[#19221E] leading-tight">
              {business.name || 'RTC'}
            </h1>
            <span className="text-[11px] font-medium text-[#56645E]">
              Grain & Mandi Trader
            </span>
          </div>
        </button>

        {/* Right: Quick Bot Pill & Language Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView(activeView === 'bot' ? 'home' : 'bot')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeView === 'bot'
                ? 'bg-[#184E3A] text-white shadow-sm'
                : 'bg-white text-[#184E3A] border border-[#D9D2C3] hover:bg-[#F2ECE1]'
            }`}
            title="RTC Telegram Bot Simulator"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bot</span>
          </button>

          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-full bg-white text-[#19221E] border border-[#D9D2C3] text-xs font-bold shadow-xs hover:bg-[#F2ECE1] transition-colors"
          >
            {t.langToggle}
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { activeView, setActiveView, language, enquiries } = useJamabook();
  const t = getT(language);

  // Overdue or due today count for badge
  const [todayStr, setTodayStr] = useState('2026-11-19');
  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
  }, []);

  const pendingCount = enquiries.filter(
    (e) => e.status === 'open' && e.next_follow_up && e.next_follow_up <= todayStr
  ).length;

  const navItems: { view: AppView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      view: 'home',
      label: t.home,
      icon: <Home className="w-5 h-5" />,
    },
    {
      view: 'stock',
      label: t.stock,
      icon: <Package className="w-5 h-5" />,
    },
    {
      view: 'follow-ups',
      label: t.followUps,
      icon: <Bell className="w-5 h-5" />,
      badge: pendingCount,
    },
    {
      view: 'settings',
      label: t.settings,
      icon: <Sliders className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DFD1] px-4 py-2 pb-safe no-print">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            activeView === item.view ||
            (item.view === 'home' && (activeView === 'bill-new' || activeView === 'bill-saved' || activeView === 'invoice-view'));

          return (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl relative transition-all ${
                isActive
                  ? 'text-[#184E3A] font-bold'
                  : 'text-[#6B7770] font-medium hover:text-[#19221E]'
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-all ${
                  isActive ? 'bg-[#E7EFE9] text-[#184E3A]' : ''
                }`}
              >
                {item.icon}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-0.5 right-2 w-4 h-4 bg-[#C25E1A] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
