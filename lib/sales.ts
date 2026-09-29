import { bangkokToday } from "./invoices";
import { fetchLoyverseStatus } from "./pos";
import { supabase } from "./supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TodaySales =
  | { connected: false }
  | {
      connected: true;
      /** Net sales (refunds deducted), including tax, from midnight Bangkok time to the last sync. */
      revenue: number;
      /** Sale receipts; refunds are not counted as tickets. */
      tickets: number;
      /** Same weekday last week, over the same hours (midnight → time of the last sync). */
      lastWeekRevenue: number;
      /** Null when today hasn't been synced yet. */
      syncedUntil: string | null;
    };

async function salesBetween(from: Date, to: Date): Promise<{ revenue: number; tickets: number }> {
  if (to <= from) return { revenue: 0, tickets: 0 };
  const { data, error } = await supabase
    .from("sales")
    .select("total_money, receipt_type")
    .gte("receipt_date", from.toISOString())
    .lt("receipt_date", to.toISOString());
  if (error) throw error;
  const rows = (data ?? []) as { total_money: number | string; receipt_type: "SALE" | "REFUND" }[];
  // Refunds are stored negative (see lib/loyverseSync.ts). Add up in satang to avoid floating-point drift.
  const satang = rows.reduce((s, r) => s + Math.round(Number(r.total_money) * 100), 0);
  return { revenue: satang / 100, tickets: rows.filter((r) => r.receipt_type === "SALE").length };
}

/** Today's Loyverse sales so far (Bangkok time), compared with the same day last week. */
export async function fetchTodaySales(): Promise<TodaySales> {
  const status = await fetchLoyverseStatus();
  if (!status) return { connected: false };

  // Thailand has no daylight saving time, so a Bangkok day is always exactly 24 hours.
  const todayStart = new Date(`${bangkokToday()}T00:00:00+07:00`);
  const lastSync = status.lastSyncedAt ? new Date(status.lastSyncedAt) : null;
  // Only compare hours we have for today: sales after the last sync aren't imported yet.
  const until = lastSync && lastSync > todayStart ? new Date(Math.min(lastSync.getTime(), Date.now())) : null;
  const hours = until ? until.getTime() - todayStart.getTime() : 0;
  const lastWeekStart = new Date(todayStart.getTime() - 7 * DAY_MS);

  const [today, lastWeek] = await Promise.all([
    salesBetween(todayStart, new Date(todayStart.getTime() + hours)),
    salesBetween(lastWeekStart, new Date(lastWeekStart.getTime() + hours)),
  ]);
  return {
    connected: true,
    revenue: today.revenue,
    tickets: today.tickets,
    lastWeekRevenue: lastWeek.revenue,
    syncedUntil: until ? until.toISOString() : null,
  };
}
