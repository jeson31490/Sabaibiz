import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "./posCrypto";

/** The business's own Anthropic API key, decrypted. Server only; null when none is saved or it can't be read. */
export async function fetchOwnAiKey(admin: SupabaseClient, businessId: string): Promise<string | null> {
  const { data, error } = await admin.from("business_ai_keys").select("key_encrypted").eq("user_id", businessId).maybeSingle();
  if (error) {
    // 42P01: table missing (21_tracker_plan_and_ai_key.sql not run). Treated as "no key".
    if (error.code !== "42P01") console.error("aiKey: read failed", error.message);
    return null;
  }
  if (!data?.key_encrypted) return null;
  try {
    return decryptToken(data.key_encrypted, businessId);
  } catch (e) {
    console.error("aiKey: couldn't decrypt the saved key", e instanceof Error ? e.message : e);
    return null;
  }
}
