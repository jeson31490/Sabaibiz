import { supabase } from "./supabase";

// Daily takings typed in by hand or read from a photo of the till's end-of-day receipt
// (supabase/23_daily_sales.sql). The owner and managers use them; see period_revenue for how they combine with Loyverse.

export type DailySale = {
  day: string;
  amount: number;
  tickets: number | null;
  note: string | null;
  source: "manual" | "photo";
  enteredBy: string;
};

type Raw = { day: string; amount: number | string; tickets: number | null; note: string | null; source: "manual" | "photo"; entered_by: string };
const fromRaw = (r: Raw): DailySale => ({
  day: r.day,
  amount: Number(r.amount),
  tickets: r.tickets,
  note: r.note,
  source: r.source,
  enteredBy: r.entered_by,
});

/** 42P01: table missing (23_daily_sales.sql not run yet). */
export const isDailySalesNotSetUp = (e: { code?: string } | null) => ["42P01", "PGRST205"].includes(e?.code ?? "");

export async function fetchDailySale(day: string): Promise<DailySale | null> {
  const { data, error } = await supabase
    .from("daily_sales")
    .select("day, amount, tickets, note, source, entered_by")
    .eq("day", day)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRaw(data as Raw) : null;
}

export async function fetchRecentDailySales(limit = 7): Promise<DailySale[]> {
  const { data, error } = await supabase
    .from("daily_sales")
    .select("day, amount, tickets, note, source, entered_by")
    .order("day", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Raw[]).map(fromRaw);
}

/** Saves (or replaces) the takings of one day. user_id and entered_by are filled in by the database. */
export async function saveDailySale(sale: { day: string; amount: number; tickets: number | null; note: string | null; source: "manual" | "photo" }) {
  const { error } = await supabase
    .from("daily_sales")
    .upsert({ ...sale, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  if (error) throw error;
}

export async function deleteDailySale(day: string) {
  const { error } = await supabase.from("daily_sales").delete().eq("day", day);
  if (error) throw error;
}

export type ReadReceipt = { date: string | null; total: number | null; tickets: number | null; label: string | null };

/** Sends a photo of the till's end-of-day receipt to Sabai, which reads the day's total. Nothing is saved. */
export async function readDailyReceipt(dataUrl: string): Promise<ReadReceipt> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/read-daily-sales", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ data: dataUrl, mediaType: dataUrl.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg" }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "We couldn't read this receipt. Please try again.");
  return json as ReadReceipt;
}
