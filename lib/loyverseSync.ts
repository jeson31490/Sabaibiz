import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchCategories,
  fetchItems,
  fetchModifiers,
  fetchReceiptsPage,
  LoyverseError,
  type LoyverseLineItem,
  type LoyverseReceipt,
} from "./loyverse";
import { decryptToken } from "./posCrypto";

// Imports Loyverse receipts into sales and sale_items. Used by "Sync sales now"
// (app/api/pos/loyverse/sync) and by the daily cron (app/api/cron/sync-sales).

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_SYNC_DAYS = 90;
// Receipts are fetched a week at a time; last_synced_at moves forward after each week, so a sync
// that runs out of time carries on from there next time.
const WINDOW_MS = 7 * DAY_MS;
// Look a little before the last sync so a receipt saved while we were syncing isn't missed.
// Safe: a receipt is only ever stored once.
const OVERLAP_MS = 10 * 60 * 1000;

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
        // e.g. {"Shrimp"}; null when no option was chosen (always, so far).
        modifier_options: optionNames(li.line_modifiers),
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

/** Names of the options chosen on a receipt line ("Shrimp"), or null when there are none. */
function optionNames(mods: LoyverseLineItem["line_modifiers"]): string[] | null {
  const names = (mods ?? [])
    .map((m) => (m?.option ?? m?.name ?? "").trim())
    .filter((n): n is string => n !== "");
  return names.length > 0 ? names : null;
}

/**
 * Imports the Loyverse menu (items with their category and price, and modifiers) into menu_items
 * and menu_modifiers. Returns how many items were imported. Items removed from Loyverse are removed here.
 */
export async function importLoyverseMenu(admin: Admin, ownerId: string, token: string): Promise<number> {
  const [items, categories, modifiers] = await Promise.all([
    fetchItems(token),
    fetchCategories(token),
    fetchModifiers(token),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const syncedAt = new Date().toISOString();

  const rows = items
    .filter((i) => !i.deleted_at && i.item_name?.trim())
    .map((i) => {
      const price = i.variants?.[0]?.default_price;
      return {
        user_id: ownerId,
        provider: "loyverse",
        external_id: i.id,
        name: i.item_name.trim(),
        category: (i.category_id && categoryName.get(i.category_id)) || null,
        price: typeof price === "number" && Number.isFinite(price) ? price : null,
        sold_by_weight: i.sold_by_weight === true,
        raw: i,
        synced_at: syncedAt,
      };
    });
  // In chunks: a menu can have several hundred items.
  for (let k = 0; k < rows.length; k += 200) {
    const { error } = await admin
      .from("menu_items")
      .upsert(rows.slice(k, k + 200), { onConflict: "user_id,provider,external_id" });
    if (error) throw new Error(`upsert menu items: ${error.message}`);
  }

  const modifierRows = modifiers.map((m) => ({
    user_id: ownerId,
    provider: "loyverse",
    external_id: m.id,
    name: m.name?.trim() || "Options",
    options: (m.modifier_options ?? []).map((o) => ({ id: o.id ?? null, name: o.name ?? "", price: o.price ?? null })),
    synced_at: syncedAt,
  }));
  if (modifierRows.length > 0) {
    const { error } = await admin
      .from("menu_modifiers")
      .upsert(modifierRows, { onConflict: "user_id,provider,external_id" });
    if (error) throw new Error(`upsert menu modifiers: ${error.message}`);
  }

  // Whatever this import didn't see was deleted in Loyverse.
  for (const table of ["menu_items", "menu_modifiers"] as const) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq("user_id", ownerId)
      .eq("provider", "loyverse")
      .lt("synced_at", syncedAt);
    if (error) throw new Error(`remove old ${table}: ${error.message}`);
  }
  return rows.length;
}

export class SyncError extends Error {
  constructor(public reason: "not_connected" | "token_unreadable") {
    super(reason);
  }
}

export type SyncResult = {
  imported: number;
  processed: number;
  lastSyncedAt: string | null;
  /** False when time ran out: the next sync carries on from lastSyncedAt. */
  complete: boolean;
  /** Menu items imported, or null when the menu import was skipped (time) or failed (logged). */
  menuItems: number | null;
};

/**
 * Imports one business's new receipts, a week at a time, until done or until `deadline`
 * (a Date.now() value) is passed. Throws SyncError, LoyverseError, or Error for database failures.
 */
export async function syncLoyverseAccount(admin: Admin, ownerId: string, deadline: number): Promise<SyncResult> {
  const { data: connection, error: connectionError } = await admin
    .from("pos_connections")
    .select("access_token_encrypted, last_synced_at")
    .eq("user_id", ownerId)
    .eq("provider", "loyverse")
    .maybeSingle();
  if (connectionError) throw new Error(`read connection: ${connectionError.message}`);
  if (!connection) throw new SyncError("not_connected");

  let token: string;
  try {
    token = decryptToken(connection.access_token_encrypted, ownerId);
  } catch {
    throw new SyncError("token_unreadable");
  }

  const now = new Date();
  let from = connection.last_synced_at
    ? new Date(new Date(connection.last_synced_at).getTime() - OVERLAP_MS)
    : new Date(now.getTime() - FIRST_SYNC_DAYS * DAY_MS);
  let lastSyncedAt: string | null = connection.last_synced_at;
  let processed = 0;
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

    if (Date.now() > deadline) break;
  }

  const imported = (await countSales(admin, ownerId)) - before;
  // The menu is small (a few calls): refreshed on every sync that has time left. Never fails the sync.
  let menuItems: number | null = null;
  if (Date.now() < deadline) {
    try {
      menuItems = await importLoyverseMenu(admin, ownerId, token);
    } catch (err) {
      console.error("loyverse menu import failed:", err instanceof LoyverseError ? `Loyverse ${err.status}` : err instanceof Error ? err.message : err);
    }
  }

  return { imported, processed, lastSyncedAt, complete: from >= now, menuItems };
}
