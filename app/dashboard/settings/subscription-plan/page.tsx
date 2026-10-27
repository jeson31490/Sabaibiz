import type { Metadata } from "next";
import PlanCards from "../../../components/PlanCards";
import SettingsShell from "../../../components/SettingsShell";

export const metadata: Metadata = {
  title: "Subscription Plan — SabaiBiz",
};

export default function SubscriptionPlanPage() {
  return (
    <SettingsShell ownerOnly title="Subscription Plan" maxWidth="max-w-7xl">
      <p className="mt-1 text-sm text-teal-900/65">
        Pick the plan that fits your business. Prices are in Thai baht. You can change plan anytime.
      </p>
      <PlanCards />
    </SettingsShell>
  );
}
