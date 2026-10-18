"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useUser } from "../../context/UserContext";

// An employee the owner hasn't allowed to scan has no business on the invoice pages.
// The database refuses their requests too (see supabase/18_team_permissions_attendance.sql);
// this just sends them back to their own screen instead of showing empty pages.
export default function InvoicesLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { canScan } = useUser();

  useEffect(() => {
    if (canScan === false) router.replace("/dashboard");
  }, [canScan, router]);

  if (canScan !== true) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center bg-teal-50/60 text-sm font-medium text-teal-800">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
