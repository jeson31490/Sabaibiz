import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Server-only: pos_connections, sales and sale_items are written with the secret key.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Checks the request comes from a signed-in business owner (not a team member), like
 * app/api/team/invite. Returns the owner's id and an admin client, or an error Response.
 */
export async function requireOwner(
  request: Request,
): Promise<{ ownerId: string; admin: SupabaseClient } | Response> {
  if (!SERVICE_ROLE_KEY) {
    console.error("pos: SUPABASE_SERVICE_ROLE_KEY is not set");
    return jsonError("POS connections aren't set up yet.", 500);
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in first.", 401);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await asUser.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);

  // For a team member this returns the owner's id, not their own.
  const { data: businessId, error: businessError } = await asUser.rpc("current_business_id");
  if (businessError) {
    console.error("pos: current_business_id failed", businessError.message);
    return jsonError("POS connections aren't set up yet.", 500);
  }
  if (businessId !== auth.user.id) return jsonError("Only the business owner can manage the POS connection.", 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { ownerId: auth.user.id, admin };
}
