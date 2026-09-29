import type { Metadata } from "next";
import { Suspense } from "react";
import DashboardContent from "../components/DashboardContent";
import DashboardNavbar from "../components/DashboardNavbar";

export const metadata: Metadata = {
  title: "Dashboard — SabaiBiz",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-teal-50/60">
      <DashboardNavbar />
      {/* DashboardContent reads the period from the URL (useSearchParams), so it needs a Suspense boundary. */}
      <Suspense
        fallback={
          <p role="status" className="px-6 py-8 text-sm text-teal-900/70">
            Loading…
          </p>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
