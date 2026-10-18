import { supabase } from "./supabase";
import { fetchBusinessId, fetchVisibleTeam } from "./team";

/**
 * user id -> what to call that person on screen: their invitation e-mail for team members,
 * "You (owner)" / "Owner" for the owner. People who were removed since aren't in the map.
 */
export async function fetchTeamNames(): Promise<Map<string, string>> {
  const { data } = await supabase.auth.getSession();
  const me = data.session?.user;
  if (!me) throw new Error("Please sign in again.");

  const [team, businessId] = await Promise.all([fetchVisibleTeam(), fetchBusinessId()]);
  const names = new Map<string, string>();
  for (const m of team) if (m.memberUserId) names.set(m.memberUserId, m.email);
  // The owner has no team row: they are the business id.
  if (!names.has(businessId)) names.set(businessId, businessId === me.id ? "You (owner)" : "Owner");
  return names;
}
