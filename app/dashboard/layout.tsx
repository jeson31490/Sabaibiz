"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

// Guards /dashboard and every page below it. The Supabase session is kept in the browser,
// so the check runs client-side; data itself is protected by Supabase Row Level Security.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setAllowed(true);
      else router.replace("/login");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!allowed) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-teal-50/60 text-sm font-medium text-teal-800"
      >
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
