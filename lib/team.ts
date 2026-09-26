import { supabase } from "./supabase";

export type TeamRole = "manager" | "employee";

export type TeamMember = {
  id: string;
  email: string;
  role: TeamRole;
  status: "pending" | "active";
  invitedAt: string;
  acceptedAt: string | null;
};

type RawMember = {
  id: string;
  invited_email: string;
  role: TeamRole;
  status: "pending" | "active";
  invited_at: string;
  accepted_at: string | null;
};

const MEMBER_SELECT = "id, invited_email, role, status, invited_at, accepted_at";

const toMember = (r: RawMember): TeamMember => ({
  id: r.id,
  email: r.invited_email,
  role: r.role,
  status: r.status,
  invitedAt: r.invited_at,
  acceptedAt: r.accepted_at,
});

/** The owner's team, oldest invitation first. */
export async function fetchTeam(ownerId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select(MEMBER_SELECT)
    .eq("user_id", ownerId)
    .order("invited_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawMember[]).map(toMember);
}

/** The signed-in user's own membership of someone else's business, if they have one. */
export async function fetchMyMembership(userId: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from("team_members")
    .select(MEMBER_SELECT)
    .eq("member_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toMember(data as RawMember) : null;
}

/** Records the invitation and sends the email (server side, see app/api/team/invite). */
export async function inviteTeamMember(email: string, role: TeamRole): Promise<TeamMember> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/team/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ email, role }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "We couldn't send the invitation. Please try again.");
  return toMember(body as RawMember);
}

/** Cancels a pending invitation, or removes a member's access to the business straight away. */
export async function removeTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

/** Links the signed-in (invited) user to the business that invited their email. Null if there was no invitation. */
export async function acceptTeamInvite(): Promise<TeamMember | null> {
  const { data, error } = await supabase.rpc("accept_team_invite");
  if (error) throw error;
  // A composite return type comes back as an object whose fields are all null when nothing matched.
  const row = data as RawMember | null;
  return row?.id ? toMember(row) : null;
}
