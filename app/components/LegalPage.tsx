import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "../../lib/site";

export const LEGAL_UPDATED = "27 October 2026";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-teal-950">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-teal-900/85">{children}</div>
    </section>
  );
}

export default function LegalPage({ title, children, showUpdated = true }: { title: string; children: ReactNode; showUpdated?: boolean }) {
  return (
    <div className="app-dark min-h-screen">
      <header className="border-b border-teal-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-teal-700">
            SabaiBiz
          </Link>
          <Link href="/" className="text-sm font-semibold text-teal-800 hover:underline">
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-teal-950">{title}</h1>
        {showUpdated && <p className="mt-2 text-sm text-teal-900/60">Last updated {LEGAL_UPDATED}</p>}
        {children}
        <Section title="Contact">
          <p>
            Questions about this page or your data:{" "}
            {CONTACT_EMAIL ? (
              <a className="font-semibold text-teal-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            ) : (
              "use the contact details in your SabaiBiz account."
            )}
          </p>
        </Section>
      </main>
    </div>
  );
}
