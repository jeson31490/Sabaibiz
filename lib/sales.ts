import { fetchLoyverseStatus } from "./pos";
import { bangkokInstants, type ResolvedPeriod } from "./periods";
import { supabase } from "./supabase";

export type PeriodSales =
  | { connected: false }
  | { connected: true; synced: false }
  | {
      connected: true;
      synced: true;
      /** Net sales (refunds deducted), including tax. */
      revenue: number;
      /** Sale receipts; refunds are not counted as tickets. */
      tickets: number;
      /** Same measure over the comparison period, over the same length of time. */
      previousRevenue: number;
      /** Set when the period isn't over or not fully imported: numbers stop at this moment. */
      until: string | null;
    };

type Totals = { revenue: number; tickets: number; manualDays: number };

async function totals(start: Date, end: Date): Promise<Totals> {
  if (end <= start) return { revenue: 0, tickets: 0, manualDays: 0 };
  // Added up in the database: a month is thousands of receipts. period_revenue (supabase/23_daily_sales.sql)
  // also counts the takings typed in by hand, which replace Loyverse on the days they exist.
  const args = { p_from: start.toISOString(), p_to: end.toISOString() };
  const { data, error } = await supabase.rpc("period_revenue", args);
  if (!error) {
    const row = (data as { revenue: number | string; tickets: number | string; manual_days: number | string }[] | null)?.[0];
    return { revenue: Number(row?.revenue ?? 0), tickets: Number(row?.tickets ?? 0), manualDays: Number(row?.manual_days ?? 0) };
  }
  // 42883 / PGRST202: supabase/23 not run yet: Loyverse only, as before.
  if (!["42883", "PGRST202"].includes(error.code ?? "")) throw error;
  const old = await supabase.rpc("sales_totals", args);
  if (old.error) throw old.error;
  const row = (old.data as { revenue: number | string; tickets: number }[] | null)?.[0];
  return { revenue: Number(row?.revenue ?? 0), tickets: Number(row?.tickets ?? 0), manualDays: 0 };
}

/**
 * Sales over a period (Bangkok days), compared with its comparison period: Loyverse receipts and/or the
 * daily takings typed in by hand. `connected: false` means neither exists yet.
 */
export async function fetchPeriodSales(period: ResolvedPeriod): Promise<PeriodSales> {
  const status = await fetchLoyverseStatus();

  const { start, end } = bangkokInstants(period);
  const lastSync = status?.lastSyncedAt ? new Date(status.lastSyncedAt) : null;
  const loyverseReady = !!status && !!lastSync && lastSync > start;

  // Loyverse sales after the last sync (or in the future) aren't imported yet: stop there, and compare
  // with the same length of the previous period so a morning isn't compared with a whole day.
  // Without Loyverse data there is nothing to cut: takings typed in by hand cover whole days.
  const cutEnd = loyverseReady ? new Date(Math.min(end.getTime(), lastSync.getTime(), Date.now())) : end;
  const cut = end.getTime() - cutEnd.getTime();
  const previous = bangkokInstants(period.previous);

  const [current, before] = await Promise.all([
    totals(start, cutEnd),
    totals(previous.start, new Date(previous.end.getTime() - cut)),
  ]);

  if (!loyverseReady && current.manualDays === 0) return status ? { connected: true, synced: false } : { connected: false };
  return {
    connected: true,
    synced: true,
    revenue: current.revenue,
    tickets: current.tickets,
    previousRevenue: before.revenue,
    until: cut > 0 ? cutEnd.toISOString() : null,
  };
}
