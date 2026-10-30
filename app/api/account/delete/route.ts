import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM = "DELETE";

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = ReturnType<typeof createClient<any>>;

/** Removes every file under a folder of a storage bucket (folders are listed level by level). */
async function emptyFolder(admin: Admin, bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 4) return;
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return;
  const files: string[] = [];
  for (const entry of data) {
    const path = `${prefix}/${entry.name}`;
    // Folders come back without an id.
    if (entry.id) files.push(path);
    else await emptyFolder(admin, bucket, path, depth + 1);
  }
  if (files.length > 0) await admin.storage.from(bucket).remove(files);
}

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

  if (!membership) {
    // Owner: files first (they are not covered by the database cascade), then the login.
    await emptyFolder(admin, "payment-scans", user.id);
  }
  await admin.storage.from("avatars").remove([user.id]);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return jsonError("We couldn't delete your account. Please contact support@sabaibiz.com.", 500);
  return Response.json({ ok: true, role: membership ? "member" : "owner" });
}
