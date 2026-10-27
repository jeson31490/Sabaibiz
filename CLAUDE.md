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
`business_plans` (`supabase/18_plans_and_quotas.sql`); only the server / service role can change it.
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

## Current status
Plans/quotas, new landing (EN/TH), mobile tab bar, CSV export, privacy/terms, PWA manifest done. Still to do: payment provider, Sentry, transactional emails, LINE/Ocha/Grab, per-dish margins.
