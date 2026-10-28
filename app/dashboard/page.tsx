import type { Metadata } from "next";
import DashboardHome from "../components/DashboardHome";
import DashboardNavbar from "../components/DashboardNavbar";

export const metadata: Metadata = {
  title: "Dashboard — SabaiBiz",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <DashboardNavbar />
      <DashboardHome />
    </div>
  );
}
