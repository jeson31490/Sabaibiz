import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

/**
 * Removes a person from the owner's team and deletes their login too, so the same address can be invited
 * again from scratch. The login is only deleted when it holds nothing of its own (no invoices, suppliers or team).
 */
export async function POST(request: Request) {
  if (!SERVICE_ROLE_KEY) return jsonError("Team management isn't set up yet.", 500);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in.", 401);

  const asOwner = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await asOwner.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);
  const owner = auth.user;

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !UUID_RE.test(body.id)) return jsonError("Unknown team member.", 400);

  // Read as the owner: only their own team's rows come back.
  const { data: row, error } = await asOwner
    .from("team_members")
    .select("id, invited_email, member_user_id")
    .eq("id", body.id)
    .maybeSingle();
  if (error) return jsonError("We couldn't find this person.", 500);
  if (!row) return jsonError("This person is no longer on your team.", 404);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Their access goes first.
  const { error: deleteError } = await asOwner.from("team_members").delete().eq("id", row.id);
  if (deleteError) return jsonError("We couldn't remove this person. Please try again.", 500);

  // Then the login, if there is one and it is empty.
  let accountDeleted = false;
  let memberId: string | null = row.member_user_id;
  if (!memberId) {
    for (let page = 1; page <= 10 && !memberId; page++) {
      const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listError) break;
      memberId = data.users.find((u) => u.email?.toLowerCase() === row.invited_email.toLowerCase())?.id ?? null;
      if (data.users.length < 1000) break;
    }
  }
  if (memberId && memberId !== owner.id) {
    const count = async (table: string) => {
      const { count: n } = await admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", memberId!);
      return n ?? 0;
    };
    const owned = await Promise.all([count("invoices"), count("suppliers"), count("team_members")]);
    if (owned.every((n) => n === 0)) {
      const { error: userError } = await admin.auth.admin.deleteUser(memberId);
      accountDeleted = !userError;
    }
  }
  return Response.json({ removed: true, accountDeleted });
}
