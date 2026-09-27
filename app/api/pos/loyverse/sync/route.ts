import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchReceiptsPage, LoyverseError, type LoyverseReceipt } from "../../../../../lib/loyverse";
import { decryptToken } from "../../../../../lib/posCrypto";
import { jsonError, requireOwner } from "../../../../../lib/posServer";

// The first sync can fetch 90 days of receipts.
export const maxDuration = 300;

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_SYNC_DAYS = 90;
// Receipts are fetched a week at a time; last_synced_at moves forward after each week, so a sync
// that runs out of time carries on from there next time.
const WINDOW_MS = 7 * DAY_MS;
// Look a little before the last sync so a receipt saved while we were syncing isn't missed.
// Safe: a receipt is only ever stored once.
const OVERLAP_MS = 10 * 60 * 1000;
// Stop starting new weeks after this, well before maxDuration.
const TIME_BUDGET_MS = 240 * 1000;

type Admin = SupabaseClient;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Saves one page of receipts. Refunds are stored as negative quantities and amounts, so sums give net sales. */
async function saveReceipts(admin: Admin, ownerId: string, receipts: LoyverseReceipt[]) {
  // A cancelled receipt is not a sale: drop it if an earlier sync stored it.
  const cancelled = receipts.filter((r) => r.cancelled_at).map((r) => r.receipt_number);
  if (cancelled.length > 0) {
    const { error } = await admin
      .from("sales")
      .delete()
      .eq("user_id", ownerId)
      .eq("provider", "loyverse")
      .in("external_id", cancelled);
    if (error) throw new Error(`delete cancelled sales: ${error.message}`);
  }

  const kept = receipts.filter((r) => !r.cancelled_at);
  if (kept.length === 0) return;

  const signOf = (r: LoyverseReceipt) => (r.receipt_type === "REFUND" ? -1 : 1);

  const { data: saved, error: salesError } = await admin
    .from("sales")
    .upsert(
      kept.map((r) => ({
        user_id: ownerId,
        provider: "loyverse",
        external_id: r.receipt_number,
        receipt_type: r.receipt_type,
        receipt_date: r.receipt_date,
        total_money: signOf(r) * Math.abs(num(r.total_money)),
        total_tax: signOf(r) * Math.abs(num(r.total_tax)),
        total_discount: signOf(r) * Math.abs(num(r.total_discount)),
        store_id: r.store_id ?? null,
        raw: r,
      })),
      { onConflict: "user_id,provider,external_id" },
    )
    .select("id, external_id");
  if (salesError) throw new Error(`upsert sales: ${salesError.message}`);

  const saleIds = new Map((saved ?? []).map((s) => [s.external_id as string, s.id as string]));

  // Replace the lines of these receipts, so a receipt synced twice never has its dishes counted twice.
  const { error: deleteError } = await admin.from("sale_items").delete().in("sale_id", [...saleIds.values()]);
  if (deleteError) throw new Error(`clear sale items: ${deleteError.message}`);

  const items = kept.flatMap((r) => {
    const saleId = saleIds.get(r.receipt_number);
    if (!saleId) return [];
    const sign = signOf(r);
    return (r.line_items ?? []).map((li, index) => {
      const cost = numOrNull(li.cost);
      const costTotal = numOrNull(li.cost_total);
      return {
        sale_id: saleId,
        user_id: ownerId,
        line_index: index,
        external_item_id: li.item_id ?? null,
        variant_id: li.variant_id ?? null,
        item_name: li.item_name?.trim() || "Unknown item",
        variant_name: li.variant_name?.trim() || null,
        quantity: sign * Math.abs(num(li.quantity)),
        price: num(li.price),
        gross_total_money: sign * Math.abs(num(li.gross_total_money)),
        total_money: sign * Math.abs(num(li.total_money)),
        cost,
        cost_total: costTotal === null ? null : sign * Math.abs(costTotal),
      };
    });
  });
  if (items.length > 0) {
    const { error: itemsError } = await admin.from("sale_items").insert(items);
    if (itemsError) throw new Error(`insert sale items: ${itemsError.message}`);
  }
}

async function countSales(admin: Admin, ownerId: string): Promise<number> {
  const { count, error } = await admin
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ownerId)
    .eq("provider", "loyverse");
  if (error) throw new Error(`count sales: ${error.message}`);
  return count ?? 0;
}

// Imports Loyverse receipts into sales and sale_items. Returns how many new receipts were added.
export async function POST(request: Request) {
  const startedAt = Date.now();
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;
  const { ownerId, admin } = auth;

  const { data: connection, error: connectionError } = await admin
    .from("pos_connections")
    .select("access_token_encrypted, last_synced_at")
    .eq("user_id", ownerId)
    .eq("provider", "loyverse")
    .maybeSingle();
  if (connectionError) {
    console.error("pos/loyverse/sync: read connection failed", connectionError.message);
    return jsonError("We couldn't sync your sales. Please try again.", 500);
  }
  if (!connection) return jsonError("Loyverse isn't connected yet.", 404);

  let token: string;
  try {
    token = decryptToken(connection.access_token_encrypted, ownerId);
  } catch {
    console.error("pos/loyverse/sync: token could not be decrypted (POS_ENCRYPTION_KEY changed?)");
    return jsonError("Please disconnect Loyverse and connect it again.", 500);
  }

  const now = new Date();
  let from = connection.last_synced_at
    ? new Date(new Date(connection.last_synced_at).getTime() - OVERLAP_MS)
    : new Date(now.getTime() - FIRST_SYNC_DAYS * DAY_MS);
  let lastSyncedAt: string | null = connection.last_synced_at;
  let processed = 0;

  try {
    const before = await countSales(admin, ownerId);

    while (from < now) {
      const to = new Date(Math.min(from.getTime() + WINDOW_MS, now.getTime()));
      let cursor: string | undefined;
      do {
        const page = await fetchReceiptsPage(token, from, to, cursor);
        const receipts = page.receipts ?? [];
        await saveReceipts(admin, ownerId, receipts);
        processed += receipts.length;
        cursor = page.cursor || undefined;
      } while (cursor);

      // This week is fully imported.
      lastSyncedAt = to.toISOString();
      const { error } = await admin
        .from("pos_connections")
        .update({ last_synced_at: lastSyncedAt })
        .eq("user_id", ownerId)
        .eq("provider", "loyverse");
      if (error) throw new Error(`update last_synced_at: ${error.message}`);
      from = to;

      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    }

    const imported = (await countSales(admin, ownerId)) - before;
    return Response.json({ imported, processed, lastSyncedAt, complete: from >= now });
  } catch (error) {
    if (error instanceof LoyverseError) {
      console.error("pos/loyverse/sync: Loyverse error", error.status);
      if (error.status === 401 || error.status === 403) {
        return jsonError("Your Loyverse key no longer works. Disconnect and connect again with a new access token.", 400);
      }
      if (error.status === 429) return jsonError("Loyverse is busy. Please try again in a minute.", 429);
      return jsonError("We couldn't reach Loyverse. Please try again in a moment.", 502);
    }
    console.error("pos/loyverse/sync: failed", error instanceof Error ? error.message : error);
    return jsonError("We couldn't save your sales. Please try again.", 500);
  }
}
