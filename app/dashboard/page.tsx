import type { Metadata } from "next";
import DashboardContent from "../components/DashboardContent";
import DashboardNavbar from "../components/DashboardNavbar";

export const metadata: Metadata = {
  title: "Dashboard — SabaiBiz",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-teal-50/60">
      <DashboardNavbar />
      <DashboardContent />
    </div>
  );
}
