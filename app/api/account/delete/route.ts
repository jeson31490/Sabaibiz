import { createClient } from "@supabase/supabase-js";
import { purgeAccount } from "../../../../lib/accountPurge";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM = "DELETE";

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

/** True when the (already verified) access token comes from a password sign-in made in the last 5 minutes. */
function signedInWithPasswordRecently(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as {
      amr?: { method?: string; timestamp?: number }[];
    };
    const at = payload.amr?.find((a) => a.method === "password")?.timestamp;
    return typeof at === "number" && Date.now() / 1000 - at < 300;
  } catch {
    return false;
  }
}

/**
 * Deletes the signed-in person's account (required by the App Store and Google Play).
 * - A team member: their access and login go.
 * - An owner: the whole business goes (invoices, sales, team, payroll, photos). The database rows follow the
 *   login through "on delete cascade"; the stored photos are removed here first.
 * The caller must type DELETE to confirm.
 */
export async function POST(request: Request) {
  if (!SERVICE_ROLE_KEY) return jsonError("Account deletion isn't set up yet.", 500);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in.", 401);

  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== CONFIRM) return jsonError(`Type ${CONFIRM} to confirm.`, 400);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await asUser.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);
  const user = auth.user;

  // The password must have been typed in the last 5 minutes (the page signs in again just before calling us).
  if (!signedInWithPasswordRecently(token)) return jsonError("Please enter your password to confirm.", 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // Is this login someone's team member? Then it is not a business owner.
  const { data: membership } = await admin.from("team_members").select("id").eq("member_user_id", user.id).maybeSingle();

  const ok = await purgeAccount(admin, user.id, Boolean(membership));
  if (!ok) return jsonError("We couldn't delete your account. Please contact support@sabaibiz.com.", 500);
  return Response.json({ ok: true, role: membership ? "member" : "owner" });
}
