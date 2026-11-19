// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { JamabookProvider } from '@/context/JamabookContext';

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
  maximumScale: 1,
  userScalable: false,
  themeColor: '#184E3A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#F8F5EE]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full font-['Plus_Jakarta_Sans',sans-serif] text-[#19221E] antialiased selection:bg-[#184E3A] selection:text-white">
        <JamabookProvider>{children}</JamabookProvider>
      </body>
    </html>
  );
}
