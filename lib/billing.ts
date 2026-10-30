import type { SupabaseClient } from "@supabase/supabase-js";
import { monthStartBangkok, nextMonthStartBangkok, normalizePlanId, PLANS, type Plan, type PlanId } from "./plans";

// Reads the business's plan and how much of this month's scan quota it has used. Works with the
// browser client and with a server client acting as the signed-in user: Row Level Security keeps
// both to their own business. No "server-only" so the settings pages can use it too.

export type PlanUsage = {
  plan: Plan;
  /** Readings with Sabai's own AI used this month (readings with the business's own key are free and not counted). */
  scansUsed: number;
  /** Sabai AI scans still available this month (never negative). */
  scansLeft: number;
  /** True when the business has saved its own AI key: it can scan without limit, whatever its plan. */
  hasOwnKey: boolean;
  resetsAt: Date;
  /** True when the plans table couldn't be read (migration not run yet): nothing is blocked then. */
  degraded: boolean;
};

// 42703: a column doesn't exist yet. 42883 / PGRST202: a function doesn't exist yet.
// Both mean supabase/21_tracker_plan_and_ai_key.sql hasn't been run: the app keeps working without it.
const isNotSetUp = (e: { code?: string } | null) => ["42703", "42883", "PGRST202"].includes(e?.code ?? "");

export async function fetchPlanUsage(client: SupabaseClient): Promise<PlanUsage> {
  const since = monthStartBangkok();

  const countScans = (onlySabaiAi: boolean) => {
    const q = client.from("invoice_scans").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString());
    return onlySabaiAi ? q.eq("own_key", false) : q;
  };

  const [planRes, scansRes, keyRes] = await Promise.all([
    client.from("business_plans").select("plan").maybeSingle(),
    countScans(true),
    client.rpc("has_ai_key"),
  ]);

  let planId: PlanId = "free";
  let degraded = false;
  if (planRes.error) {
    // Most likely 20_plans_and_quotas.sql hasn't been run yet. Don't lock everyone out of the product.
    console.error("billing: couldn't read business_plans", planRes.error.message);
    planId = "tracker";
    degraded = true;
  } else {
    planId = normalizePlanId(planRes.data?.plan) ?? "free";
  }

  // The own_key column is new: until its migration is run, count every reading.
  let scansUsed = scansRes.count ?? 0;
  if (scansRes.error) {
    if (isNotSetUp(scansRes.error)) {
      const retry = await countScans(false);
      if (retry.error) {
        console.error("billing: couldn't count scans", retry.error.message);
        degraded = true;
      }
      scansUsed = retry.count ?? 0;
    } else {
      console.error("billing: couldn't count scans", scansRes.error.message);
      degraded = true;
    }
  }

  if (keyRes.error && !isNotSetUp(keyRes.error)) console.error("billing: couldn't read AI key status", keyRes.error.message);
  const hasOwnKey = keyRes.error ? false : keyRes.data === true;

  const plan = PLANS[planId];
  return {
    plan,
    scansUsed,
    scansLeft: Math.max(0, plan.scansPerMonth - scansUsed),
    hasOwnKey,
    resetsAt: nextMonthStartBangkok(),
    degraded,
  };
}
