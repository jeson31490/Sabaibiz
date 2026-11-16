import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { codeProblem, normalizePhone, staffEmail, staffPassword } from "../../../../lib/staff";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });
const GONE = "This link is no longer valid. Ask your manager for a new one.";

/** Public: the one-time link is the credential. Sets (or resets) the phone number + code of a staff member. */
export async function POST(request: Request) {
  if (!SERVICE_ROLE_KEY) return jsonError("Joining isn't set up yet.", 500);
  let body: { token?: unknown; phone?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }
  const rawToken = typeof body.token === "string" ? body.token : "";
  if (rawToken.length < 30 || rawToken.length > 100) return jsonError(GONE, 410);
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  if (!phone) return jsonError("Please enter a valid phone number.", 400);
  const code = typeof body.code === "string" ? body.code : "";
  const problem = codeProblem(code);
  if (problem) return jsonError(problem, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // Claim the link first: two simultaneous requests can never both use it.
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const { data: link } = await admin
    .from("team_invite_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, member_id, label")
    .maybeSingle();
  if (!link) return jsonError(GONE, 410);
  const release = () => admin.from("team_invite_links").update({ used_at: null }).eq("id", link.id);

  const fail = async (message: string, status: number) => {
    await release(); // a typo or a taken number shouldn't burn the link
    return jsonError(message, status);
  };

  const { data: member } = await admin
    .from("team_members")
    .select("id, user_id, status, member_user_id")
    .eq("id", link.member_id)
    .maybeSingle();
  if (!member) return jsonError(GONE, 410);

  const email = staffEmail(phone);
  const password = staffPassword(phone, code);

  if (member.status === "pending") {
    const { data: owner } = await admin.auth.admin.getUserById(member.user_id);
    const { data: made, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: link.label, business_name: owner?.user?.user_metadata?.business_name ?? null },
    });
    if (createError || !made.user) {
      if (createError?.code === "email_exists") return fail("This phone number already has an account. Ask your manager to reset it.", 409);
      console.error("team/join: createUser failed", createError?.code, createError?.message);
      return fail("We couldn't create your access. Please try again.", 502);
    }
    const { error: linkErr } = await admin
      .from("team_members")
      .update({ invited_email: email, member_user_id: made.user.id, status: "active", accepted_at: new Date().toISOString() })
      .eq("id", member.id)
      .eq("status", "pending");
    if (linkErr) {
      console.error("team/join: member update failed", linkErr.message);
      await admin.auth.admin.deleteUser(made.user.id); // don't leave an account that belongs to no team
      return fail("We couldn't finish joining. Please try again.", 502);
    }
  } else {
    // Reset: a person who forgot their code. The phone number must be the one they already use.
    if (!member.member_user_id) return jsonError(GONE, 410);
    const { data: existing } = await admin.auth.admin.getUserById(member.member_user_id);
    if (!existing?.user || existing.user.email?.toLowerCase() !== email) {
      return fail("That isn't the phone number registered for this account. Type it the same way as before.", 400);
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(member.member_user_id, { password });
    if (updateError) {
      console.error("team/join: password reset failed", updateError.message);
      return fail("We couldn't save your new code. Please try again.", 502);
    }
  }

  return Response.json({ ok: true });
}
