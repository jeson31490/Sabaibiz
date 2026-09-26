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
Restaurant and shop owners in Koh Samui, Thailand. The app is in English.

## Pricing plans
- Small Business: 490 baht/month (10 invoices/day, 1 manager)
- Medium Business: 990 baht/month (25 invoices/day, voice AI, 3 managers)
- Large Business: 1990 baht/month (unlimited invoices, voice AI, unlimited managers)

## Payment methods
Credit card, PromptPay QR, TrueMoney Wallet, Google Pay

## POS integrations (planned)
Loyverse first, then Ocha and others

## Color palette
- Primary: teal (#0f766e and variants)
- Accent: gold (#b45309 and variants)

## Current status
Home page built and running locally. Next steps: pricing section, authentication, dashboard.
