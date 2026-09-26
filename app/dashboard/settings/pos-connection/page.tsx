import type { Metadata } from "next";
import Image from "next/image";
import SettingsShell from "../../../components/SettingsShell";

export const metadata: Metadata = {
  title: "Connection & POS — SabaiBiz",
};

const INTEGRATIONS = [
  {
    name: "Loyverse",
    logo: { src: "/Loyverse%20logo.png", width: 252, height: 254 },
    description: "Sync your sales and menu items from Loyverse to see real margins per dish.",
    available: true,
  },
  {
    name: "Ocha",
    logo: { src: "/Ocha%20logo.jpg", width: 447, height: 447 },
    description: "Connect your Ocha POS to pull daily sales automatically.",
    available: false,
  },
  {
    name: "Square",
    description: "Import sales and products from your Square account.",
    available: false,
  },
  {
    name: "Other",
    description: "Using a different POS? Tell us and we'll prioritize it.",
    available: false,
  },
] as { name: string; description: string; available: boolean; logo?: { src: string; width: number; height: number } }[];

export default function PosConnectionPage() {
  return (
    <SettingsShell ownerOnly title="Connection & POS" maxWidth="max-w-5xl">
      <p className="mt-1 text-sm text-teal-900/65">
        Connect your point-of-sale so SabaiBiz can match sales against ingredient costs.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {INTEGRATIONS.map(({ name, description, available, logo }) => (
          <div
            key={name}
            aria-disabled={!available}
            className={`flex flex-col rounded-2xl border p-6 shadow-card ${
              available
                ? "border-teal-100 bg-white"
                : "border-gray-200 bg-gray-50 opacity-70"
            }`}
          >
            <div className="flex items-center gap-4">
              {logo ? (
                <Image
                  src={logo.src}
                  alt={`${name} logo`}
                  width={logo.width}
                  height={logo.height}
                  className="h-10 w-auto flex-none object-contain"
                />
              ) : (
                <span
                  aria-hidden
                  className={`flex h-14 w-14 flex-none items-center justify-center rounded-xl text-2xl font-bold ${
                    available ? "bg-teal-700 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {name[0]}
                </span>
              )}
              <h2 className={`text-lg font-semibold ${available ? "text-teal-950" : "text-gray-600"}`}>
                {name}
              </h2>
            </div>
            <p className={`mt-4 flex-1 text-sm leading-relaxed ${available ? "text-teal-900/65" : "text-gray-500"}`}>
              {description}
            </p>
            {available ? (
              <button
                type="button"
                className="mt-6 rounded-full bg-teal-700 px-6 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800"
              >
                Connect
              </button>
            ) : (
              <p className="mt-6 rounded-full bg-gray-200 px-6 py-3 text-center text-base font-semibold text-gray-500">
                Coming soon
              </p>
            )}
          </div>
        ))}
      </div>
    </SettingsShell>
  );
}
