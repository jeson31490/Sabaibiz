import type { Metadata } from "next";
import PayrollManager from "../../../components/PayrollManager";
import SettingsShell from "../../../components/SettingsShell";

export const metadata: Metadata = { title: "Payroll — SabaiBiz" };

export default function PayrollPage() {
  return (
    <SettingsShell ownerOnly title="Payroll" maxWidth="max-w-5xl">
      <div className="mt-6">
        <PayrollManager />
      </div>
    </SettingsShell>
  );
}
