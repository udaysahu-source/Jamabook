# LAUNCH_PLAN.md - Jamabook: from prototype to daily use

Goal: the trader uses Jamabook every day for real bills, stock and follow-ups,
and never loses a record or sees a wrong number.

Put this file in the repo root next to `AGENTS.md` and `SPEC.md`.

---

## 1. Release gate (all must be true before real data goes in)

- [ ] No mock login anywhere in production (no `mock-token`, no PIN 1234/4450)
- [ ] No fake business, buyer, phone or bank data anywhere in the code
- [ ] Every save writes to Supabase. No success message without a successful database write
- [ ] Tapping Save twice, or retrying after bad network, never makes two bills
- [ ] Another account cannot read or change his data (tested)
- [ ] Cancelling a bill restores stock exactly once (tested)
- [ ] Data is still there after clearing the browser or opening on another phone
- [ ] Bill date and today's date are correct in India time (Asia/Kolkata)
- [ ] One backup has been made AND restored on a test project

---

## 2. What to change (in this order)

| # | Change | Why | Effort |
|---|---|---|---|
| 1 | Remove all fake data (bank, IFSC, phone, "Jaipur", simulated ledger rows) | A wrong bank account or a WhatsApp chat to a stranger is the worst failure | 0.5 day |
| 2 | Migration `002`: database checks, idempotency, owner-only, India dates | Closes the gaps found in review. Also fixes a bug in my `SPEC.md`: `current_date` is the UTC date on Supabase | 1 day |
| 3 | Real login with Supabase Auth. Sign-ups switched off | Replaces the mock login. For one trader, no sign-up screen is needed | 1 day |
| 4 | Make the database the source of truth (bills, cancel, stock, enquiries, parties, items) | Today the data lives in the browser and can vanish | 2 days |
| 5 | India dates, CSV formula injection, zoom, icons, hide the 9 am reminder text | Small fixes, big trust | 0.5 day |
| 6 | Bill PDF as real text, shared on WhatsApp | The current PDF is a picture | 1 day |
| 7 | Tests and CI (database tests, bill formula, one end-to-end test) | Stops future changes breaking money | 1 day |
| 8 | Production setup, backups, runbook | Makes it safe to run daily | 0.5 day |
| 9 | Two-week pilot next to his paper slips | Real bills find real bugs | 2 weeks |
| 10 | Telegram reminders, then the Telegram bill bot | Automation comes after the base is trusted | later |

## 3. Decisions that keep this small

- **One owner, no sign-up screen.** In Supabase turn sign-ups off, create his user by hand, and add his business with one SQL snippet (section 4). Skip onboarding UI and staff roles.
- **Online first.** Offline drafts are a later feature.
- **Bill in English, no GST, no payments** in version 1. Add them only if he asks (section 7).
- **The database does the maths for saved bills.** The screen only previews the total.
- **Statements are a "sales statement"**, not a ledger, until payments exist.

---

## 4. Go-live setup (you do these by hand, not the AI)

**Accounts and cost**
- Supabase: create two projects, `jamabook-dev` and `jamabook-prod`. Choose a region near India (Mumbai).
- The free Supabase plan pauses a project after 1 week of inactivity and has no automatic backups. Pro starts at $25/month and keeps daily backups for 7 days.
- Vercel: the free Hobby plan is for personal use. As far as I know its terms don't allow business use, so for his real business plan on Pro (developer seats are $20/user/month). Check Vercel's terms yourself before relying on this.
- So running live costs about **$45/month**. Decide who pays. For the first 2 weeks of the pilot the free plans are fine if you take a manual export every evening.

**Supabase prod project**
1. Auth settings: turn OFF "Allow new users to sign up".
2. Auth, Users: add his user (email + strong password, mark confirmed).
3. Run the migrations (`001`, `002`) with the Supabase CLI, never by clicking tables together.
4. In the SQL editor create his business (replace the id and set his real next bill number):

```sql
insert into businesses (name, next_bill_no) values ('RTC', 4450) returning id;
insert into business_members (business_id, user_id, role)
values ('<business id from above>', '<his user id from Auth, Users>', 'owner');
```

5. Copy the project URL and the anon key into Vercel env vars. The service-role key goes only in server env vars, never `NEXT_PUBLIC_`.

**Before his first real bill**
- Count the physical stock and enter it as "Opening stock" (Stock In).
- Add his top 10 buyers (with phone numbers), his transporters and brokers, and his materials with kg per piece.
- Add the app to his phone's home screen and set an app-lock PIN.

---

## 5. Prompts for your coding agent

Paste **Prompt 0** at the start of every session, then one prompt at a time. Review the diff and the report after each one before moving on. Work on a Git branch per prompt.

### Prompt 0 - Rules (paste first, every session)

```
You are working on Jamabook, a billing/stock/follow-up app for one trader (RTC).
Stack: Next.js, TypeScript, Tailwind, Supabase (Postgres, Auth), Zod, Vercel.

First read AGENTS.md and SPEC.md in the repo root and follow them.

Before writing code:
1. Inspect the existing code for the area you will touch.
2. List the security and data-integrity risks you see.
3. Explain your plan and the risks in plain words.
4. Never silently weaken an existing security control.

After writing code:
1. Run lint, type check, build and the tests.
2. Check authorisation and business isolation for anything you touched.
3. Check the diff for secrets and for hardcoded fake data.
4. Report what you did NOT test and any unresolved risks. Do not claim the
   app is "secure" because tests pass.

Rules: dummy data only, never real customer data. Small commits on a new branch.
Never put the Supabase service-role key or any secret in client code.
```

### Prompt 1 - Remove fake data

```
Task: remove every piece of fake or fallback business data.

1. Search the whole repo (src, supabase, design, public, md files) for:
   +91 98290 11223, Jaipur, SBI, 30894562109, SBIN0001234, "1,60,000" sample
   ledger rows, and any other hardcoded phone, bank, address or buyer.
2. Delete the fallbacks. Specifically:
   - KachaInvoiceSlip: show the bank block ONLY if the business has bank details
     saved (add nullable bank_name, bank_account, bank_ifsc to businesses in a
     new migration if missing). Show buyer phone/town only if saved.
   - Party ledger/statement: when there are no bills, show an empty state
     ("No bills yet"). Never insert simulated sales or receipts.
   - Cancelled bills: show them as struck-through CANCELLED rows and EXCLUDE
     them from totals. Rename the screen to "Sales statement" (we have no
     payment records yet).
   - WhatsApp action: if the buyer has no valid phone number, disable the button
     and show "Add phone number". Normalise a 10-digit Indian number to
     91XXXXXXXXXX before building the wa.me link. Never fall back to a default.
3. Demo data may exist only when NEXT_PUBLIC_DEMO=true. When on, show a visible
   "DEMO DATA" banner on every screen. Make the production build fail if demo
   mode is on while NODE_ENV=production.

Acceptance: a search for the strings above returns nothing; with demo off and an
empty database every screen shows an honest empty state.
```

### Prompt 2 - Migration 002 (database hardening)

```
Task: write supabase/migrations/002_hardening.sql and tests for it.
Do not edit 001. Test on a local or throwaway Postgres with two dummy users
(set request.jwt.claim.sub to switch users) and keep the tests as files under
supabase/tests/.

Requirements:
1. India dates: bill_date default and stock_movements.moved_on default must use
   (now() at time zone 'Asia/Kolkata')::date, not current_date. In
   create_invoice, reject a bill_date more than 1 day in the future or older
   than 1 year.
2. stock_movements constraints (add them so existing rows are checked first):
   - purchase: pieces > 0 and <= 100000
   - sale: pieces < 0 ; sale_cancel: pieces > 0
   - adjustment: note must be non-empty
   The direct-insert policy keeps allowing only purchase and adjustment.
3. create_invoice validation inside the function:
   - at most 50 lines; pieces 1..100000; kg_per_piece > 0 and <= 1000;
     rate >= 0 and <= 10000000; valid rate_unit
   - charges: amount >= 0 and <= 10000000
   - transporter and broker must be is_active (like the buyer already is)
4. cancel_invoice: reason required, 3 to 200 characters.
5. Idempotency: add an optional client_request_id uuid parameter to
   create_invoice and a unique index on (business_id, client_request_id) where
   not null. If the same id is sent again, return the existing invoice id and
   create nothing.
6. Owner only: create_invoice and cancel_invoice must find the business only
   from business_members rows with role = 'owner' for auth.uid().
7. Audit: also write audit_log rows for stock purchases/adjustments and for
   updates to parties, items and the business profile (use triggers or the
   existing log_audit). audit_log stays append-only: no insert/update/delete
   grants for clients.
8. Keep RLS on and grants least-privilege; revoke everything from anon.

Tests (executable, run with one command): the SPEC.md section 9 list, plus:
negative purchase rejected, negative charge rejected, inactive transporter
rejected, same client_request_id twice gives one bill, 8 simultaneous
create_invoice calls give 8 different numbers, cancel twice fails,
a bill created at 00:30 IST has the Indian date.
Report which tests passed and which risks remain.
```

### Prompt 3 - Real login

```
Task: replace the mock authentication with Supabase Auth.

1. Use @supabase/ssr: browser client, server client, and the middleware that
   refreshes the session cookie (HTTP-only, secure).
2. Login screen with email + password only. Remove the sign-up screen and the
   /api/auth signup route entirely (sign-ups are switched off in Supabase).
3. Server code must use supabase.auth.getUser() (not getSession()) to identify
   the user. Delete the mock-token logic and the mock fallback in serverAuth.ts.
   If Supabase env vars are missing in production, fail startup loudly.
4. The PIN becomes an optional APP LOCK only: stored as a salted hash (WebCrypto
   PBKDF2) on the device, asked after 2 minutes in the background. It never
   grants access to data and never replaces login. Remove 1234 and 4450.
5. Logout clears the Supabase session AND all local app data. Make any local
   storage key include the business id so two accounts never share data.
6. Add src/lib/env.ts: validate env vars with Zod at startup; add .env.example
   (names only, no values). The service-role key is server-only and not needed
   for normal screens.
7. Protected pages redirect to login when there is no session.

Acceptance: wrong password is rejected; no cookie means no data; logging out and
in as another test user shows none of the first user's data.
```

### Prompt 4 - Make Supabase the source of truth

```
Task: connect every screen to Supabase. localStorage must stop being the data
store.

Rules:
- Use the logged-in user's Supabase client (so auth.uid() works inside the
  create_invoice and cancel_invoice functions). Do not call them with the
  service-role client.
- Never send business_id from the browser; the database derives it.
- Validate every input with Zod on the server AND keep the database checks.
- Generate Supabase types with the CLI and use them.

Do:
1. Load dashboard, stock (from the stock_levels view), parties, items, bills
   and enquiries from the database. Paginate the bills and stock movements.
2. New bill: call rpc create_invoice. Create a client_request_id (uuid) when the
   form opens and send it with the save, so a double tap or retry cannot make a
   second bill. Disable Save while saving. Show the bill number only after the
   server confirms. On failure show a clear message and keep the form.
3. Cancel bill: rpc cancel_invoice with a required reason.
4. Stock In / Adjust: insert stock_movements (adjust needs a reason).
5. Enquiries: create, update status, snooze, mark done; set last_contacted_at
   when he taps WhatsApp or Call.
6. Parties and items: create, edit, deactivate (never delete if used on a bill).
7. A draft of an unsaved bill may be kept locally, keyed by business id, and
   cleared after a successful save.
8. Remove the API routes that only echo calculations without saving, or make
   them call the database.

Acceptance: create a bill on one phone and see it on another; clear the browser
data and everything is still there; two quick taps on Save give one bill;
cancelling restores stock exactly once; a second test account sees nothing.
```

### Prompt 5 - Dates, CSV, PWA small fixes

```
Task: fix these small but important issues.

1. Add src/lib/dates.ts with todayIST() and formatters for Asia/Kolkata (en-IN).
   Replace every new Date().toISOString().split('T')[0]. Add a unit test that
   00:30 IST returns the Indian date, not yesterday's.
2. CSV export: prefix any cell starting with = + - @ tab or CR with a single
   quote, and keep quote escaping. Add tests.
3. Viewport: remove userScalable: false so people can zoom.
4. Add public icons 192x192, 512x512 and a maskable icon; fix the manifest so
   /icon.png no longer 404s.
5. Set the html lang attribute to match the chosen language.
6. Remove the "We will remind you at 9:00 am" text and any reminder promise,
   until a real reminder job exists.
7. Do not add a service worker or offline mode yet.
```

### Prompt 6 - Bill PDF as real text

```
Task: replace the html2canvas + jsPDF bill export with a real-text PDF.

1. Use @react-pdf/renderer, imported dynamically only when "Share"/"Save" is
   tapped. Text must be selectable. English only (no Hindi font needed).
2. Layout (A4 portrait), matching his handwritten slip:
   - Header: RTC, then business address / phone / GSTIN only if saved.
   - Row: Bill No. (T.P.) and Date.
   - Boxes: Party + town + phone; Transport, Broker, Vehicle no.
   - Table: #, Material, Pieces, Kg/pc, Total kg, Rate per quintal, Amount.
     Show 2 blank ruled rows if there are few lines. Wrap to a second page
     after about 15 lines and repeat the table header.
   - Totals box: Material amount, Extra charges (each with its label),
     Grand Total. Then "Amount in words" using Indian numbering
     (e.g. Rupees One Lakh Sixty-Five Thousand Eight Hundred Only).
   - Notes, a "For RTC / Sign" line, and a small footer.
   - Show a CANCELLED stamp across a cancelled bill.
   - Print in black and white too; text no lighter than #4A463D.
3. Read all values from the saved invoice snapshot, never from live party/item
   rows. Use the database totals; do not recompute money in JavaScript.
4. Share: use navigator.share with the PDF file when available (WhatsApp on
   Android), otherwise download. File name: Bill-4450-Party-Name.pdf.
5. Add a unit test for the amount-in-words function (include 1,65,800).
   Test the output on a real Android phone and attach a screenshot.
```

### Prompt 7 - Tests and CI

```
Task: add automated tests and a CI check.

1. Unit tests (Vitest): bill amount formula for per_quintal, per_kg and
   per_piece including rounding; amount in words; todayIST; CSV sanitiser.
2. Database tests: wire the supabase/tests from the migration work into one
   command (npm run test:db) covering the SPEC.md section 9 cases, including
   cross-business isolation with two users, 8 simultaneous bills, and
   idempotent retry.
3. One end-to-end test (Playwright): log in as a test user, create a bill,
   see stock go down, cancel it, see stock restored.
4. GitHub Actions on every pull request: lint, type check, build, unit tests,
   and npm audit --audit-level=high. Database and E2E tests run against a
   local Supabase (supabase start) or a throwaway Postgres in CI.
Do not mock the database in the isolation tests.
```

### Prompt 8 - Production setup

```
Task: prepare production deployment.

1. Security headers in next.config.ts: Content-Security-Policy (start simple),
   X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy
   strict-origin-when-cross-origin.
2. /api/health returns { ok: true } only (no secrets, no data).
3. Make sure nothing logs bill contents, phone numbers, tokens or passwords.
4. README "Runbook" section: how to apply migrations to dev then prod with the
   Supabase CLI, which env vars go in Vercel, how to create the owner user and
   business, how to take a backup, how to restore one, and how to roll back a
   bad deploy.
5. Backup: add scripts/backup.sh (pg_dump from the prod connection string passed
   as an env var) and docs for running it daily. Add an in-app "Export all data
   (Excel/CSV)" button for bills, items, parties and stock movements.
6. Confirm there is a separate dev Supabase project and that the app never
   points at prod from a preview or local build.
```

### Prompt 9 - Final audit before the pilot (read-only)

```
Task: audit the repo against LAUNCH_PLAN.md section 1 (Release gate). Do not
change code. For each gate item answer PASS, FAIL or NOT TESTED with the file
or test that proves it. Also search for: mock-token, 1234, 4450 as a PIN,
hardcoded phones/banks, localStorage used as the data store, toISOString date
shortcuts, service-role key in client code, and any API route that returns
success without a database write. List what must be fixed before real data.
```

---

## 6. The two-week pilot

- He keeps writing his paper slip AND enters each bill in Jamabook.
- Every evening compare the total of the day's slips with the app. Any difference is a bug: write it down.
- Take a backup or export every evening for the first week.
- After 5 clean days stop the paper copy for small bills; after 10 clean days stop it fully.
- Watch the speed: a typical bill should take under 30 seconds. If not, fix that before adding features.

## 7. Ask your friend before the pilot

1. Is the rate always per quintal? (The sample bill only works as per quintal.)
2. Is "T.P." the same number as the bill number?
3. Does he ever need a GST invoice?
4. Does he want to track who owes him money? If yes, add a receipts/payments feature as a separate phase.
5. Should his bank details and address print on the bill?
6. Does he buy stock in the same pieces and kg format?

## 8. After the pilot

**Prompt 10 - Telegram reminders.** A daily scheduled job (Supabase pg_cron calling a protected endpoint, or Vercel Cron on Pro) sends the owner's Telegram a morning list: overdue and today's follow-ups with live stock. Only to his saved Telegram chat id. The endpoint checks a secret header. Do not show any "reminder at 9 am" text in the app until this works.

**Prompt 11 - Telegram bill bot.** Webhook route that: verifies Telegram's secret-token header, accepts only the owner's Telegram user id, parses text (and later voice) with an AI model, validates the result with Zod, matches buyer/transporter/item against saved records, stores a draft server-side with an expiry, sends a summary with Confirm / Edit / Cancel buttons, and only on Confirm calls create_invoice with a client_request_id so repeated taps cannot duplicate. The AI never writes to the database directly.

---

## Sources

- Supabase pricing (free-plan pause after 1 week, daily backups on Pro, $25/month): https://supabase.com/pricing.md
- Vercel Hobby vs Pro plan comparison and seat price: https://vercel.com/docs/plans/hobby
