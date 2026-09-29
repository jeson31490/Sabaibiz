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

async function totals(start: Date, end: Date): Promise<{ revenue: number; tickets: number }> {
  if (end <= start) return { revenue: 0, tickets: 0 };
  // Added up in the database (supabase/12_sales_totals.sql): a month is thousands of receipts.
  const { data, error } = await supabase.rpc("sales_totals", { p_from: start.toISOString(), p_to: end.toISOString() });
  if (error) throw error;
  const row = (data as { revenue: number | string; tickets: number }[] | null)?.[0];
  return { revenue: Number(row?.revenue ?? 0), tickets: Number(row?.tickets ?? 0) };
}

/** Loyverse sales over a period (Bangkok days), compared with its comparison period. */
export async function fetchPeriodSales(period: ResolvedPeriod): Promise<PeriodSales> {
  const status = await fetchLoyverseStatus();
  if (!status) return { connected: false };

  const { start, end } = bangkokInstants(period);
  const lastSync = status.lastSyncedAt ? new Date(status.lastSyncedAt) : null;
  if (!lastSync || lastSync <= start) return { connected: true, synced: false };

  // Sales after the last sync (or in the future) aren't imported yet: stop there, and compare
  // with the same length of the previous period so a morning isn't compared with a whole day.
  const cutEnd = new Date(Math.min(end.getTime(), lastSync.getTime(), Date.now()));
  const cut = end.getTime() - cutEnd.getTime();
  const previous = bangkokInstants(period.previous);

  const [current, before] = await Promise.all([
    totals(start, cutEnd),
    totals(previous.start, new Date(previous.end.getTime() - cut)),
  ]);
  return {
    connected: true,
    synced: true,
    revenue: current.revenue,
    tickets: current.tickets,
    previousRevenue: before.revenue,
    until: cut > 0 ? cutEnd.toISOString() : null,
  };
}
