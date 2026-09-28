import type { Metadata } from "next";
import SettingsShell from "../../../components/SettingsShell";
import SuppliersManager from "../../../components/SuppliersManager";

export const metadata: Metadata = {
  title: "Suppliers — SabaiBiz",
};

export default function SuppliersPage() {
  return (
    <SettingsShell ownerOnly title="Suppliers">
      <SuppliersManager />
    </SettingsShell>
  );
}
