# Jamabook · RTC Mandi Billing, Stock & Follow-up App

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Zod](https://img.shields.io/badge/Validated_by-Zod-3068b7?style=for-the-badge&logo=zod)](https://zod.dev/)

A fast, phone-first digital billing, piece-wise stock ledger, and WhatsApp follow-up companion designed specifically for wholesale agricultural traders, grain dealers, and mandi merchants.

Jamabook turns handwritten **"kacha bills"** into clean digital invoices in under 30 seconds, tracks commodity inventory in physical pieces/bags and quintals, and ensures traders never forget a buyer inquiry received on WhatsApp.

---

## 🌾 Design Philosophy: Mandi Ledger (Zero AI Slop)

Built following the [frontend-design](.agent/skills/frontend-design.md) specification, Jamabook rejects generic AI aesthetics (no neon glows on pitch black, no generic purple gradients, no redundant nested cards). Instead, it embodies a purposeful **Mandi Ledger** design language:

* **Warm Unbleached Paper Palette**: Background `#F8F5EE` with warm `#FFFFFF` cards and `#E5DFD1` borders, formulated for glare-free readability under direct outdoor market sunlight.
* **Deep Banyan Forest Green (`#184E3A`)**: Grounded, high-contrast primary tone evoking traditional Indian accounting and agricultural ledgers.
* **Sunbaked Terracotta Clay (`#C25E1A`)**: Vibrant warning accent for overdue follow-ups, low-stock alerts, and urgent buyer inquiries.
* **Tactile 1-Handed Touch**: 48px+ touch targets, large steppers, and pre-filled quick chips for instant one-handed use in bustling trade yards.
* **Bilingual Toggle (`हिं / EN`)**: One-tap header switch providing natural Hindi and English terminology across every screen.

---

## 🚀 Key Features

### 1. High-Speed Digital Billing (< 30s)
* **Atomic Bill Numbering**: Continuous atomic counter managed by the database (starting from `#4450`), matching handwritten T.P. slips.
* **Contextual Pre-Filling**: Automatically detects repeating buyers and offers 1-tap pre-fill from their last bill (*e.g. #4449*).
* **Multi-Unit Live Calculation**:
  $$\text{50 pieces} \times \text{30 kg} = \text{1,500 kg} = \text{15 quintals} \times ₹11,050/\text{qtl} \longrightarrow ₹1,65,750$$
  Segmented toggles switch effortlessly between `per quintal`, `per kg`, and `per piece`.
* **Snapshot Preservation**: Bills capture immutable historical snapshots of buyer names, towns, commodity prices, and units so master data edits never distort past accounting.
* **Instant WhatsApp Sharing**: Generates pre-formatted `wa.me` links with bill details and amounts ready to send.
* **Physical Slip Preview & Thermal Print**: Complete printable layout with double borders, T.P. Number, vehicle number, broker, item table, and Indian words currency converter (*"Rupees One Lakh Sixty-Five Thousand Eight Hundred Only"*).
* **Immutable Bills & Safe Cancellation**: Bills cannot be modified or deleted directly. Cancelling a bill requires a mandatory reason, reverses the stock ledger atomically, and writes to an audit log.

### 2. Piece-wise Stock Ledger
* **Append-Only Ledger**: Stock is calculated strictly from `stock_movements` (Sales = negative, Purchases & Cancellations = positive). Current stock cannot be tampered with as a standalone mutable cell.
* **Dual Metrics**: Displays both total pieces/bags in hand and equivalent metric kilograms.
* **Low-Stock Alerts**: Real-time visual alerts when items fall below their minimum buffer.
* **Stock In & Audit Adjustments**: Quick modals to record supplier purchases or physical bag recount corrections.

### 3. WhatsApp Follow-ups & Reminders
* **Lead Tracking**: Captures buyer inquiries received via WhatsApp with requested quantities and materials.
* **Live Stock Comparison**: Instantly matches inquiry quantities against current stock (*e.g. "In stock: 100 pcs · enough"* vs *"Only 8 in stock · 12 short"*).
* **Urgency Badges**: Flags overdue inquiries (*"1 day late"*).
* **Quick Actions**: One-tap WhatsApp chat opener, phone dialer (`tel:`), snooze (+1, +3, +7 days), and mark won/done.

### 4. RTC Telegram Bot Simulator (SPEC Phase 5)
* An interactive simulation of the upcoming Telegram voice/text message ingestion:
  - Input: *"Boina Vardharaju, Nav Transport, Mung Prestige Pro 50 x 30kg @11050 per quintal, extra 50"*
  - AI parses the text, matches against master party and item lists, and generates a draft bill preview.
  - Interactive `[Confirm]`, `[Edit]`, and `[Cancel]` buttons. Nothing touches the database until the owner confirms.

### 5. 1-Tap Excel & CSV Data Export
* Instant spreadsheet export for Invoices, Stock Ledger movements, and Registered Parties.

---

## 🔒 Security Architecture (OWASP ASVS L2 Direction)

* **Multi-Tenant Isolation**: Every table contains a `business_id` foreign key.
* **Zero-Trust Server Derivation**: `business_id` is derived on the server via `auth.uid() -> business_members`. Client-supplied business identifiers are rejected.
* **Row Level Security (RLS)**: Enabled across all 10 tables in Supabase Postgres.
* **Least-Privilege Grants**: Default schema privileges are revoked from `anon` and restricted for `authenticated`.
* **Server-Side Validation**: All endpoints and actions strictly validate payloads with [Zod](src/lib/validations.ts).
* **Safe Error Handling**: Error messages never expose SQL syntax, internal stack traces, or credentials to clients.

---

## 📁 Repository Structure

```
Jamabook/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts            # Sign-in & Sign-up endpoint
│   │   │   ├── invoices/route.ts        # Server-validated invoice creation
│   │   │   ├── invoices/cancel/route.ts # Transactional cancellation & reversal
│   │   │   └── stock/route.ts           # Stock ledger movement endpoint
│   │   ├── globals.css                  # Mandi palette & print stylesheet
│   │   ├── layout.tsx                   # Font loading & PWA meta
│   │   └── page.tsx                     # Main application view & auth gate
│   ├── components/
│   │   ├── AuthScreen.tsx               # Login, register & PIN unlock
│   │   ├── HomeScreen.tsx               # Dashboard with quick actions & metrics
│   │   ├── NewBillScreen.tsx            # Digital bill builder & live formula
│   │   ├── BillSavedScreen.tsx          # Success celebration & slip preview
│   │   ├── StockScreen.tsx              # Commodity ledger & stock in/adjust
│   │   ├── FollowUpsScreen.tsx          # WhatsApp buyer reminders
│   │   ├── AddEnquirySheet.tsx          # Follow-up logging bottom sheet
│   │   ├── KachaInvoiceSlip.tsx         # Full-bleed printable mandi invoice
│   │   ├── TelegramBotSimulator.tsx     # Phase 5 bot simulator
│   │   ├── SettingsScreen.tsx           # Profile, master lists & CSV export
│   │   └── Navbar.tsx                   # Sticky top header & bottom nav
│   ├── context/
│   │   └── JamabookContext.tsx          # Reactive state & ledger store
│   ├── lib/
│   │   ├── formatters.ts                # Indian numbering & words converter
│   │   ├── mockData.ts                  # Seed references
│   │   ├── serverAuth.ts                # Server-side auth & tenant derivation
│   │   ├── supabaseClient.ts            # Supabase client wrapper
│   │   ├── translations.ts              # Hindi & English dictionary
│   │   └── validations.ts               # Strict Zod schemas
│   └── types/
│       └── index.ts                     # TypeScript data interfaces
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql                 # Production Postgres migration & RLS
│   └── seed.sql                         # Initial master data seed
├── design/
│   └── Trader App Screens.pdf           # Original UI/UX design specification
├── md files/
│   ├── AGENTS.md                        # Coding rules & security constraints
│   └── SPEC.md                          # Product feature specification
├── public/
│   └── manifest.json                    # PWA configuration
└── package.json
```

---

## 🛠️ Getting Started

### 1. Prerequisites
* Node.js 20.x or later
* npm 10.x or later

### 2. Installation
```bash
git clone https://github.com/udaysahu-source/Jamabook.git
cd Jamabook
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-for-server-only
```

*(Note: Jamabook includes an instant local authentication fallback so you can explore and test the entire workflow even before connecting Supabase).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (or on your phone over the local network).

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 📄 License
Private commercial project for RTC Trader. All rights reserved.
