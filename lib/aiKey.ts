import { supabase } from "./supabase";

export type AiKeyStatus = { saved: boolean; last4: string | null; setUp: boolean };

async function call(method: "GET" | "POST" | "DELETE", body?: unknown): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  return fetch("/api/ai-key", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function fail(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new Error(body?.error ?? fallback);
}

export async function fetchAiKeyStatus(): Promise<AiKeyStatus> {
  const res = await call("GET");
  if (!res.ok) return fail(res, "We couldn't check your AI key.");
  const b = await res.json();
  return { saved: !!b.saved, last4: b.last4 ?? null, setUp: b.setUp !== false };
}

export async function saveAiKey(key: string): Promise<void> {
  const res = await call("POST", { key });
  if (!res.ok) return fail(res, "We couldn't save the key. Please try again.");
}

export async function removeAiKey(): Promise<void> {
  const res = await call("DELETE");
  if (!res.ok) return fail(res, "We couldn't remove the key. Please try again.");
}
