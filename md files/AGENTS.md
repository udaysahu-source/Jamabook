# AGENTS.md - Rules for every coding session

Project: billing, stock and follow-up app for one trader's business.
It turns his handwritten "kacha bill" into a digital bill, tracks stock in pieces,
and reminds him to follow up with buyers who message him on WhatsApp.

Stack: Next.js (PWA) + Supabase (Postgres, Auth, Storage, scheduled jobs) + Vercel.
Later: Telegram bot + AI message parsing, both calling the same backend functions.

Security target: OWASP Top 10:2025 and OWASP ASVS Level 2 as the direction,
adapted to the real risk of this app. This is a target, not a claim of compliance.
Passing tests or compiling does NOT mean the app is secure.

---

## 1. Before writing code

1. Read the existing structure (`SPEC.md`, migrations, current code) first.
2. List the security weaknesses or risks in what you are about to touch.
3. Explain the risk and the proposed fix in plain words before changing anything.
4. Never silently weaken an existing control (RLS policy, grant, validation, auth check).
   If a control must change, say so explicitly and explain why.

## 2. After writing code

1. Run the relevant tests (including the RLS tests in `SPEC.md` section 9).
2. Check authorisation: can user B read or change user A's rows? Try it.
3. Review the database policies and grants for every new table or function.
4. Search the diff and the repo for exposed secrets.
5. Report vulnerabilities and unresolved risks honestly, including what was NOT tested.

---

## 3. Architecture rules (do not break)

- **business_id on every table.** Single user today, but this keeps it multi-tenant-ready.
- **Never trust a business_id (or user id) sent by the frontend.** Derive it on the server
  from the logged-in user (`auth.uid()` -> `business_members`).
- **Row Level Security is ON for every table in `public`.** No table without policies.
- **Bills are immutable.** No UPDATE or DELETE on invoices. To fix a bill: cancel it
  (`cancel_invoice`) and create a new one. Cancelling reverses stock.
- **Stock is a ledger.** `stock_movements` rows only; current stock is calculated.
  Sales and cancellations are written only by the database functions.
- **Bills store snapshots** (party name, town, item name, rate, rate unit) so later edits
  never change old bills.
- **Bill numbers come from the database** (atomic counter), never from the frontend.
- **Business logic lives in one place** (database functions / server code), used by both
  the web app and the Telegram bot.
- Soft-delete (`is_active`) for parties and items that appear on bills.

## 4. Security must-haves (build these from day one)

- Supabase Auth (email + password) with long-lived sessions. An optional PIN screen may sit
  on top, but it never replaces real login.
- Secrets (Supabase service key, Telegram bot token, AI API key) only in server environment
  variables. Never in frontend code, never committed to Git. The frontend may only use the
  public anon key.
- **Telegram bot:** accept messages only from the owner's Telegram user ID, and verify the
  webhook secret token. Drop everything else silently.
- Server-side validation of all input (zod or similar), including the bot's AI-parsed
  output. Treat AI output as untrusted input; the user must confirm before a bill is saved.
- Safe error messages: no stack traces, SQL or internals sent to the client.
- Do not log passwords, tokens, phone numbers or bill contents.
- Strict CORS; rate-limit login and bot/webhook endpoints.
- Automated daily backup of the database (export to Google Drive or similar) and one
  tested restore before the app is relied on.
- HTTPS only (Vercel provides it).

## 5. Deferred until a second business uses the app

MFA, staff roles beyond owner, suspicious-login detection, self-serve data export and
deletion (a one-tap Excel export is enough for now), a formal ASVS L2 audit, a full
cross-tenant automated test suite. Do not build these early, but do not design in a way
that blocks them.

---

## 6. Development rules

- Three environments: development, staging (optional at first), production.
  Separate Supabase projects for dev and production.
- Dummy data only in development. Never paste real bills or customer data into prompts,
  tests or commits.
- No unreviewed changes to production data. Schema changes go through migration files in
  Git, tried on dev first.
- Check every new dependency (maintained? popular? needed?). Run `npm audit` before releases.
- Everything in Git. Small commits with clear messages.

## 7. Domain rules

- Unit is **pieces**. Each item has `kg_per_piece`. Total kg = pieces x kg_per_piece.
- Rate has a unit: `per_quintal` (100 kg), `per_kg` or `per_piece`.
  Example from a real slip: 50 pieces x 30 kg = 1500 kg = 15 quintal;
  15 x 11,050 = 1,65,750; plus Rs 50 extra charge = Rs 1,65,800.
  (Rate unit "per quintal" is inferred from the arithmetic; confirm with the owner.)
- Bill number = the number he writes as "T.P." / "Bill No" on his slip. Last known: 4449.
  Next: 4450.
- Money: `numeric(14,2)`, never floating point. Round only at line level.
- UI: large touch targets, Hindi/English toggle, fast. A bill should take under 30 seconds.
- Never auto-send messages to buyers. The app opens WhatsApp with a pre-filled message
  (`wa.me` link) and he presses send.

## 8. Definition of done

- [ ] RLS enabled and policies reviewed on every new table
- [ ] Grants are least-privilege (nothing for `anon`)
- [ ] Tenant-isolation test passes with two dummy accounts
- [ ] Input validated on the server
- [ ] No secrets in the diff
- [ ] Works on a small phone screen
- [ ] Unresolved risks written down
