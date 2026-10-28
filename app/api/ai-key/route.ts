import Anthropic from "@anthropic-ai/sdk";
import { encryptToken, hasEncryptionKey } from "../../../lib/posCrypto";
import { jsonError, requireOwner } from "../../../lib/posServer";

// The owner's own Anthropic API key ("bring your own AI"). The key is checked with Anthropic, then stored
// encrypted. It never goes back to the browser: GET only says whether one is saved and its last 4 characters.

const KEY_RE = /^sk-ant-[A-Za-z0-9_\-]{20,300}$/;

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;
  const { ownerId, admin } = auth;

  const { data, error } = await admin.from("business_ai_keys").select("last4, created_at").eq("user_id", ownerId).maybeSingle();
  if (error) {
    if (error.code === "42P01") return Response.json({ saved: false, setUp: false });
    console.error("ai-key: read failed", error.message);
    return jsonError("We couldn't check your AI key. Please try again.", 500);
  }
  return Response.json({ saved: !!data, last4: data?.last4 ?? null, savedAt: data?.created_at ?? null, setUp: true });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;
  const { ownerId, admin } = auth;

  if (!hasEncryptionKey()) {
    console.error("ai-key: POS_ENCRYPTION_KEY is missing or invalid");
    return jsonError("Saving an AI key isn't set up yet.", 500);
  }

  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!KEY_RE.test(key)) {
    return jsonError("This doesn't look like an Anthropic API key. It starts with sk-ant- and has no spaces.", 400);
  }

  // Ask Anthropic if the key works (listing models costs nothing).
  try {
    await new Anthropic({ apiKey: key, maxRetries: 0 }).models.list({ limit: 1 });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return jsonError("Anthropic refused this key. Check that you copied all of it and that it is still active.", 400);
    }
    console.error("ai-key: key check failed", error instanceof Anthropic.APIError ? error.status : error);
    return jsonError("We couldn't reach Anthropic to check the key. Please try again in a moment.", 502);
  }

  const { error } = await admin.from("business_ai_keys").upsert(
    { user_id: ownerId, key_encrypted: encryptToken(key, ownerId), last4: key.slice(-4), created_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("ai-key: save failed", error.message);
    return jsonError("We couldn't save the key. Please try again.", 500);
  }
  return Response.json({ saved: true, last4: key.slice(-4) });
}

export async function DELETE(request: Request) {
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;
  const { ownerId, admin } = auth;

  const { error } = await admin.from("business_ai_keys").delete().eq("user_id", ownerId);
  if (error) {
    console.error("ai-key: delete failed", error.message);
    return jsonError("We couldn't remove the key. Please try again.", 500);
  }
  return new Response(null, { status: 204 });
}
