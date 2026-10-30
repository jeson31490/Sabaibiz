"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bangkokToday, fetchDailyCosts, fromIsoDate, toIsoDate } from "../../lib/invoices";
import { fetchDailyRevenue } from "../../lib/sales";

type Props = {
  /** Already formatted figures from the dashboard (so the hero never disagrees with the cards below). */
  result: { value: string; note: string };
  revenue: { value: string; note: string };
  costs: { value: string };
  /** Numeric result of the selected period, when known, to colour the figure. */
  resultNumber: number | null;
  periodLabel: string;
  refreshKey: number;
};

const shiftDay = (iso: string, days: number) => {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

type Point = { day: string; result: number };

/** Result of the last 7 days (revenue − invoice costs), drawn as a line. */
function useWeekTrend(refreshKey: number): Point[] | "loading" | "error" {
  const days = useMemo(() => {
    const today = bangkokToday();
    return Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  }, []);
  const [state, setState] = useState<Point[] | "loading" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDailyRevenue(days), fetchDailyCosts(days)])
      .then(([rev, cost]) => {
        if (!cancelled) setState(days.map((day, i) => ({ day, result: Math.round((rev[i] - cost[i]) * 100) / 100 })));
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [days, refreshKey]);
  return state;
}

function Sparkline({ points }: { points: Point[] }) {
  const W = 360;
  const H = 90;
  const values = points.map((p) => p.result);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - 8 - ((v - min) / (max - min || 1)) * (H - 22);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.result).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Result of the last 7 days">
        <defs>
          <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#19D3B5" stopOpacity="0.35" />
            <stop offset="1" stopColor="#19D3B5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#hero-fill)" />
        <path d={line} fill="none" stroke="#19D3B5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(last.result)} r="6" fill="#E8B94A" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-[#F4EBD8]/50" aria-hidden>
        {points.map((p) => (
          <span key={p.day}>{fromIsoDate(p.day).toLocaleDateString("en-GB", { weekday: "short" })}</span>
        ))}
      </div>
    </div>
  );
}

// The big "Result of the day" card, with the 7-day line and the three quick actions.
export default function ResultHero({ result, revenue, costs, resultNumber, periodLabel, refreshKey }: Props) {
  const trend = useWeekTrend(refreshKey);
  const positive = resultNumber === null ? true : resultNumber >= 0;

  return (
    <section aria-label="Result" className="space-y-3">
      <div className="rounded-[26px] border border-[#19D3B5]/25 bg-gradient-to-br from-[#0d4745] to-[#072A2B] p-5 sm:p-7">
        <p className="font-plex text-xs uppercase tracking-[0.15em] text-[#F4EBD8]/60">Result · {periodLabel}</p>
        <p className={`mt-3 whitespace-nowrap font-display text-5xl font-extrabold leading-none sm:text-7xl ${positive ? "text-[#F4EBD8]" : "text-[#FF8A6E]"}`}>
          {result.value}
        </p>
        <p className="mt-2 text-sm text-[#F4EBD8]/70">{result.note}</p>

        {trend !== "loading" && trend !== "error" && trend.some((p) => p.result !== 0) && <Sparkline points={trend} />}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[#F4EBD8]/10 pt-4">
          <div>
            <dt className="text-xs text-[#F4EBD8]/60">Revenue</dt>
            <dd className="mt-1 font-display text-xl font-extrabold text-[#19D3B5] sm:text-2xl">{revenue.value}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#F4EBD8]/60">Costs</dt>
            <dd className="mt-1 font-display text-xl font-extrabold text-[#FF8A6E] sm:text-2xl">{costs.value}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link href="/dashboard/invoices/scan" className="col-span-1 flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#E8B94A] px-3 py-4 text-center text-sm font-extrabold text-[#031B1C] sm:flex-row sm:gap-2 sm:text-base">
          <span aria-hidden className="text-2xl">📸</span>Scan an invoice
        </Link>
        <Link href="/dashboard/transfers" className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#19D3B5]/30 bg-[#072A2B] px-3 py-4 text-center text-sm font-semibold text-[#F4EBD8]">
          <span aria-hidden className="text-xl">📲</span>Transfers
        </Link>
        <Link href="/dashboard/invoices" className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#19D3B5]/30 bg-[#072A2B] px-3 py-4 text-center text-sm font-semibold text-[#F4EBD8]">
          <span aria-hidden className="text-xl">🧾</span>Invoices
        </Link>
      </div>
    </section>
  );
}
