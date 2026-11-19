// src/app/page.tsx
'use client';

import React from 'react';
import { useJamabook } from '@/context/JamabookContext';
import { AuthScreen } from '@/components/AuthScreen';
import { TopHeader, BottomNav } from '@/components/Navbar';
import { HomeScreen } from '@/components/HomeScreen';
import { NewBillScreen } from '@/components/NewBillScreen';
import { BillSavedScreen } from '@/components/BillSavedScreen';
import { StockScreen } from '@/components/StockScreen';
import { FollowUpsScreen } from '@/components/FollowUpsScreen';
import { TelegramBotSimulator } from '@/components/TelegramBotSimulator';
import { SettingsScreen } from '@/components/SettingsScreen';
import { KachaInvoiceSlip } from '@/components/KachaInvoiceSlip';

export default function App() {
  const { user, activeView } = useJamabook();

  // Authentication Gate: Require user login/signup before accessing trader data
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#19221E] flex flex-col font-sans selection:bg-[#184E3A] selection:text-white">
      {/* Top Header */}
      <TopHeader />

      {/* Main Container - Phone Frame styled */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-8">
        {activeView === 'home' && <HomeScreen />}
        {activeView === 'bill-new' && <NewBillScreen />}
        {activeView === 'bill-saved' && <BillSavedScreen />}
        {activeView === 'stock' && <StockScreen />}
        {activeView === 'follow-ups' && <FollowUpsScreen />}
        {activeView === 'bot' && <TelegramBotSimulator />}
        {activeView === 'settings' && <SettingsScreen />}
        {activeView === 'invoice-view' && <KachaInvoiceSlip />}
      </main>

      {/* Bottom Sticky Mobile Navigation */}
      <BottomNav />
    </div>
  );
}
