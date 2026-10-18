"use client";

import { Suspense } from "react";
import { useUser } from "../context/UserContext";
import DashboardContent from "./DashboardContent";
import MyDay from "./MyDay";

const loading = (
  <p role="status" className="px-6 py-8 text-sm text-teal-900/70">
    Loading…
  </p>
);

// The owner and managers get the business dashboard; employees get a one-screen "My day".
export default function DashboardHome() {
  const { role } = useUser();

  // Wait for the role so an employee never sees the business numbers flash by.
  if (role === null) return loading;
  if (role === "employee") return <MyDay />;

  // DashboardContent reads the period from the URL (useSearchParams), so it needs a Suspense boundary.
  return (
    <Suspense fallback={loading}>
      <DashboardContent />
    </Suspense>
  );
}
