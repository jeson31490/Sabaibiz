import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { fetchPlanUsage } from "../../../../lib/billing";
import { linkOrigin } from "../../../../lib/site";
import { STAFF_DOMAIN } from "../../../../lib/staff";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LINK_DAYS = 7;

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Owner only. Two uses:
 *  - { name, role, canScan }  creates a person (no e-mail) and a one-time link for them;
 *  - { memberId }             makes a new link for someone: a pending person whose link expired, or an active
 *                             person who forgot their code (the new link lets them choose a new code).
 */
export async function POST(request: Request) {
  if (!SERVICE_ROLE_KEY) return jsonError("Team invitations aren't set up yet.", 500);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in to invite your team.", 401);

  const asOwner = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await asOwner.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);
  const owner = auth.user;

  let body: { name?: unknown; role?: unknown; canScan?: unknown; memberId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }

  const { data: businessId, error: businessError } = await asOwner.rpc("current_business_id");
  if (businessError) return jsonError("Team invitations aren't set up yet.", 500);
  if (businessId !== owner.id) return jsonError("Only the business owner can invite team members.", 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  let memberId: string;
  let label: string;
  let created: { id: string; invited_email: string; role: string; status: string; invited_at: string } | null = null;

  if (body.memberId !== undefined) {
    if (typeof body.memberId !== "string" || !UUID_RE.test(body.memberId)) return jsonError("Unknown person.", 400);
    // Read as the owner: only their own team comes back.
    const { data: m } = await asOwner.from("team_members").select("id").eq("id", body.memberId).maybeSingle();
    if (!m) return jsonError("This person no longer exists.", 404);
    memberId = m.id;
    const { data: prev } = await admin
      .from("team_invite_links")
      .select("label")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    label = prev?.label ?? "Staff member";
  } else {
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 1 || name.length > 60) return jsonError("Please enter the person's name (60 characters at most).", 400);
    if (body.role !== "manager" && body.role !== "employee") return jsonError("Please choose Manager or Employee.", 400);
    const role = body.role;
    const canScan = role === "manager" || body.canScan !== false;

    // Same plan rules as e-mail invitations.
    const { plan } = await fetchPlanUsage(asOwner);
    if (plan.id === "free") return jsonError("Inviting your team is part of the paid plans. Upgrade to add your people.", 402);
    const { data: roles, error: countError } = await asOwner.from("team_members").select("role").eq("user_id", owner.id);
    if (countError) return jsonError("We couldn't check your team size. Please try again.", 500);
    const managers = (roles ?? []).filter((r) => r.role === "manager").length;
    const employees = (roles ?? []).filter((r) => r.role === "employee").length;
    if (role === "manager" && plan.managerSeats !== null && managers >= plan.managerSeats) {
      return jsonError(plan.managerSeats === 0 ? `The ${plan.name} plan doesn't include manager accounts.` : `Your ${plan.name} plan includes ${plan.managerSeats} manager account(s). Upgrade to add more.`, 402);
    }
    if (role === "employee" && employees >= plan.employeeCap) {
      return jsonError(`Your ${plan.name} plan includes up to ${plan.employeeCap} employees. Remove someone or upgrade to add more.`, 402);
    }

    const { data: row, error: insertError } = await asOwner
      .from("team_members")
      .insert({ user_id: owner.id, invited_email: `pending-${randomUUID()}@${STAFF_DOMAIN}`, role, ...(canScan ? {} : { can_scan: false }) })
      .select("id, invited_email, role, status, invited_at")
      .single();
    if (insertError || !row) {
      console.error("team/invite-link: insert failed", insertError?.message);
      return jsonError("We couldn't save this invitation. Please try again.", 500);
    }
    created = row;
    memberId = row.id;
    label = name;
  }

  // One live link per person: the old unused ones stop working.
  await admin.from("team_invite_links").delete().eq("member_id", memberId).is("used_at", null);

  const raw = randomBytes(32).toString("base64url");
  const { error: linkError } = await admin.from("team_invite_links").insert({
    member_id: memberId,
    token_hash: hashToken(raw),
    label,
    expires_at: new Date(Date.now() + LINK_DAYS * 86400_000).toISOString(),
  });
  if (linkError) {
    console.error("team/invite-link: link insert failed", linkError.message);
    // Don't leave a person nobody can join as.
    if (created) await asOwner.from("team_members").delete().eq("id", created.id);
    return jsonError("We couldn't create the link. Is supabase/29_staff_invite_links.sql applied?", 500);
  }

  // The token travels in the URL fragment (#): it never reaches server logs or other sites through the Referer header.
  return Response.json({ memberId, label, link: `${linkOrigin(request)}/join#${raw}`, expiresInDays: LINK_DAYS, member: created }, { status: created ? 201 : 200 });
}
