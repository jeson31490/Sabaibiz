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
- Free: 0 baht, NO invoice scans (reading calls the AI and must cost us nothing); manual ingredients/prices only, no team accounts
- Solo: 299 baht/month, 60 scans, 1 team account
- Team: 690 baht/month, 150 scans, 3 team accounts (recommended)
- Empire: 1990 baht/month, 400 scans, unlimited team accounts
- Pay 6 months at once: -10%. Pay a year at once: -20%.
- Invoices have at most 4 pages. Quotas are per calendar month (Bangkok time) and count every reading.
- `PAYMENTS_ENABLED` in `lib/plans.ts` stays false until the payment provider is connected.

## Payment methods
Credit card, PromptPay QR, TrueMoney Wallet, Google Pay

## POS integrations (planned)
Loyverse first, then Ocha and others

## Color palette
- Primary: teal #0a646d (ramp in app/globals.css), from the logo
- Accent: gold #c4a35a; crimson #9e2b2f only for money out / warnings
- Font: Prompt (Thai + Latin). Landing: `/` English, `/th` Thai (copy in lib/landingCopy.ts)

## Current status (updated 28 Oct 2026)
Rule from the owner: nothing free may cost us money. No AI invoice reading on Free, no free trials, no gifted scans (a bot creating thousands of accounts would run up the AI bill). Paid plans only.

Done and in production (PRs 1-8): plans and monthly quotas (Free 0 / Solo 299 / Team 690 / Empire 1990), EN/TH landing, recipes and margins (Empire only), CSV export, help/FAQ/privacy/terms reachable from the account, PWA manifest, Sentry (DSN in Vercel), supabase/20_plans_and_quotas.sql already run in production.

Pending: PR #9 "Free plan without invoice reading" (merge only on the owner's explicit OK).

Model test (hidden page /dashboard/lab/models, only emails in ADMIN_EMAILS, already set in Vercel). One invoice (max 4 pages) per run; the owner picks the files himself. HomePro, 2 pages: Sonnet 4.6 (current SCAN_MODEL) 12/12 prices right, 27 s, ~$0.04; Sonnet 5 12/12 but 106 s and $0.145 (too slow for the 60 s scan limit); Haiku 4.5 7/12 (prices shifted on a tilted photo, invented Thai, wrong invoice number), 14 s, $0.013. Haiku rejected as is. Still to test: two Makro invoices (14/05/2026 total 4,400; 21/07/2026 total 2,338.25 with a -89 discount and weighed items). Test photos are on his PC in Downloads/sabaibiz/factures-test (not committed).

Competitors: FlowAccount = tax accounting for SMEs and accountants (Free forever without receipt scanning; Standard 165 baht/month billed yearly with 100 scans; no price history per product, no margin per dish). US (MarketMan, Restaurant365, Toast) sell by demo to chains; Europe (Pennylane, Inpulse) clean white pages. Our edge: price history per product, real margin per dish, one clear "today" number, Loyverse, built for Thai single-shop owners on a phone.

Next: visual redesign of the site as beautiful as the Moustache site. Proposed (not yet approved): the paper receipt (pink perforated Makro slip) turning into one number; teal/gold, Prompt; dashboard = today's result vs last week, price-rise alert, 3 worst-margin dishes. Show a mockup before coding.

Still to do: decide whether to lower Solo to ~199 baht; free contact address (ImprovMX or Cloudflare Email Routing) then set CONTACT_EMAIL in lib/site.ts; check Resend as Supabase SMTP; check Sentry gets events; real scan and 402 path test; native Thai proofreading and confirm "Golden Truffle" as operator in the terms; payment last (owner connects it, then PAYMENTS_ENABLED=true); later LINE, Ocha, Grab, mobile tab bar.
