# SabaiBiz mobile (prototype)

Expo (React Native) app for iPhone and Android. It uses the same Supabase project and the same AI
invoice reader (`/api/scan-invoice`) as the website, and reuses the website's data code in `../lib`
(see `metro.config.js`), so both apps read and save invoices the same way.

**Prototype scope:** sign in · home (today's costs, price alerts, recent invoices) · invoices list and detail ·
scan with the camera or gallery (up to 5 pages) · review and save · price alerts · account.

## Setup

```bash
cd mobile
npm install
cp .env.example .env     # then paste the publishable (anon) key, same as NEXT_PUBLIC_SUPABASE_ANON_KEY
npx expo start           # open the QR code with the Expo Go app
```

Never put the Supabase secret / service-role key or the Anthropic key in the mobile app: they stay on the server.

## How it fits with the website

- `src/supabase.ts` is the mobile Supabase client (session kept on the phone). Metro swaps it in for `lib/supabase.ts`.
- `@shared/*` imports point to `../lib/*` (invoices, scanInvoice…). Change that code once, both apps get it.
- The scan screen shrinks photos like the website, then calls `EXPO_PUBLIC_API_URL/api/scan-invoice` with the user's token.
  `EXPO_PUBLIC_API_URL` must be the final website URL with no redirect (a redirect between `sabaibiz.com` and `www` can drop the login header).

## Not done yet

- Date picker (the date is typed as YYYY-MM-DD), editing item lines (use the website), PDF upload.
- Ingredients, margins, POS (Loyverse) and settings screens.
- App icon and splash with the real SabaiBiz logo (the Expo defaults are still in `assets/`).
- Store release: Apple Developer + Google Play accounts, EAS Build (`eas build`), privacy policy URL, store listings.
- Hermes `Intl` check on a real Android phone: `bangkokToday()` in `lib/invoices.ts` uses `Intl.DateTimeFormat` with `Asia/Bangkok`.
