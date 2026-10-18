import { supabase } from "./supabase";

export type TeamRole = "manager" | "employee";

export type TeamMember = {
  id: string;
  email: string;
  role: TeamRole;
  status: "pending" | "active";
  invitedAt: string;
  acceptedAt: string | null;
  /** Set once the invitation is accepted: this person's own user id. */
  memberUserId: string | null;
  /** Whether this person may scan and see invoices. Always true for managers. */
  canScan: boolean;
};

type RawMember = {
  id: string;
  invited_email: string;
  role: TeamRole;
  status: "pending" | "active";
  invited_at: string;
  accepted_at: string | null;
  member_user_id?: string | null;
  can_scan?: boolean | null;
};

const BASE_SELECT = "id, invited_email, role, status, invited_at, accepted_at, member_user_id";
const MEMBER_SELECT = `${BASE_SELECT}, can_scan`;

// 42703: the can_scan column doesn't exist yet (18_team_permissions_attendance.sql not run).
// Fall back to the old columns so the app keeps working, and keeps knowing who is a member.
const isMissingColumn = (e: { code?: string } | null) => e?.code === "42703";

const toMember = (r: RawMember): TeamMember => ({
  id: r.id,
  email: r.invited_email,
  role: r.role,
  status: r.status,
  invitedAt: r.invited_at,
  acceptedAt: r.accepted_at,
  memberUserId: r.member_user_id ?? null,
  // Before 18_team_permissions_attendance.sql has been run there is no column: everyone could scan.
  canScan: r.can_scan ?? true,
});

/** The owner's team, oldest invitation first. */
export async function fetchTeam(ownerId: string): Promise<TeamMember[]> {
  const query = (columns: string) =>
    supabase.from("team_members").select(columns).eq("user_id", ownerId).order("invited_at", { ascending: true });
  let { data, error } = await query(MEMBER_SELECT);
  if (isMissingColumn(error)) ({ data, error } = await query(BASE_SELECT));
  if (error) throw error;
  return ((data ?? []) as unknown as RawMember[]).map(toMember);
}

/**
 * Everyone on the team that the signed-in user is allowed to see: the owner sees their whole team,
 * a manager sees the same team (read-only), an employee only their own row.
 */
export async function fetchVisibleTeam(): Promise<TeamMember[]> {
  const query = (columns: string) =>
    supabase.from("team_members").select(columns).order("invited_at", { ascending: true });
  let { data, error } = await query(MEMBER_SELECT);
  if (isMissingColumn(error)) ({ data, error } = await query(BASE_SELECT));
  if (error) throw error;
  return ((data ?? []) as unknown as RawMember[]).map(toMember);
}

/** The id of the business the signed-in user works in: the owner's own user id. */
export async function fetchBusinessId(): Promise<string> {
  const { data, error } = await supabase.rpc("current_business_id");
  if (error) throw error;
  return data as string;
}

/** The signed-in user's own membership of someone else's business, if they have one. */
export async function fetchMyMembership(userId: string): Promise<TeamMember | null> {
  const query = (columns: string) =>
    supabase.from("team_members").select(columns).eq("member_user_id", userId).maybeSingle();
  let { data, error } = await query(MEMBER_SELECT);
  if (isMissingColumn(error)) ({ data, error } = await query(BASE_SELECT));
  if (error) throw error;
  return data ? toMember(data as unknown as RawMember) : null;
}

/** Records the invitation and sends the email (server side, see app/api/team/invite). */
export async function inviteTeamMember(email: string, role: TeamRole, canScan = true): Promise<TeamMember> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/team/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ email, role, canScan }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "We couldn't send the invitation. Please try again.");
  return toMember(body as RawMember);
}

/** Sends the invitation e-mail again to someone who hasn't joined yet (the link expired or got lost). */
export async function resendTeamInvite(id: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/team/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ resendId: id }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "We couldn't send the invitation again. Please try again.");
  }
}

/** Cancels a pending invitation, or removes a member's access to the business straight away. */
export async function removeTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

/** Lets an employee scan and see invoices, or takes that away. Only the owner can change it. */
export async function setTeamMemberCanScan(id: string, canScan: boolean): Promise<void> {
  const { data, error } = await supabase.from("team_members").update({ can_scan: canScan }).eq("id", id).select("id");
  if (error) throw error;
  // Row Level Security filters out rows that aren't yours without an error.
  if (!data || data.length === 0) throw new Error("This permission could not be changed.");
}

/** Links the signed-in (invited) user to the business that invited their email. Null if there was no invitation. */
export async function acceptTeamInvite(): Promise<TeamMember | null> {
  const { data, error } = await supabase.rpc("accept_team_invite");
  if (error) throw error;
  // A composite return type comes back as an object whose fields are all null when nothing matched.
  const row = data as RawMember | null;
  return row?.id ? toMember(row) : null;
}

/**
 * Joins the business that invited this e-mail address, if there is a pending invitation and the account
 * has no business of its own yet (no invoices, suppliers or team). This covers people who set their
 * password through "Forgot password" instead of the invitation link: without it they would stay owners of
 * an empty business. Returns true when they just joined.
 */
export async function joinPendingInvite(userId: string): Promise<boolean> {
  const count = async (table: string) => {
    const { count: n, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw error;
    return n ?? 0;
  };
  const owned = await Promise.all([count("invoices"), count("suppliers"), count("team_members")]);
  if (owned.some((n) => n > 0)) return false;
  const joined = await acceptTeamInvite();
  return joined !== null;
}
