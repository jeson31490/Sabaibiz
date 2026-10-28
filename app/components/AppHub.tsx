"use client";

import Link from "next/link";
import { useState } from "react";
import { SabaiCurve } from "./landing/SabaiMark";

export type HubSource = {
  id: string;
  title: string;
  sub: string;
  /** What is happening with this source, shown under the diagram. */
  detail: string;
  cta?: { label: string; href?: string; onClick?: () => void };
  soon?: boolean;
};

export type HubOutput = {
  label: string;
  value: string;
  sub: string;
  tone: "teal" | "red" | "gold";
  href?: string;
  highlight?: boolean;
};

const TONE = {
  teal: { text: "text-[#19D3B5]", border: "border-[#19D3B5]/55", hex: "#19D3B5" },
  red: { text: "text-[#FF8A6E]", border: "border-[#FF8A6E]/55", hex: "#FF8A6E" },
  gold: { text: "text-[#E8B94A]", border: "border-[#E8B94A]", hex: "#E8B94A" },
} as const;

const W = 1100;
const H = 500;
// Vertical centre of each node, as in the design board (sources 4, outputs 5).
const SRC_Y = [70, 195, 320, 440];
const OUT_Y = [50, 150, 250, 350, 450];
const CX = 550;
const CY = 250;

/**
 * Sources on the left flow into the SabaiBiz sphere, results come out on the right. Click a source to
 * see where it stands. Below 1024px the diagram becomes two plain stacked lists.
 */
export default function AppHub({ sources, outputs }: { sources: HubSource[]; outputs: HubOutput[] }) {
  const [activeId, setActiveId] = useState(sources[0]?.id);
  const active = sources.find((s) => s.id === activeId) ?? sources[0];

  const pct = (n: number, total: number) => `${(n / total) * 100}%`;

  return (
    <section
      aria-label="How your business flows through SabaiBiz"
      className="rounded-[28px] border border-[#19D3B5]/20 bg-gradient-to-b from-[#072A2B]/90 to-[#031B1C]/60 p-4 sm:p-6"
    >
      {/* Wide screens: the diagram. */}
      <div className="relative mx-auto hidden w-full max-w-[1100px] lg:block" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="hub-ring" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#19D3B5" />
              <stop offset="1" stopColor="#E8B94A" />
            </linearGradient>
            <radialGradient id="hub-sphere" cx="38%" cy="32%" r="75%">
              <stop stopColor="#1E5F5B" />
              <stop offset="0.6" stopColor="#0B3A3A" />
              <stop offset="1" stopColor="#031B1C" />
            </radialGradient>
          </defs>
          {SRC_Y.slice(0, sources.length).map((y, i) => {
            const d = `M262 ${y} C 380 ${y}, 380 ${CY}, 470 ${CY}`;
            const on = sources[i].id === activeId;
            return (
              <g key={`s${i}`}>
                <path d={d} fill="none" stroke="#19D3B5" strokeOpacity={on ? 0.8 : 0.3} strokeWidth={on ? 2 : 1.5} />
                {!sources[i].soon && (
                  <circle r="4.5" fill="#19D3B5" opacity="0">
                    <set attributeName="opacity" to="1" begin={`${i * 0.7}s`} />
                    <animateMotion dur="3.4s" begin={`${i * 0.7}s`} repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}
          {OUT_Y.slice(0, outputs.length).map((y, i) => {
            const d = `M630 ${CY} C 730 ${CY}, 730 ${y}, 838 ${y}`;
            return (
              <g key={`o${i}`}>
                <path d={d} fill="none" stroke="#E8B94A" strokeOpacity="0.4" strokeWidth="1.5" />
                <circle r="4.5" fill="#E8B94A" opacity="0">
                  <set attributeName="opacity" to="1" begin={`${0.3 + i * 0.6}s`} />
                  <animateMotion dur="3.4s" begin={`${0.3 + i * 0.6}s`} repeatCount="indefinite" path={d} />
                </circle>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r="96" fill="none" stroke="url(#hub-ring)" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="3 8">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="40s" repeatCount="indefinite" />
          </circle>
          <circle cx={CX} cy={CY} r="78" fill="url(#hub-sphere)" stroke="url(#hub-ring)" strokeWidth="2.5" />
        </svg>

        {/* The mark sits on the sphere. */}
        <div className="pointer-events-none absolute flex items-center justify-center" style={{ left: pct(CX - 60, W), top: pct(CY - 60, H), width: pct(120, W), height: pct(120, H) }}>
          <SabaiCurve size={100} id="hub" />
        </div>
        <div
          className="pointer-events-none absolute text-center text-lg font-bold tracking-tight text-[#F4EBD8]"
          style={{ left: pct(CX - 80, W), top: pct(CY + 42, H), width: pct(160, W) }}
        >
          Sabai<span className="text-[#F2B84B]">Biz</span>
        </div>

        {sources.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveId(s.id)}
            aria-pressed={s.id === activeId}
            className={`absolute flex flex-col justify-center rounded-2xl border-[1.5px] bg-[#072A2B] px-[1.6%] text-left text-[#F4EBD8] transition hover:bg-[#0B3536] ${
              s.id === activeId ? "border-[#E8B94A] shadow-[0_0_0_4px_rgba(232,185,74,0.18)]" : "border-[#19D3B5]/40"
            }`}
            style={{ left: 0, top: pct(SRC_Y[i] - 38, H), width: pct(260, W), height: pct(76, H) }}
          >
            <span className="block font-plex text-[clamp(11px,1.35vw,15px)]">{s.title}</span>
            <span className="mt-1 block text-[clamp(10px,1.25vw,14px)] text-[#9FC4C0]">{s.sub}</span>
          </button>
        ))}

        {outputs.map((o, i) => {
          const t = TONE[o.tone];
          const inner = (
            <>
              <span className="block font-plex text-[clamp(9px,1.1vw,13px)] uppercase tracking-wide text-[#F4EBD8]/70">{o.label}</span>
              <span className={`mt-0.5 block truncate font-display text-[clamp(13px,1.75vw,22px)] font-extrabold ${t.text}`}>{o.value}</span>
              <span className="block truncate text-[clamp(9px,1.05vw,13px)] text-[#9FC4C0]">{o.sub}</span>
            </>
          );
          const cls = `absolute flex flex-col rounded-2xl border-[1.5px] justify-center px-[1.6%] ${t.border} ${
            o.highlight ? "bg-[#E8B94A]/12" : "bg-[#072A2B]"
          }`;
          const style = { left: pct(840, W), top: pct(OUT_Y[i] - 40, H), width: pct(260, W), height: pct(80, H) };
          return o.href ? (
            <Link key={o.label} href={o.href} className={`${cls} transition hover:brightness-125`} style={style}>
              {inner}
            </Link>
          ) : (
            <div key={o.label} className={cls} style={style}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Phones and tablets: sources, then results. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-center gap-2 pb-4">
          <SabaiCurve size={34} id="hub-sm" />
          <span className="text-xl font-bold tracking-tight text-[#F4EBD8]">
            Sabai<span className="text-[#F2B84B]">Biz</span>
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              aria-pressed={s.id === activeId}
              className={`rounded-2xl border-[1.5px] bg-[#072A2B] px-4 py-3 text-left text-[#F4EBD8] ${
                s.id === activeId ? "border-[#E8B94A]" : "border-[#19D3B5]/40"
              }`}
            >
              <span className="block font-plex text-sm">{s.title}</span>
              <span className="block text-sm text-[#9FC4C0]">{s.sub}</span>
            </button>
          ))}
        </div>
        <p aria-hidden className="py-2 text-center text-[#19D3B5]">↓</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {outputs.map((o) => {
            const t = TONE[o.tone];
            const inner = (
              <>
                <span className="block font-plex text-xs uppercase tracking-wide text-[#F4EBD8]/70">{o.label}</span>
                <span className={`block font-display text-xl font-extrabold ${t.text}`}>{o.value}</span>
                <span className="block text-xs text-[#9FC4C0]">{o.sub}</span>
              </>
            );
            const cls = `block rounded-2xl border-[1.5px] px-4 py-3 ${t.border} ${o.highlight ? "bg-[#E8B94A]/12" : "bg-[#072A2B]"}`;
            return o.href ? (
              <Link key={o.label} href={o.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={o.label} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      {active && (
        <div className="mx-auto mt-5 flex max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#F4EBD8]/20 pt-4">
          <div aria-live="polite">
            <span className="font-plex text-sm uppercase text-[#19D3B5]">{active.title}</span>
            <p className="mt-1 text-base text-[#F4EBD8]">{active.detail}</p>
          </div>
          {active.cta &&
            (active.cta.onClick ? (
              <button type="button" onClick={active.cta.onClick} className="font-semibold text-[#E8B94A] hover:underline">
                {active.cta.label} →
              </button>
            ) : (
              <Link href={active.cta.href ?? "#"} className="font-semibold text-[#E8B94A] hover:underline">
                {active.cta.label} →
              </Link>
            ))}
        </div>
      )}
    </section>
  );
}
