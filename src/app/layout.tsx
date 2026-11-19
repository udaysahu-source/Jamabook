// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { JamabookProvider } from '@/context/JamabookContext';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hindi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Jamabook · RTC Mandi Billing & Stock',
  description: 'Fast, phone-friendly digital billing, live stock in pieces, and WhatsApp buyer follow-up for wholesale traders.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#184E3A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${plusJakarta.variable} ${notoSansDevanagari.variable}`}>
      <body className="h-full font-sans text-[#19221E] antialiased selection:bg-[#184E3A] selection:text-white">
        {/* Instant SSR splash that React replaces smoothly on mount */}
        <div id="initial-splash" className="contents">
          <JamabookProvider>{children}</JamabookProvider>
        </div>
      </body>
    </html>
  );
}
