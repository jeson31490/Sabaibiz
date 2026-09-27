import { fetchMerchant, LoyverseError } from "../../../../../lib/loyverse";
import { encryptToken, hasEncryptionKey } from "../../../../../lib/posCrypto";
import { jsonError, requireOwner } from "../../../../../lib/posServer";

// Checks a Loyverse access token, then stores it encrypted. The token never goes back to the browser.
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;
  const { ownerId, admin } = auth;

  if (!hasEncryptionKey()) {
    console.error("pos/loyverse/connect: POS_ENCRYPTION_KEY is missing or invalid");
    return jsonError("POS connections aren't set up yet.", 500);
  }

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token.length < 10 || token.length > 500 || /\s/.test(token)) {
    return jsonError("Please paste your Loyverse access token.", 400);
  }

  let merchantName: string | null;
  try {
    const merchant = await fetchMerchant(token);
    merchantName = merchant.business_name?.trim() || merchant.name?.trim() || null;
  } catch (error) {
    if (error instanceof LoyverseError && (error.status === 401 || error.status === 403)) {
      return jsonError("Invalid Loyverse key. Check that you copied the whole access token.", 400);
    }
    console.error("pos/loyverse/connect: merchant check failed", error instanceof LoyverseError ? error.status : error);
    return jsonError("We couldn't reach Loyverse. Please try again in a moment.", 502);
  }

  const { error } = await admin.from("pos_connections").upsert(
    {
      user_id: ownerId,
      provider: "loyverse",
      access_token_encrypted: encryptToken(token, ownerId),
      merchant_name: merchantName,
      // A new token may be for another Loyverse account: the next sync starts over (duplicates are impossible).
      last_synced_at: null,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) {
    console.error("pos/loyverse/connect: save failed", error.message);
    return jsonError("We couldn't save the connection. Please try again.", 500);
  }

  return Response.json({ provider: "loyverse", merchantName, lastSyncedAt: null });
}

// Disconnects Loyverse: deletes the stored token. Sales already imported are kept.
export async function DELETE(request: Request) {
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;
  const { ownerId, admin } = auth;

  const { error } = await admin
    .from("pos_connections")
    .delete()
    .eq("user_id", ownerId)
    .eq("provider", "loyverse");
  if (error) {
    console.error("pos/loyverse/connect: delete failed", error.message);
    return jsonError("We couldn't disconnect Loyverse. Please try again.", 500);
  }
  return new Response(null, { status: 204 });
}
