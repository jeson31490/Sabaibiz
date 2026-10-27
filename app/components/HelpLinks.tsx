import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/site";

/** Help and legal pages, reachable from inside the account (they are public pages too). */
export default function HelpLinks() {
  const links = [
    { href: "/faq", title: "Questions and answers", text: "Scans, plans, your data, your team." },
    { href: "/terms", title: "Terms of use", text: "The rules for using SabaiBiz." },
    { href: "/privacy", title: "Privacy policy", text: "What we keep, who processes it, your rights." },
  ];
  return (
    <section aria-label="Help and legal" className="mt-12">
      <h2 className="text-lg font-semibold text-teal-950">Help and legal</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block h-full rounded-2xl border border-teal-100 bg-white p-5 shadow-card transition hover:border-teal-300"
            >
              <p className="font-semibold text-teal-950">{l.title}</p>
              <p className="mt-1 text-sm text-teal-900/65">{l.text}</p>
            </Link>
          </li>
        ))}
      </ul>
      {CONTACT_EMAIL && (
        <p className="mt-4 text-sm text-teal-900/70">
          Need a hand? Write to{" "}
          <a className="font-semibold text-teal-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      )}
    </section>
  );
}
