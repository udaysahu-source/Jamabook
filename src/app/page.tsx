// src/app/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthScreen } from '@/components/AuthScreen';
import { TopHeader, SidebarNav, BottomNav } from '@/components/Navbar';
import { HomeScreen } from '@/components/HomeScreen';
import { NewBillScreen } from '@/components/NewBillScreen';
import { BillSavedScreen } from '@/components/BillSavedScreen';
import { StockScreen } from '@/components/StockScreen';
import { FollowUpsScreen } from '@/components/FollowUpsScreen';
import { TelegramBotSimulator } from '@/components/TelegramBotSimulator';
import { SettingsScreen } from '@/components/SettingsScreen';
import { KachaInvoiceSlip } from '@/components/KachaInvoiceSlip';

export default function App() {
  const { user, isLoaded, activeView, setActiveView } = useJamabook();

  // Desktop Mandi Keyboard Shortcuts
  useEffect(() => {
    if (!user) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input, textarea, or select
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Hotkeys:
      // F2 or N -> New Bill
      if (e.key === 'F2' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setActiveView('bill-new');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setActiveView('home');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setActiveView('stock');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setActiveView('follow-ups');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setActiveView('bot');
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setActiveView('settings');
      } else if (e.key === 'Escape') {
        if (activeView !== 'home') {
          e.preventDefault();
          setActiveView('home');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, activeView, setActiveView]);

  // Loading Splash Screen until session hydration is ready
  if (!isLoaded) {
    return <LoadingScreen />;
  }

  // Authentication Gate: Require user login/signup before accessing trader data
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8F5EE] dark:bg-[#101613] text-[#19221E] dark:text-[#F0F4F2] flex flex-col lg:flex-row font-sans selection:bg-[#184E3A] selection:text-white transition-colors duration-200">
      {/* Desktop Sidebar Navigation */}
      <SidebarNav />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile/Tablet Top Header */}
        <TopHeader />

        {/* Responsive Content Area */}
        <main className="flex-1 w-full max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 md:pt-5 pb-24 lg:pb-12">
          {activeView === 'home' && <HomeScreen />}
          {activeView === 'bill-new' && <NewBillScreen />}
          {activeView === 'bill-saved' && <BillSavedScreen />}
          {activeView === 'stock' && <StockScreen />}
          {activeView === 'follow-ups' && <FollowUpsScreen />}
          {activeView === 'bot' && <TelegramBotSimulator />}
          {activeView === 'settings' && <SettingsScreen />}
          {activeView === 'invoice-view' && <KachaInvoiceSlip />}
        </main>

        {/* Mobile Sticky Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
