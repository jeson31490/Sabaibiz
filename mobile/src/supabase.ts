// Mobile Supabase client. The website's data code in ../lib imports "./supabase": Metro swaps that
// import for this file (see metro.config.js), so both apps share the same queries.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False when .env is missing: the app then shows a setup message instead of crashing. */
export const supabaseConfigured = Boolean(url && anonKey);

// Row Level Security limits every query to the signed-in user's own business.
export const supabase = createClient(url ?? "https://missing.invalid", anonKey ?? "missing", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh the session while the app is on screen.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
