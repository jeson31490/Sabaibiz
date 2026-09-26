"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useUser } from "../context/UserContext";
import DashboardNavbar from "./DashboardNavbar";

export default function SettingsShell({
  title,
  maxWidth = "max-w-3xl",
  ownerOnly = false,
  children,
}: {
  title: string;
  maxWidth?: string;
  /** Business settings: managers and employees are sent back to Settings. */
  ownerOnly?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { role } = useUser();
  const allowed = !ownerOnly || role === "owner";

  useEffect(() => {
    if (ownerOnly && role !== null && role !== "owner") router.replace("/dashboard/settings");
  }, [ownerOnly, role, router]);

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />
      <main className={`mx-auto px-6 py-8 ${maxWidth}`}>
        <Link
          href="/dashboard/settings"
          aria-label="Back to Account & Settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
          {title}
        </h1>
        {allowed ? (
          children
        ) : (
          <p role="status" className="mt-6 text-sm text-teal-900/70">
            Loading…
          </p>
        )}
      </main>
    </div>
  );
}
