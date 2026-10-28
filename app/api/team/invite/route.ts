import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchPlanUsage } from "../../../../lib/billing";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Server-only: sending an invite email needs the service role key. Never expose it to the browser.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROLES = ["manager", "employee"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type Delivery = { ok: true } | { ok: false; status: number; message: string };

/** The auth user with this e-mail address, if there is one. Admin API: it has no lookup by e-mail. */
async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  // 1000 per page, up to 10 pages: far more users than SabaiBiz has today.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** True when this account already runs its own business: it has invoices, suppliers or a team of its own. */
async function runsOwnBusiness(admin: SupabaseClient, userId: string): Promise<boolean> {
  const count = async (table: string) => {
    const { count: n } = await admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    return n ?? 0;
  };
  const counts = await Promise.all([count("invoices"), count("suppliers"), count("team_members")]);
  return counts.some((n) => n > 0);
}

/**
 * Gets the invitation e-mail to this address.
 * - New address: Supabase's invitation e-mail.
 * - Someone who hasn't finished joining yet: the same call sends it again.
 * - An address that already has an account (for example someone removed from a team earlier): Supabase refuses
 *   to "invite" it, so it gets a sign-in link that lands on the same "Join your team" page. That is only done
 *   when the account has no business of its own, because joining another business hides the account's own data.
 */
async function deliverInvite(
  admin: SupabaseClient,
  email: string,
  origin: string,
  businessName: string | null,
): Promise<Delivery> {
  const redirectTo = `${origin}/accept-invite`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    // Shown in the app (navbar) once they join. Not used for access: the team_members row is.
    data: { business_name: businessName },
  });
  if (!error) return { ok: true };

  if (error.status === 429) {
    return { ok: false, status: 429, message: "Too many emails sent. Please wait a little and try again." };
  }
  if (error.code !== "email_exists") {
    console.error("team/invite: inviteUserByEmail failed", error.code, error.message);
    return { ok: false, status: 502, message: "We couldn't send the invitation email. Please try again." };
  }

  // The address already has an account.
  const existingId = await findUserIdByEmail(admin, email);
  if (!existingId) {
    console.error("team/invite: email_exists but no matching user found");
    return { ok: false, status: 502, message: "We couldn't send the invitation email. Please try again." };
  }
  if (await runsOwnBusiness(admin, existingId)) {
    return {
      ok: false,
      status: 409,
      message: `${email} already runs its own SabaiBiz business. Joining yours would hide that one, so please invite a different email address.`,
    };
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: resetError } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
  if (resetError) {
    if (resetError.status === 429) {
      return { ok: false, status: 429, message: "Too many emails sent. Please wait a little and try again." };
    }
    console.error("team/invite: sign-in link failed", resetError.code, resetError.message);
    return { ok: false, status: 502, message: "We couldn't send the invitation email. Please try again." };
  }
  return { ok: true };
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

  let body: { email?: unknown; role?: unknown; canScan?: unknown; resendId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }

  // Only owners invite: for a team member this returns the owner's id, not their own.
  const { data: businessId, error: businessError } = await asOwner.rpc("current_business_id");
  if (businessError) {
    console.error("team/invite: current_business_id failed", businessError.message);
    return jsonError("Team invitations aren't set up yet.", 500);
  }
  if (businessId !== owner.id) return jsonError("Only the business owner can invite team members.", 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const origin = new URL(request.url).origin;
  const businessName: string | null = owner.user_metadata?.business_name ?? null;

  // Send the e-mail again for someone who hasn't joined yet (the link expired, or it got lost).
  if (body.resendId !== undefined) {
    if (typeof body.resendId !== "string" || !UUID_RE.test(body.resendId)) return jsonError("Unknown invitation.", 400);
    // Read as the owner: only their own team's rows come back.
    const { data: pending, error: pendingError } = await asOwner
      .from("team_members")
      .select("id, invited_email, status")
      .eq("id", body.resendId)
      .maybeSingle();
    if (pendingError) {
      console.error("team/invite: read failed", pendingError.message);
      return jsonError("We couldn't find this invitation.", 500);
    }
    if (!pending) return jsonError("This invitation no longer exists.", 404);
    if (pending.status !== "pending") return jsonError("This person has already joined.", 409);

    const sent = await deliverInvite(admin, pending.invited_email, origin, businessName);
    if (!sent.ok) return jsonError(sent.message, sent.status);
    return Response.json({ id: pending.id, email: pending.invited_email }, { status: 200 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = ROLES.find((r) => r === body.role);
  if (!EMAIL_RE.test(email)) return jsonError("Please enter a valid email address.", 400);
  if (!role) return jsonError("Please choose Manager or Employee.", 400);
  if (email === owner.email?.toLowerCase()) return jsonError("You're already the owner of this business.", 400);
  // Managers always scan; for an employee the owner decides (default: allowed).
  const canScan = role === "manager" || body.canScan !== false;

  // The plan decides how many managers and how many employees the owner can have (pending invitations count).
  // Employees are free (they are not paid seats) but capped per plan; invitations need a paid plan.
  const { plan } = await fetchPlanUsage(asOwner);
  if (plan.id === "free") {
    return jsonError("Inviting your team is part of the paid plans. Upgrade to add your people.", 402);
  }
  const { data: roles, error: countError } = await asOwner.from("team_members").select("role").eq("user_id", owner.id);
  if (countError) {
    console.error("team/invite: couldn't count team members", countError.message);
    return jsonError("We couldn't check your team size. Please try again.", 500);
  }
  const managers = (roles ?? []).filter((r) => r.role === "manager").length;
  const employees = (roles ?? []).filter((r) => r.role === "employee").length;
  if (role === "manager" && plan.managerSeats !== null && managers >= plan.managerSeats) {
    return jsonError(
      plan.managerSeats === 0
        ? `The ${plan.name} plan doesn't include manager accounts. Upgrade to Team to add managers.`
        : `Your ${plan.name} plan includes ${plan.managerSeats} manager ${plan.managerSeats === 1 ? "account" : "accounts"}. Upgrade your plan to add more.`,
      402,
    );
  }
  if (role === "employee" && employees >= plan.employeeCap) {
    return jsonError(
      `Your ${plan.name} plan includes up to ${plan.employeeCap} employees (free, they don't count as paid seats). Remove someone or upgrade your plan to add more.`,
      402,
    );
  }

  const { data: invite, error: insertError } = await asOwner
    .from("team_members")
    // can_scan is only sent when it differs from the column default, so inviting still works
    // before 18_team_permissions_attendance.sql has been run.
    .insert({ user_id: owner.id, invited_email: email, role, ...(canScan ? {} : { can_scan: false }) })
    .select("id, invited_email, role, status, invited_at")
    .single();
  if (insertError) {
    // unique invited_email: already invited here or by another business
    if (insertError.code === "23505") return jsonError(`${email} has already been invited to a SabaiBiz team.`, 409);
    console.error("team/invite: insert failed", insertError.message);
    return jsonError("We couldn't save this invitation. Please try again.", 500);
  }

  const sent = await deliverInvite(admin, email, origin, businessName);
  if (!sent.ok) {
    // Don't keep an invitation that was never sent.
    await asOwner.from("team_members").delete().eq("id", invite.id);
    return jsonError(sent.message, sent.status);
  }

  return Response.json({ ...invite, member_user_id: null, can_scan: canScan }, { status: 201 });
}
