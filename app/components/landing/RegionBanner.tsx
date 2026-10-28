"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANG_PATH } from "../../../lib/landing2";
import type { Lang } from "../../../lib/landingCopy";
import { langForCountry, SWITCH_BANNER } from "../../../lib/regions";
import { useCountry } from "../../../lib/useCountry";

const DISMISS_KEY = "sabai_lang_banner_dismissed";

/** A polite bar that suggests the visitor's own language. It never redirects by itself (a VPN or a trip must not trap anyone). */
export default function RegionBanner({ lang }: { lang: Lang }) {
  const country = useCountry();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    let off = false;
    void Promise.resolve().then(() => {
      try {
        if (!off) setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        if (!off) setDismissed(false);
      }
    });
    // Whoever picks a language by hand has answered the question: never suggest again.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[hreflang]");
      if (!a) return;
      setDismissed(true);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      off = true;
      document.removeEventListener("click", onClick);
    };
  }, []);

  const suggested = langForCountry(country);
  const words = suggested ? SWITCH_BANNER[suggested] : undefined;
  if (!suggested || suggested === lang || !words || dismissed) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-[#19D3B5] px-4 py-2 text-center text-sm font-medium text-[#031B1C]">
      <span className="basis-full sm:basis-auto">{words.text}</span>
      <Link href={LANG_PATH[suggested]} hrefLang={suggested} className="whitespace-nowrap rounded-full bg-[#031B1C] px-3 py-1 text-xs font-bold text-[#F4EBD8] hover:brightness-125">
        {words.cta}
      </Link>
      <button
        type="button"
        aria-label="Close"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        className="text-lg leading-none opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
