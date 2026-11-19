# DEPLOYMENT.md - Jamabook: low-cost, safe production deployment

Replaces the hosting parts of Prompt 8 in `LAUNCH_PLAN.md`. Do the prompts in
`LAUNCH_PLAN.md` (1 to 7) first. Deploy only when the Release gate there passes.

Goal: the trader's app runs for near zero rupees a month, his data is backed up
every night, errors and downtime reach you, and you can roll back in minutes.

---

## 1. The stack (and what the GitHub Student Developer Pack gives you)

| Part | Choice | Cost | Notes |
|---|---|---|---|
| Hosting (primary) | Cloudflare Workers (free plan) via `@opennextjs/cloudflare` | free | Edge servers near India. Free plan limits: 100,000 requests/day, 10 ms CPU per request, 3 MiB app size (compressed). If you hit them, the paid plan is about $5/month |
| Hosting (fallback 1) | Heroku Basic dyno, paid from the Student Pack credit ($13/month credit for 24 months) | about ₹0 for 2 years | A normal Node server, so Next.js runs unchanged. Heroku's standard regions are US and Europe as far as I know, so expect extra delay to India |
| Hosting (fallback 2) | Netlify free | free | Next.js support built in. Credit-metered |
| Database + login | Supabase, region Mumbai | Free for the pilot, then Pro ($25/month) | Free has no backups and pauses after 1 week of inactivity |
| Backups | Nightly encrypted `pg_dump` from a GitHub Action | free | Needed on the free Supabase plan. Keep it on Pro too, as a second copy |
| Error tracking | Sentry (Student Pack: free for 1 year, renewable) | free | Configure to send NO customer data |
| Uptime + cron monitoring | Honeybadger (Student Pack: free Small account for 1 year) | free | Also keeps Supabase awake by calling `/api/health` |
| Domain | Name.com free domain (.app/.dev etc.) or Namecheap .me for 1 year (Student Pack) | free in year 1 | Optional. A short name is easier to type and trust |
| Coding help | GitHub Copilot Student, GitHub Codespaces (Student Pack) | free | For you, not part of the running app |

Not worth it for this app: Azure's $100 credit (a VM or App Service works, but it
means more admin work than the options above), Datadog, MongoDB.

**Be careful:** Student Pack offers are given to you as a student. Read each
offer's terms before running his real business on it, and note when each one
expires (Sentry and Honeybadger about 1 year, Heroku credit 24 months, domain
renews after year 1). Put those dates in your calendar now.

**Cost picture:** pilot about ₹0. After the pilot add Supabase Pro (about $25, roughly ₹2,300) so the
provider keeps daily backups. Cloudflare paid, if needed, adds about $5.

---

## 2. Manual steps first (you do these, not the AI)

1. GitHub: make the repo **private**. Apply for the Student Pack if you have not, then activate Heroku, Sentry, Honeybadger, Name.com.
2. Supabase: create `jamabook-dev` and `jamabook-prod`, both in Mumbai. In prod, turn OFF "Allow new users to sign up". Create his user in Auth, Users. Set Auth Site URL and Redirect URLs to the final domain only.
3. Create his business and membership with the SQL in `LAUNCH_PLAN.md` section 4 (set `next_bill_no` to his real next number).
4. Create a Cloudflare account (free). Create a Sentry project (Next.js) and a Honeybadger project. Keep their keys for the prompts below.
5. Create an `age` key pair on your own laptop for backups (`age-keygen`). Put ONLY the public key in GitHub. Keep the private key in two safe places, never in the repo. Without it a backup cannot be restored.
6. Never paste real secrets into an AI chat. Add them yourself in the host's secret settings and GitHub Secrets.

---

## 3. Prompts

Paste **Prompt 0** from `LAUNCH_PLAN.md` first in every session. One prompt at a time, on a new branch.

### Prompt D1 - Deploy to Cloudflare Workers (primary)

```
Task: deploy Jamabook to Cloudflare Workers using @opennextjs/cloudflare.

First read the CURRENT official docs at https://opennext.js.org/cloudflare and
Cloudflare's Workers docs. Do not rely on memory for commands or config names.
Tell me what you found and any limitation that affects this app before coding.

Do:
1. Add the OpenNext Cloudflare adapter, wrangler config (with the Node
   compatibility setting the docs require), and build/preview/deploy scripts.
2. Verify the pieces this app needs: App Router pages, API/route handlers, the
   Supabase session-refresh code (the middleware / proxy file in Next.js 16), and
   cookies. The docs say Node-runtime middleware (proxy.ts) is experimental on
   this adapter: test login, session refresh after 1 hour, and logout in the
   local preview and report honestly if it fails.
3. Check the free-plan limits: print the compressed Worker size and make sure it
   is under 3 MiB; make sure @react-pdf/renderer is loaded only in the browser
   via dynamic import and is NOT bundled into the Worker. Report CPU risk.
4. Secrets: use wrangler secrets / dashboard variables for server values, and
   .dev.vars (git-ignored) for local. NEXT_PUBLIC_* may only hold the Supabase URL
   and anon key. The service-role key must not exist anywhere unless a server
   feature needs it; if unused, do not add it.
5. Add separate environments: production uses the prod Supabase project,
   preview and local use the dev project. Show where each variable is set.
6. Connect GitHub for builds on push to main (Workers Builds or an Action).
   Production deploys only from main after CI passes. No secret in the repo.
7. Write docs/DEPLOY.md: first deploy, redeploy, rollback to the previous version,
   rotate a secret, and how to add the custom domain.
8. Measure: with the dev project, report time from tapping Save to the bill
   confirmation from a normal 4G-like connection. Target under 1.5 seconds.

If the auth middleware cannot work on this adapter, STOP and say so. Do not
disable the session check to make it deploy. Propose Prompt D2 (Heroku) or the
Netlify fallback instead.
```

### Prompt D2 - Fallback: deploy to Heroku (only if D1 fails)

```
Task: deploy Jamabook to Heroku as a normal Node app.

1. Read Heroku's current Node.js and Next.js deployment docs first. Tell me the
   dyno type and region options you find (I expect no India region) and the
   latency impact on a Supabase project in Mumbai.
2. Add what Heroku needs: package.json "engines" for the Node version,
   "build" and "start" scripts that honour the PORT variable, and a Procfile if
   required. Use a Basic dyno (not Eco, which sleeps when idle).
3. Config vars via heroku config:set (I will run it); list the names only.
   Same secret rules as D1.
4. Add a release-phase check that fails the deploy if required env vars are
   missing (use src/lib/env.ts).
5. Document: deploy, heroku rollback, view logs (logs must not contain bill
   data), and restart.
6. Measure Save-to-confirmation time like D1 and report it.
```

### Prompt D3 - Nightly encrypted backup and a restore test

```
Task: automatic encrypted database backups and a proven restore.

1. Create .github/workflows/backup.yml: runs every night at 21:00 UTC (about 2:30
   am IST) and can be started by hand. It must:
   - use the Postgres client version that matches the Supabase server's major
     version (check it, install it from the official PostgreSQL apt repository),
   - connect with the repo secret PROD_DB_URL. Use Supabase's connection-pooler
     string, because GitHub runners may not reach the direct IPv6 address; check
     the Supabase docs and tell me which string to use,
   - run pg_dump in custom format with --no-owner --no-privileges for the public
     schema AND the auth schema users table needed to restore logins (explain
     what you include and why),
   - encrypt the dump with `age` using the public key in the repo variable
     BACKUP_AGE_PUBLIC_KEY (never the private key),
   - delete the plain file, upload only the encrypted file as an artifact with
     30-day retention,
   - fail loudly (the run turns red and GitHub emails me) if the dump is empty or
     smaller than 1 KB.
   The workflow must never print the connection string, the dump contents, or
   any row data into the logs. Use ::add-mask:: where needed.
2. Create scripts/restore-test.sh: takes an encrypted dump and my private key
   file path, restores into a throwaway local Postgres (or the dev project),
   then runs sanity checks: counts of businesses, parties, items, invoices,
   stock_movements; the sum of invoice totals; the current stock per item
   computed from stock_movements. Print the numbers for me to compare.
3. Document in docs/BACKUP.md: where the dumps are, how to download one, how to
   decrypt, how to restore, and the monthly restore drill (first Sunday).
   State that the private age key is kept offline and without it backups are
   useless.
4. This repo and its Actions must be private. Add a check in the README to confirm.

Do not run the workflow against production yourself. Tell me the exact secrets
and variables I must add in GitHub, and I will do it.
```

### Prompt D4 - Monitoring without leaking customer data

```
Task: add error tracking and uptime monitoring that never receives his business data.

1. /api/health: returns { ok: true, db: true|false }. The db check calls a
   tiny database function health_ping() that returns true and touches no
   business table; create it in a new migration, security definer, revoke all,
   then grant execute only to the role the route uses. Return 503 if it fails.
   Never include versions, env names or error text in the response.
2. Sentry: read the CURRENT Sentry Next.js docs and check whether the SDK works
   on the Cloudflare Workers adapter I am using; if not, say so and use the
   simplest supported alternative. Configure:
   - sendDefaultPii false, session replay OFF, no request bodies, no cookies,
     no headers, no query strings, no IP addresses,
   - a beforeSend that removes anything that looks like a phone number, bill
     number, amount, party name or token,
   - release name = git commit, environment = production/preview.
   Write a test that throws an error containing fake bill data and prove the
   captured event does not include it.
3. Honeybadger: an uptime check on /api/health every 5 minutes with email alert
   to me. This also keeps the Supabase free project from pausing.
4. Add a check-in (Honeybadger cron monitoring) at the end of the nightly backup
   workflow so I am alerted if a backup does NOT run.
5. Make sure no code logs bill contents, phone numbers, tokens or passwords.
Report what you could not verify.
```

### Prompt D5 - Production smoke test and go-live check

```
Task: write scripts/smoke-test.md and a Playwright test (tests/smoke.spec.ts) I
run after every production deploy, using a dedicated TEST business, never his real data.

Cover: login works; wrong password fails; the app redirects to login without a
session; create a bill and see stock drop; the PDF downloads and the text can be
selected; cancel the bill and see stock restored; double-tapping Save makes one
bill; /api/health is ok; response headers include CSP, X-Frame-Options,
X-Content-Type-Options and Referrer-Policy; page source contains no service-role
key or other secret; the app works on a 360 px wide screen and zoom is allowed.

Then produce a table of the LAUNCH_PLAN.md Release gate with PASS / FAIL /
NOT TESTED and the proof for each line. Do not change application code.
```

### Prompt D6 - Rollback and incident drill

```
Task: write docs/INCIDENTS.md and rehearse it on the dev project.

Include exact commands or clicks for: roll back the app to the previous deploy;
what to do if a migration breaks (rule: migrations are additive and forward-only;
take a manual backup before every production migration; fix forward with a new
migration); how to restore the database from a backup into a NEW Supabase
project and point the app at it; how to disable the app and show a "back soon"
page; how to rotate the Supabase keys and the Telegram token; who to tell and
what to tell the trader (he can keep using paper slips in the meantime).
Rehearse the database restore and the rollback on the dev project and report the
time each took.
```

---

## 4. Go-live day (in order)

1. Release gate in `LAUNCH_PLAN.md` all PASS.
2. Run Prompt D5 against production with the TEST business. Fix anything that fails.
3. Run the backup workflow by hand. Download it, decrypt it, restore it on a throwaway database, compare counts (Prompt D3). Only then continue.
4. Deploy from `main`. Open the app on his phone, add it to the home screen, set the app-lock PIN.
5. Enter his opening stock, buyers, transporters, brokers and materials.
6. Create ONE real bill together with him and compare it with his paper slip.
7. Start the 2-week pilot (`LAUNCH_PLAN.md` section 6).

## 5. Keep it healthy

- Every month: restore one backup on a test database and check the numbers.
- Every month: check Supabase usage, the Sentry and Honeybadger alerts, and `npm audit`.
- Before any production migration: manual backup, then run on dev first.
- When Sentry or Honeybadger year ends, renew or replace them.
- When the pilot ends and money is involved, move Supabase to Pro.

## Sources

- GitHub Student Developer Pack offers: https://education.github.com/pack/offers
- OpenNext for Cloudflare: https://opennext.js.org/cloudflare
- Cloudflare Workers pricing and free limits: https://developers.cloudflare.com/workers/platform/pricing/index.md
- Supabase pricing: https://supabase.com/pricing.md
- Heroku dyno prices (third-party, dated 3 Nov 2026; confirm on Heroku): https://www.activepieces.com/blog/heroku-pricing-2026-plans-costs-and-alternatives.md
