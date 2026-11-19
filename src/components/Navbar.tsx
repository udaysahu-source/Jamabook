// src/components/Navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useJamabook, AppView } from '@/context/JamabookContext';
import { getT } from '@/lib/translations';
import { formatIndianNumber } from '@/lib/formatters';
import { todayIST } from '@/lib/dates';
import {
  Home,
  Package,
  Bell,
  Bot,
  Sliders,
  Plus,
  FileText,
  Clock,
  Sparkles,
  LogOut,
  Keyboard,
} from 'lucide-react';

export function TopHeader() {
  const { language, toggleLanguage, business, activeView, setActiveView } = useJamabook();
  const t = getT(language);

  return (
    <header className="sticky top-0 z-40 bg-[#F8F5EE]/95 backdrop-blur-md border-b border-[#E5DFD1] px-4 py-3 lg:hidden no-print">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Left: Brand Badge & Name */}
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#184E3A] flex items-center justify-center text-white font-black text-sm tracking-tight shadow-sm transition-transform group-hover:scale-105">
            RTC
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base text-[#19221E] leading-tight">
                {business.name || 'RTC Mandi'}
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[11px] font-semibold text-[#56645E]">
              {language === 'hi' ? 'अनाज व दलहन आढ़त' : 'Grain & Mandi Trader'}
            </span>
          </div>
        </button>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView(activeView === 'bot' ? 'home' : 'bot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeView === 'bot'
                ? 'bg-[#184E3A] text-white shadow-xs'
                : 'bg-white text-[#184E3A] border border-[#D9D2C3] hover:bg-[#F2ECE1]'
            }`}
            title="RTC Telegram Bot"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot</span>
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

export function SidebarNav() {
  const {
    activeView,
    setActiveView,
    language,
    toggleLanguage,
    business,
    items,
    enquiries,
    logout,
  } = useJamabook();
  const t = getT(language);

  const [todayStr, setTodayStr] = useState('2026-11-19');
  const [timeStr, setTimeStr] = useState('20:00 IST');

  useEffect(() => {
    setTodayStr(todayIST());
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalStockPieces = items.reduce((sum, item) => sum + (item.pieces_in_stock || 0), 0);
  const pendingCount = enquiries.filter(
    (e) => e.status === 'open' && e.next_follow_up && e.next_follow_up <= todayStr
  ).length;

  const navLinks: { view: AppView; label: string; hindi: string; icon: React.ReactNode; shortcut: string; badge?: number }[] = [
    {
      view: 'home',
      label: 'Home',
      hindi: 'मुख्य पृष्ठ',
      icon: <Home className="w-5 h-5" />,
      shortcut: 'H',
    },
    {
      view: 'bill-new',
      label: 'New Bill',
      hindi: 'नया कच्चा बिल',
      icon: <FileText className="w-5 h-5" />,
      shortcut: 'N',
    },
    {
      view: 'stock',
      label: 'Stock Register',
      hindi: 'स्टॉक रजिस्टर',
      icon: <Package className="w-5 h-5" />,
      shortcut: 'S',
      badge: totalStockPieces > 0 ? totalStockPieces : undefined,
    },
    {
      view: 'follow-ups',
      label: 'Follow-ups',
      hindi: 'तगादा व पूछताछ',
      icon: <Bell className="w-5 h-5" />,
      shortcut: 'F',
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      view: 'bot',
      label: 'Telegram Bot',
      hindi: 'बॉट सिम्युलेटर',
      icon: <Bot className="w-5 h-5" />,
      shortcut: 'B',
    },
    {
      view: 'settings',
      label: 'Firm Profile',
      hindi: 'फर्म सेटिंग्स',
      icon: <Sliders className="w-5 h-5" />,
      shortcut: 'G',
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#F6F2E9] border-r border-[#E5DFD1] h-screen sticky top-0 p-5 justify-between shrink-0 select-none no-print">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Mandi Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#184E3A] flex items-center justify-center text-white font-black text-base shadow-sm ring-2 ring-[#184E3A]/20">
            RTC
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-base text-[#19221E] truncate leading-tight">
                {business.name || 'RTC Mandi'}
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
            </div>
            <p className="text-[11px] font-semibold text-[#56645E] truncate">
              {language === 'hi' ? 'अनाज व दलहन मंडी आढ़त' : 'Grain & Pulse Mandi Firm'}
            </p>
          </div>
        </div>

        {/* Primary Action Button: New Bill */}
        <button
          onClick={() => setActiveView('bill-new')}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#184E3A] hover:bg-[#123E2E] text-white rounded-2xl font-black text-sm shadow-sm transition-all transform active:scale-[0.98] group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="text-left">
              <div className="leading-tight">{language === 'hi' ? 'नया कच्चा बिल' : 'Create Bill'}</div>
              <div className="text-[10px] text-emerald-200 font-medium">#{business.next_bill_no}</div>
            </div>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-100">
            F2 / N
          </span>
        </button>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navLinks.map((link) => {
            const isActive =
              activeView === link.view ||
              (link.view === 'home' && (activeView === 'bill-saved' || activeView === 'invoice-view'));

            return (
              <button
                key={link.view}
                onClick={() => setActiveView(link.view)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-[#184E3A] text-white shadow-xs'
                    : 'text-[#4A5752] hover:bg-[#EBE5D8] hover:text-[#19221E]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-[#6A7871]'}>{link.icon}</span>
                  <div className="text-left leading-tight">
                    <div>{link.label}</div>
                    <div className={`text-[10px] font-normal ${isActive ? 'text-emerald-200' : 'text-[#7D8A83]'}`}>
                      {link.hindi}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {link.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isActive
                          ? 'bg-white text-[#184E3A]'
                          : link.view === 'follow-ups'
                          ? 'bg-[#C25E1A] text-white'
                          : 'bg-[#D9D2C3] text-[#19221E]'
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono px-1 rounded ${
                      isActive ? 'bg-white/20 text-white' : 'text-[#8E9B94] border border-[#D9D2C3]'
                    }`}
                  >
                    {link.shortcut}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Mandi Status Widget & Account */}
      <div className="space-y-3 pt-4 border-t border-[#E5DFD1]">
        {/* Live Mandi Clock Card */}
        <div className="bg-white/80 rounded-2xl p-3 border border-[#E5DFD1] text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#56645E]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#184E3A]" />
              Mandi Desk
            </span>
            <span className="text-[#184E3A] font-extrabold">{timeStr}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#F0ECE1]">
            <span className="text-[#56645E]">{language === 'hi' ? 'गोदाम स्टॉक' : 'Warehouse'}</span>
            <span className="font-extrabold text-[#19221E]">
              {formatIndianNumber(totalStockPieces)} {t.pcs}
            </span>
          </div>
        </div>

        {/* Language & Account Footer */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={toggleLanguage}
            className="flex-1 py-1.5 px-2 bg-white rounded-xl border border-[#D9D2C3] text-xs font-bold text-[#19221E] hover:bg-[#EBE5D8] transition-colors text-center shadow-2xs"
          >
            {t.langToggle}
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-white border border-[#D9D2C3] text-[#56645E] hover:text-[#C25E1A] hover:bg-[#FCEFE7] transition-colors shadow-2xs"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const { activeView, setActiveView, language, enquiries } = useJamabook();
  const t = getT(language);

  const [todayStr, setTodayStr] = useState('2026-11-19');
  useEffect(() => {
    setTodayStr(todayIST());
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DFD1] px-4 py-2 pb-safe lg:hidden no-print">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {navItems.map((item, idx) => {
          const isActive =
            activeView === item.view ||
            (item.view === 'home' && (activeView === 'bill-saved' || activeView === 'invoice-view'));

          return (
            <React.Fragment key={item.view}>
              {/* Insert Center Floating Action Button between index 1 and 2 */}
              {idx === 2 && (
                <button
                  onClick={() => setActiveView('bill-new')}
                  className="-mt-7 w-12 h-12 rounded-full bg-[#184E3A] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform ring-4 ring-[#F8F5EE]"
                  title="Create New Bill"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
              )}

              <button
                onClick={() => setActiveView(item.view)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl relative transition-all min-w-[56px] min-h-[44px] ${
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
                <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-0.5 right-2 w-4 h-4 bg-[#C25E1A] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
