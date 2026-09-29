import { timingSafeEqual } from "node:crypto";
import { LoyverseError } from "../../../../lib/loyverse";
import { SyncError, syncLoyverseAccount } from "../../../../lib/loyverseSync";
import { createAdminClient } from "../../../../lib/posServer";

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
