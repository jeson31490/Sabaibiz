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
    return () => {
      off = true;
    };
  }, []);

  const suggested = langForCountry(country);
  const words = suggested ? SWITCH_BANNER[suggested] : undefined;
  if (!suggested || suggested === lang || !words || dismissed) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-[#19D3B5] px-4 py-2 text-center text-sm font-medium text-[#031B1C]">
      <span>{words.text}</span>
      <Link href={LANG_PATH[suggested]} hrefLang={suggested} className="rounded-full bg-[#031B1C] px-3 py-1 text-xs font-bold text-[#F4EBD8] hover:brightness-125">
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
