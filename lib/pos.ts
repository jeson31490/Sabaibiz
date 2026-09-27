import { supabase } from "./supabase";

export type PosStatus = {
  merchantName: string | null;
  lastSyncedAt: string | null;
};

export type SyncResult = {
  imported: number;
  lastSyncedAt: string | null;
  /** False when the sync ran out of time: calling it again carries on from where it stopped. */
  complete: boolean;
};

type RawStatus = { provider: string; merchant_name: string | null; last_synced_at: string | null };

/** The business's Loyverse connection, or null if it isn't connected. Never includes the token. */
export async function fetchLoyverseStatus(): Promise<PosStatus | null> {
  const { data, error } = await supabase.rpc("pos_connection_status");
  if (error) throw error;
  const row = ((data ?? []) as RawStatus[]).find((r) => r.provider === "loyverse");
  return row ? { merchantName: row.merchant_name, lastSyncedAt: row.last_synced_at } : null;
}

async function callPosRoute<T>(path: string, method: "POST" | "DELETE", body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Something went wrong. Please try again.");
  return json as T;
}

/** Checks the token with Loyverse and stores it encrypted on the server. */
export function connectLoyverse(token: string): Promise<PosStatus> {
  return callPosRoute<PosStatus>("/api/pos/loyverse/connect", "POST", { token });
}

export function disconnectLoyverse(): Promise<void> {
  return callPosRoute<void>("/api/pos/loyverse/connect", "DELETE");
}

export function syncLoyverse(): Promise<SyncResult> {
  return callPosRoute<SyncResult>("/api/pos/loyverse/sync", "POST");
}
