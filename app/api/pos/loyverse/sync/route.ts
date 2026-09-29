import { LoyverseError } from "../../../../../lib/loyverse";
import { SyncError, syncLoyverseAccount } from "../../../../../lib/loyverseSync";
import { jsonError, requireOwner } from "../../../../../lib/posServer";

// The first sync can fetch 90 days of receipts.
export const maxDuration = 300;

// Stop starting new weeks after this, well before maxDuration.
const TIME_BUDGET_MS = 240 * 1000;

// "Sync sales now": imports the owner's new Loyverse receipts. Returns how many new receipts were added.
export async function POST(request: Request) {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;
  const { ownerId, admin } = auth;

  try {
    return Response.json(await syncLoyverseAccount(admin, ownerId, deadline));
  } catch (error) {
    if (error instanceof SyncError) {
      if (error.reason === "not_connected") return jsonError("Loyverse isn't connected yet.", 404);
      console.error("pos/loyverse/sync: token could not be decrypted (POS_ENCRYPTION_KEY changed?)");
      return jsonError("Please disconnect Loyverse and connect it again.", 500);
    }
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
