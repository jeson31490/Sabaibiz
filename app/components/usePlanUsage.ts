"use client";

import { useEffect, useState } from "react";
import { fetchPlanUsage, type PlanUsage } from "../../lib/billing";
import { supabase } from "../../lib/supabase";

/** The signed-in business's plan and this month's scan usage. `null` while loading (or signed out). */
export function usePlanUsage(): { usage: PlanUsage | null; reload: () => void } {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => (data.session ? fetchPlanUsage(supabase) : null))
      .then((u) => {
        if (!cancelled) setUsage(u);
      })
      .catch((e) => console.error("usePlanUsage", e));
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { usage, reload: () => setVersion((v) => v + 1) };
}
