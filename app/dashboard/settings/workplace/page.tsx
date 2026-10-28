import type { Metadata } from "next";
import SettingsShell from "../../../components/SettingsShell";
import WorkplaceZoneCard from "../../../components/WorkplaceZoneCard";

export const metadata: Metadata = { title: "Workplace zone — SabaiBiz" };

export default function WorkplaceZonePage() {
  return (
    <SettingsShell ownerOnly title="Workplace zone">
      <WorkplaceZoneCard />
    </SettingsShell>
  );
}
