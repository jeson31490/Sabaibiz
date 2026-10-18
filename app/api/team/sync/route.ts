import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Links a signed-in person to the business that invited their e-mail address.
 * Runs with the service role so it does not depend on Row Level Security or on which link the person used
 * (invitation e-mail, "Forgot password", ...). The owner's invitation is the permission.
 * Returns { membership: { role, canScan } } or { membership: null }.
 */
export async function POST(request: Request) {
  const none = Response.json({ membership: null });
  if (!SERVICE_ROLE_KEY) return none;

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Please sign in." }, { status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await anon.auth.getUser(token);
  if (authError || !auth.user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const user = auth.user;
  if (!user.email || !user.email_confirmed_at) return none;

  const { data: row, error } = await admin
    .from("team_members")
    .select("id, user_id, role, status, member_user_id, can_scan, accepted_at")
    .ilike("invited_email", user.email)
    .maybeSingle();
  if (error) {
    console.error("team/sync: lookup failed", error.message);
    return none;
  }
  if (!row || row.user_id === user.id) return none;

  // Already someone else's seat: leave it alone.
  if (row.member_user_id && row.member_user_id !== user.id) return none;

  if (row.status !== "active" || row.member_user_id !== user.id) {
    const { error: updateError } = await admin
      .from("team_members")
      .update({ member_user_id: user.id, status: "active", accepted_at: row.accepted_at ?? new Date().toISOString() })
      .eq("id", row.id);
    if (updateError) {
      console.error("team/sync: link failed", updateError.message);
      return none;
    }
  }

  return Response.json({
    membership: { role: row.role, canScan: row.role === "manager" || row.can_scan !== false },
  });
}
