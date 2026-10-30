@AGENTS.md

# SabaiBiz — Project Brief

## What is SabaiBiz
SabaiBiz is a SaaS web app for restaurant and shop owners in Thailand. It allows them to photograph their invoices, automatically extract prices and products using AI, track price changes over time, calculate real profit margins per dish, and connect to their POS system.

## Tech Stack
- Next.js 16 + TypeScript
- Tailwind CSS
- Supabase (database + auth + storage)
- Anthropic Claude API (invoice reading via vision)
- Vercel (hosting)
- Domain: sabaibiz.com

## Target users
Shop, cafe and restaurant owners across Thailand (starting in Koh Samui). The app is in English, Thai next.

## Pricing plans
Source of truth: `lib/plans.ts` (prices, monthly scan quotas, team seats). The plan of each business lives in
`business_plans` (`supabase/20_plans_and_quotas.sql`); only the server / service role can change it.
- Free: 0 baht, no Sabai scans (manual entry + your own Anthropic key only), no invites, no Loyverse. Hard storage caps (supabase/28_free_plan_limits.sql): 120 invoices, 2000 invoice lines, 40 suppliers, 400 products, 800 manual prices, 40 recipes, 400 recipe lines, 400 days of sales, 100 absences, 400 shifts, 5 payroll people, avatar 1 MB; any row max 16 KB
- Solo: 149 baht/month, 15 Sabai scans, up to 10 employees, no managers
- Team: 249 baht/month, 25 scans, up to 20 employees, owner + 2 managers (recommended)
- Tracker: 499 baht/month, 50 scans, up to 50 employees, unlimited managers
- Own Anthropic key (Settings -> AI key): unlimited scans on every plan (daily safety cap), stored encrypted in business_ai_keys
- Employees are free (not paid seats); yearly -20%
- Pay 6 months at once: -10%. Pay a year at once: -20%.
- Invoices have at most 4 pages. Quotas are per calendar month (Bangkok time) and count every reading.
- `PAYMENTS_ENABLED` in `lib/plans.ts` stays false until the payment provider is connected.

## Payment methods
Credit card, PromptPay QR, TrueMoney Wallet, Google Pay

## POS integrations (planned)
Loyverse first, then Ocha and others

## Color palette
- App + landing share the dark lagoon look: bg #031B1C, surface #072A2B, teal #19D3B5, gold #E8B94A, cream text #F4EBD8. Signed-in pages wrap in `.app-dark` (app/globals.css), which re-points the old teal/gold/red utilities to this palette; the hub dashboard is `app/components/AppHub.tsx`.
- Legacy brand: teal #0a646d (ramp in app/globals.css), from the logo
- Accent: gold #c4a35a; crimson #9e2b2f only for money out / warnings
- Font: Prompt (Thai + Latin). Landing: `/` English, `/th` Thai (copy in lib/landingCopy.ts)

## Mobile apps
Capacitor shell around the live site (`capacitor.config.ts`, `android/`, `ios/`, see `MOBILE.md`). PWA: `public/sw.js`, `app/manifest.ts`, `app/components/PwaRegister.tsx`. Account deletion: `/api/account/delete`. Owner dashboard: `ResultHero.tsx` + `OwnerExtras.tsx` above `AppHub`; phone tab bar: `MobileTabBar.tsx`.

## Current status
Plans/quotas, new landing (EN/TH), mobile tab bar, CSV export, privacy/terms, PWA manifest done. Still to do: payment provider, Sentry, transactional emails, LINE/Ocha/Grab, per-dish margins.

## Security
Free accounts unused for 90 days (no sign-in, no invoices/scans/sales) get a warning e-mail at day 83 and are deleted 7 days later if still unused: `app/api/cron/purge-inactive` (daily, `?dry=1` to preview; never touches paid plans or team members; does nothing if Resend isn't configured).
Strict CSP with per-request nonce in `proxy.ts` (root layout is dynamic via `connection()`); other headers in `next.config.ts`. New external hosts (scripts, APIs, images) must be added to the CSP there. Account deletion needs a password sign-in < 5 min old. Emailed links use `linkOrigin()` / `SITE_URL` (lib/site.ts).
