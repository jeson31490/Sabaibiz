"use client";

import { useState } from "react";
import type { L2 } from "../../../lib/landing2";
import { TabVisual } from "./Visuals";

export default function FeatureTabs({ tabs }: { tabs: L2["tabs"] }) {
  const [i, setI] = useState(0);
  const tab = tabs[i];
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((x, n) => (
          <button
            key={x.label}
            role="tab"
            type="button"
            aria-selected={n === i}
            onClick={() => setI(n)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B94A] ${
              n === i ? "bg-[#031B1C] text-[#F4EBD8]" : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-8 grid gap-8 rounded-3xl bg-[#031B1C] p-6 text-[#F4EBD8] sm:p-10 md:grid-cols-2">
        <div>
          {tab.badge && (
            <span className="mb-3 inline-block rounded-full bg-[#E8B94A] px-3 py-1 font-plex text-[11px] font-bold text-[#031B1C]">{tab.badge}</span>
          )}
          <h3 className="font-display text-2xl font-bold sm:text-3xl">{tab.title}</h3>
          <p className="mt-3 leading-relaxed text-[#F4EBD8]/80">{tab.text}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {tab.bullets.map((b) => (
              <li key={b} className="rounded-full border border-[#19D3B5]/40 bg-[#19D3B5]/10 px-4 py-2 text-sm text-[#19D3B5]">
                ✓ {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="self-center">
          <TabVisual i={i} />
        </div>
      </div>
    </div>
  );
}
