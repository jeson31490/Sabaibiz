import { createClient } from "@supabase/supabase-js";
import { createAdminClient, jsonError } from "../../../../lib/posServer";
import { AVATAR_BUCKET } from "../../../../lib/avatar";

// The people of the business with their name and photo, for the Team page. Owner and managers only.
// Names and photos live in each person's account, which only the server may read.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type TeamPerson = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "employee";
  avatarUrl: string | null;
};

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in first.", 401);
  const admin = createAdminClient();
  if (!admin) return jsonError("The team isn't set up yet.", 500);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await asUser.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);

  const { data: isManager } = await asUser.rpc("is_business_manager");
  if (isManager !== true) return jsonError("Only the owner and managers can see the team.", 403);
  const { data: businessId } = await asUser.rpc("current_business_id");
  if (typeof businessId !== "string") return jsonError("We couldn't find your business.", 500);

  // Row Level Security lets the signed-in user read their business's team rows.
  const { data: members, error } = await asUser
    .from("team_members")
    .select("invited_email, role, status, member_user_id")
    .eq("user_id", businessId);
  if (error) {
    console.error("team/people: read failed", error.message);
    return jsonError("We couldn't load your team.", 500);
  }

  const wanted: { id: string; role: TeamPerson["role"]; fallbackEmail: string }[] = [
    { id: businessId, role: "owner", fallbackEmail: "" },
    ...(members ?? [])
      .filter((m) => m.status === "active" && m.member_user_id)
      .map((m) => ({ id: m.member_user_id as string, role: m.role as TeamPerson["role"], fallbackEmail: m.invited_email as string })),
  ];

  const people = await Promise.all(
    wanted.map(async ({ id, role, fallbackEmail }): Promise<TeamPerson> => {
      const { data } = await admin.auth.admin.getUserById(id);
      const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      const email = data.user?.email ?? fallbackEmail;
      const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
      const version = meta.avatar_version;
      const avatarUrl = version
        ? `${admin.storage.from(AVATAR_BUCKET).getPublicUrl(id).data.publicUrl}?v=${String(version)}`
        : null;
      return { userId: id, name: fullName || email.split("@")[0] || "Team member", email, role, avatarUrl };
    }),
  );
  return Response.json({ people });
}
