import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Server-only: sending an invite email needs the service role key. Never expose it to the browser.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROLES = ["manager", "employee"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!SERVICE_ROLE_KEY) {
    console.error("team/invite: SUPABASE_SERVICE_ROLE_KEY is not set");
    return jsonError("Team invitations aren't set up yet.", 500);
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in to invite your team.", 401);

  // Acts as the owner, so Row Level Security still decides what they may do.
  const asOwner = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await asOwner.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);
  const owner = auth.user;

  let body: { email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = ROLES.find((r) => r === body.role);
  if (!EMAIL_RE.test(email)) return jsonError("Please enter a valid email address.", 400);
  if (!role) return jsonError("Please choose Manager or Employee.", 400);
  if (email === owner.email?.toLowerCase()) return jsonError("You're already the owner of this business.", 400);

  // Only owners invite: for a team member this returns the owner's id, not their own.
  const { data: businessId, error: businessError } = await asOwner.rpc("current_business_id");
  if (businessError) {
    console.error("team/invite: current_business_id failed", businessError.message);
    return jsonError("Team invitations aren't set up yet.", 500);
  }
  if (businessId !== owner.id) return jsonError("Only the business owner can invite team members.", 403);

  const { data: invite, error: insertError } = await asOwner
    .from("team_members")
    .insert({ user_id: owner.id, invited_email: email, role })
    .select("id, invited_email, role, status, invited_at")
    .single();
  if (insertError) {
    // unique invited_email: already invited here or by another business
    if (insertError.code === "23505") return jsonError(`${email} has already been invited to a SabaiBiz team.`, 409);
    console.error("team/invite: insert failed", insertError.message);
    return jsonError("We couldn't save this invitation. Please try again.", 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${new URL(request.url).origin}/accept-invite`,
    // Shown in the app (navbar) once they join. Not used for access: the team_members row is.
    data: { business_name: owner.user_metadata?.business_name ?? null },
  });
  if (inviteError) {
    // Don't keep an invitation that was never sent.
    await asOwner.from("team_members").delete().eq("id", invite.id);
    if (inviteError.code === "email_exists") {
      return jsonError(
        `${email} already has a SabaiBiz account. For now, team members need to be invited with a new email address.`,
        409,
      );
    }
    if (inviteError.status === 429) {
      return jsonError("Too many emails sent. Please wait a little and try again.", 429);
    }
    console.error("team/invite: inviteUserByEmail failed", inviteError.code, inviteError.message);
    return jsonError("We couldn't send the invitation email. Please try again.", 502);
  }

  return Response.json(invite, { status: 201 });
}
