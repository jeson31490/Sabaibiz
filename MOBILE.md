# SabaiBiz mobile apps (Android + iOS)

The apps are a native shell (Capacitor) around the live site `https://sabaibiz.com/dashboard`.
Every normal change to the website reaches the phones at once; a new store release is only needed when
the native part changes (icon, permissions, plugins, version).

- App id: `com.sabaibiz.app` · name: SabaiBiz · config: `capacitor.config.ts`
- Folders: `android/` (Android Studio) and `ios/` (Xcode). `mobile-www/` is only the "Connecting…" fallback.
- After changing `capacitor.config.ts` or adding a plugin: `npm run cap:sync`.

## Before the first release
1. **Developer accounts**: Google Play Console (25 USD once) and Apple Developer Program (99 USD / year, an
   organisation account needs a D-U-N-S number and can take days).
2. **Account deletion** is built (Settings → Delete my account → `/api/account/delete`). Both stores require it:
   add the page URL `https://sabaibiz.com/dashboard/settings/delete-account` in the Play "Data safety" form and
   mention it in the App Store review notes. It needs `SUPABASE_SERVICE_ROLE_KEY` on the server.
3. **Payments**: Apple requires in-app purchase for digital subscriptions sold inside the app. Keep the app
   free of any buy button or price call-to-action that leads to payment (sell on the website only) until this
   is decided. Pricing may be shown as information. Re-read the current Apple guideline 3.1.x before submitting.
4. **Apple "minimum functionality" (4.2)**: the shell must feel like an app: camera capture, tab bar,
   offline page and status-bar handling are in; add push notifications before submitting to Apple.
5. **Store listing**: screenshots (6.7" and 6.1" iPhone, phone + tablet Android), description EN/TH, privacy
   policy URL `https://sabaibiz.com/privacy`, support e-mail, age rating, category Business/Finance.
6. **Test account** for the reviewers: create a demo business with fake data and put the login in the review notes.

## Build
- Android: `npm run cap:android` → Android Studio → Build → Generate Signed Bundle (.aab) → upload to Play Console.
  Keep the keystore file and its passwords safe (losing it means you can't update the app). Play App Signing is recommended.
- iOS: needs a Mac with Xcode, or a cloud builder (Codemagic, Ionic Appflow, Xcode Cloud). `npm run cap:ios`,
  choose your Team, Product → Archive → Distribute → App Store Connect.
- Raise `versionCode`/`versionName` (Android) and the build number (iOS) for each release.
