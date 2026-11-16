# Release checklist — what only Jeson can do (code side is ready)

1. Apple Developer (organisation, needs D-U-N-S) + Google Play Console (organisation account avoids the 12-tester/14-day rule).
2. Android keystore: `keytool -genkey -v -keystore release.jks -alias sabaibiz -keyalg RSA -keysize 2048 -validity 10000`;
   add GitHub secrets ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD; run the "Android release bundle" workflow; upload the .aab.
3. iOS has no Mac here: use Codemagic or Xcode Cloud connected to this repo (needs App Store Connect API key).
4. Push notifications (Apple 4.2): needs Firebase project (google-services.json) + APNs key — not code-only.
5. Create demo account, fill store/review-notes.md; capture screenshots; ask a Thai speaker to check store/listing-th.md.
6. Do NOT start paid US ads before the apps are approved and live.
