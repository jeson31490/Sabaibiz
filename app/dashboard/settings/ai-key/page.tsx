import type { Metadata } from "next";
import AiKeyCard from "../../../components/AiKeyCard";
import SettingsShell from "../../../components/SettingsShell";

export const metadata: Metadata = { title: "AI key — SabaiBiz" };

export default function AiKeyPage() {
  return (
    <SettingsShell ownerOnly title="AI key" maxWidth="max-w-3xl">
      <div className="mt-6">
        <AiKeyCard />
      </div>
    </SettingsShell>
  );
}
