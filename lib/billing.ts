import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanId, monthStartBangkok, nextMonthStartBangkok, PLANS, type Plan, type PlanId } from "./plans";

// Reads the business's plan and how much of this month's scan quota it has used. Works with the
// browser client and with a server client acting as the signed-in user: Row Level Security keeps
// both to their own business. No "server-only" so the settings pages can use it too.

export type PlanUsage = {
  plan: Plan;
  scansUsed: number;
  /** Scans still available this month (never negative). */
  scansLeft: number;
  resetsAt: Date;
  /** True when the plans table couldn't be read (migration not run yet): nothing is blocked then. */
  degraded: boolean;
};

export async function fetchPlanUsage(client: SupabaseClient): Promise<PlanUsage> {
  const since = monthStartBangkok();

  const [planRes, scansRes] = await Promise.all([
    client.from("business_plans").select("plan").maybeSingle(),
    client.from("invoice_scans").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
  ]);

  let planId: PlanId = "free";
  let degraded = false;
  if (planRes.error) {
    // Most likely 18_plans_and_quotas.sql hasn't been run yet. Don't lock everyone out of the product.
    console.error("billing: couldn't read business_plans", planRes.error.message);
    planId = "empire";
    degraded = true;
  } else if (isPlanId(planRes.data?.plan)) {
    planId = planRes.data.plan;
  }

  if (scansRes.error) {
    console.error("billing: couldn't count scans", scansRes.error.message);
    degraded = true;
  }

  const plan = PLANS[planId];
  const scansUsed = scansRes.count ?? 0;
  return {
    plan,
    scansUsed,
    scansLeft: Math.max(0, plan.scansPerMonth - scansUsed),
    resetsAt: nextMonthStartBangkok(),
    degraded,
  };
}
