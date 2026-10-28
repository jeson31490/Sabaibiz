"use client";

import Link from "next/link";
import { useState } from "react";
import { LANG_LABEL, LANG_PATH } from "../../../lib/landing2";
import type { Lang } from "../../../lib/landingCopy";

const NAMES: Record<Lang, string> = { en: "English", th: "ไทย", fr: "Français", ru: "Русский" };

/** Phone header menu: language choice, section links and sign-in (the desktop header shows these inline). */
export default function MobileMenu({
  lang,
  langs,
  links,
  login,
  signIn,
  label,
}: {
  lang: Lang;
  langs: Lang[];
  links: { href: string; text: string }[];
  login: string;
  signIn: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[#19D3B5]/40 px-3 py-2 text-sm font-semibold text-[#F4EBD8]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
        {LANG_LABEL[lang]}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-[#19D3B5]/20 bg-[#031B1C] px-5 pb-5 pt-3 shadow-2xl">
          <ul className="grid grid-cols-2 gap-2">
            {langs.map((l) => (
              <li key={l}>
                <Link
                  href={LANG_PATH[l]}
                  hrefLang={l}
                  onClick={() => setOpen(false)}
                  aria-current={l === lang ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3 text-center text-base font-semibold ${l === lang ? "bg-[#19D3B5] text-[#031B1C]" : "border border-[#F4EBD8]/20 text-[#F4EBD8]"}`}
                >
                  {NAMES[l]}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-1 border-t border-[#F4EBD8]/10 pt-3 text-base font-medium">
            {links.map((x) => (
              <li key={x.href}>
                <a href={x.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-[#F4EBD8]/90">
                  {x.text}
                </a>
              </li>
            ))}
            <li>
              <Link href={login} className="block rounded-lg px-2 py-2.5 font-bold text-[#E8B94A]">
                {signIn}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
