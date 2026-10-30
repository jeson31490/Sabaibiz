import { timingSafeEqual } from "node:crypto";
import { LoyverseError } from "../../../../lib/loyverse";
import { SyncError, syncLoyverseAccount } from "../../../../lib/loyverseSync";
import { PAYMENT_SCAN_BUCKET, PAYMENT_SCAN_RETENTION_DAYS } from "../../../../lib/paymentScans";
import { createAdminClient, isFreeBusiness } from "../../../../lib/posServer";

// Daily sync of every connected Loyverse account, called by Vercel Cron (vercel.json), early
// morning in Bangkok. "Sync sales now" in Settings still works any time in between.
export const maxDuration = 300;

// Leave time to answer before maxDuration; an account not reached carries on at the next run.
const TIME_BUDGET_MS = 270 * 1000;

/** Vercel sends "Authorization: Bearer <CRON_SECRET>". Compared in constant time. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const deadline = Date.now() + TIME_BUDGET_MS;
  const admin = createAdminClient();
  if (!admin) {
    console.error("cron/sync-sales: SUPABASE_SERVICE_ROLE_KEY is not set");
    return Response.json({ error: "not configured" }, { status: 500 });
  }

  // Housekeeping: the "in zone / out of zone" results are kept 3 months (supabase/24_workplace_zone.sql).
  const purged = await admin.rpc("purge_old_zone_checks");
  if (purged.error && !["42883", "PGRST202"].includes(purged.error.code ?? "")) {
    console.error("cron/sync-sales: zone purge failed", purged.error.message);
  }

  // Housekeeping: transfer photos are kept 90 days (supabase/25_payment_scans.sql). Files first, then the rows.
  try {
    const cutoff = new Date(Date.now() - PAYMENT_SCAN_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
    const old = await admin.from("payment_scans").select("id, image_path").lt("scanned_at", cutoff).limit(500);
    if (old.error) {
      if (!["42P01", "PGRST205"].includes(old.error.code ?? "")) console.error("cron/sync-sales: scan purge", old.error.message);
    } else if (old.data && old.data.length > 0) {
      const removed = await admin.storage.from(PAYMENT_SCAN_BUCKET).remove(old.data.map((r) => r.image_path));
      if (removed.error) console.error("cron/sync-sales: scan files", removed.error.message);
      else await admin.from("payment_scans").delete().in("id", old.data.map((r) => r.id));
    }
  } catch (e) {
    console.error("cron/sync-sales: scan purge failed", e);
  }

  // Least recently synced first, so no account is always left for last.
  const { data: connections, error } = await admin
    .from("pos_connections")
    .select("user_id")
    .eq("provider", "loyverse")
    .order("last_synced_at", { ascending: true, nullsFirst: true });
  if (error) {
    console.error("cron/sync-sales: list connections failed", error.message);
    return Response.json({ error: "list failed" }, { status: 500 });
  }

  const results = { accounts: connections.length, synced: 0, incomplete: 0, failed: 0, skipped: 0, imported: 0 };
  for (const { user_id: ownerId } of connections) {
    if (Date.now() > deadline) {
      results.skipped++;
      continue;
    }
    // Free accounts store no receipts (paid feature): leave them out.
    if (await isFreeBusiness(admin, ownerId)) {
      results.skipped++;
      continue;
    }
    try {
      const r = await syncLoyverseAccount(admin, ownerId, deadline);
      results.imported += r.imported;
      if (r.complete) results.synced++;
      else results.incomplete++;
    } catch (err) {
      // One account failing (e.g. a revoked token) never stops the others. Never log the token.
      results.failed++;
      const reason =
        err instanceof SyncError
          ? err.reason
          : err instanceof LoyverseError
            ? `Loyverse ${err.status}`
            : err instanceof Error
              ? err.message
              : "unknown";
      console.error(`cron/sync-sales: account ${ownerId.slice(0, 8)} failed: ${reason}`);
    }
  }

  console.log("cron/sync-sales:", JSON.stringify(results));
  return Response.json(results);
}
