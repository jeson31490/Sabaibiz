import type { CapacitorConfig } from "@capacitor/cli";

// The app is a native shell around the live site, so every update to sabaibiz.com reaches the phones at once
// (no new store release needed for normal changes). mobile-www is only the fallback shown while connecting.
const config: CapacitorConfig = {
  appId: "com.sabaibiz.app",
  appName: "SabaiBiz",
  webDir: "mobile-www",
  server: {
    url: "https://sabaibiz.com/dashboard",
    cleartext: false,
    allowNavigation: ["sabaibiz.com", "*.sabaibiz.com", "*.supabase.co"],
  },
  backgroundColor: "#031b1c",
  ios: { contentInset: "always", backgroundColor: "#031b1c" },
  android: { backgroundColor: "#031b1c" },
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: "#031b1c", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#031b1c" },
  },
};

export default config;
