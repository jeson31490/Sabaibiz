"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import DashboardNavbar from "../../components/DashboardNavbar";
import { inputClass, labelClass } from "../../components/FormField";
import {
  bangkokToday,
  fetchPriceAlerts,
  fetchPurchaseHistory,
  fromIsoDate,
  toIsoDate,
  type PriceAlertRow,
  type PurchaseRow,
} from "../../../lib/invoices";

// The product being analysed is teal, the one it is compared with is gold.
// This pair passes the dataviz palette checks (chroma, colour-blind separation, contrast).
const COLORS = { first: "#0d9488", second: "#b45309" };

const PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "3m", label: "Last 3 months", days: 90 },
  { id: "6m", label: "Last 6 months", days: 180 },
  { id: "custom", label: "Custom range", days: 0 },
] as const;
type PresetId = (typeof PRESETS)[number]["id"];

/* ------------------------------ data helpers ------------------------------ */

type Purchase = { date: string; price: number; quantity: number; supplier: string };

type ProductHistory = {
  key: string;
  name: string;
  unit: string;
  /** Name, plus the unit when the same product is bought in several units (kg vs bottle). */
  label: string;
  /** Oldest first. */
  purchases: Purchase[];
};

/** One point on the chart: what was paid for a product on one day. */
type Point = { iso: string; time: number; price: number; suppliers: { name: string; price: number }[] };

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;
const pctChange = (now: number, before: number) => (before === 0 ? 0 : ((now - before) / before) * 100);
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtShort = (iso: string) => fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtLong = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const addDaysIso = (iso: string, n: number) => {
  const d = fromIsoDate(iso);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};
const changeTone = (n: number) => (n > 0 ? "text-red-600" : n < 0 ? "text-green-700" : "text-teal-900/60");
const changeArrow = (n: number) => (n > 0 ? "▲ " : n < 0 ? "▼ " : "");

/** Groups invoice lines into products. "Chicken breast" and "chicken  breast" are the same product; kg and bottle are not. */
function buildProducts(rows: PurchaseRow[]): ProductHistory[] {
  const groups = new Map<string, { spellings: Map<string, number>; unit: string; purchases: Purchase[] }>();
  for (const r of rows) {
    const name = r.product.trim().replace(/\s+/g, " ");
    if (!name || !(r.quantity > 0)) continue;
    const key = `${norm(name)}|${norm(r.unit)}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { spellings: new Map(), unit: r.unit.trim(), purchases: [] }));
    g.spellings.set(name, (g.spellings.get(name) ?? 0) + 1);
    g.purchases.push({ date: r.date, price: r.unitPrice, quantity: r.quantity, supplier: r.supplier });
  }

  const products = [...groups.entries()].map(([key, g]) => ({
    key,
    // The spelling used most often on the invoices.
    name: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
    unit: g.unit,
    label: "",
    purchases: g.purchases.sort((a, b) => a.date.localeCompare(b.date)),
  }));
  const unitsPerName = new Map<string, number>();
  for (const p of products) unitsPerName.set(norm(p.name), (unitsPerName.get(norm(p.name)) ?? 0) + 1);
  for (const p of products) p.label = unitsPerName.get(norm(p.name))! > 1 ? `${p.name} (${p.unit})` : p.name;
  return products.sort((a, b) => a.label.localeCompare(b.label));
}

/** Quantity-weighted average price per day (and per supplier that day), within [from, to]. */
function dailyPoints(product: ProductHistory, from: string, to: string): Point[] {
  const days = new Map<string, Purchase[]>();
  for (const p of product.purchases) {
    if (p.date < from || p.date > to) continue;
    days.set(p.date, [...(days.get(p.date) ?? []), p]);
  }
  const weighted = (ps: Purchase[]) =>
    round2(ps.reduce((s, p) => s + p.price * p.quantity, 0) / ps.reduce((s, p) => s + p.quantity, 0));

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, ps]) => {
      const bySupplier = new Map<string, Purchase[]>();
      for (const p of ps) bySupplier.set(p.supplier, [...(bySupplier.get(p.supplier) ?? []), p]);
      return {
        iso,
        time: fromIsoDate(iso).getTime(),
        price: weighted(ps),
        suppliers: [...bySupplier.entries()].map(([name, sps]) => ({ name, price: weighted(sps) })),
      };
    });
}

type SupplierRow = { name: string; price: number; date: string; previous: number | null };

/** Each supplier who sold the product in [from, to]: their latest price there, and their price the time before. */
function supplierRows(product: ProductHistory, from: string, to: string): SupplierRow[] {
  const bySupplier = new Map<string, Purchase[]>();
  for (const p of product.purchases) bySupplier.set(p.supplier, [...(bySupplier.get(p.supplier) ?? []), p]);

  const rows: SupplierRow[] = [];
  for (const [name, ps] of bySupplier) {
    // This supplier's price history, one point per day, using all history so "previous" can predate the period.
    const history = dailyPoints({ ...product, purchases: ps }, "0000-01-01", "9999-12-31");
    const lastIdx = history.findLastIndex((h) => h.iso >= from && h.iso <= to);
    if (lastIdx === -1) continue;
    rows.push({
      name,
      price: history[lastIdx].price,
      date: history[lastIdx].iso,
      previous: lastIdx > 0 ? history[lastIdx - 1].price : null,
    });
  }
  return rows.sort((a, b) => a.price - b.price);
}

function niceTicks(lo: number, hi: number) {
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.1);
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? mag * 10;
  const min = Math.floor((lo - (hi === lo ? span / 2 : 0)) / step) * step;
  const max = Math.ceil((hi + (hi === lo ? span / 2 : 0)) / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
}

/* ------------------------------ product dropdown ------------------------------ */

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-3 w-3 flex-none rounded-full" style={{ backgroundColor: color }} />;
}

function ProductSelect({
  id,
  label,
  color,
  products,
  value,
  onChange,
  exclude,
}: {
  id: string;
  label: string;
  color: string;
  products: ProductHistory[];
  value: string;
  onChange: (key: string) => void;
  exclude?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const options = products.filter((p) => p.key !== exclude);
  const current = products.find((p) => p.key === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Keep the highlighted option visible in a long list.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openList() {
    setActive(Math.max(0, options.findIndex((o) => o.key === value)));
    setOpen(true);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      onChange(options[active].key);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative" onKeyDown={onKeyDown}>
      <span id={`${id}-label`} className={labelClass}>
        {label}
      </span>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => (open ? setOpen(false) : openList())}
        className={`${inputClass} flex items-center gap-3 text-left`}
      >
        <Dot color={color} />
        <span className="flex-1 truncate">{current?.label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-none text-teal-700" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-teal-200 bg-white py-1 shadow-soft"
        >
          {options.map((p, i) => (
            <li
              key={p.key}
              role="option"
              aria-selected={p.key === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                onChange(p.key);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 text-sm text-teal-950 ${
                i === active ? "bg-teal-50" : ""
              } ${p.key === value ? "font-semibold" : ""}`}
            >
              <span className="truncate">{p.label}</span>
              <span className="flex-none text-xs text-teal-900/50">
                {p.purchases.length} {p.purchases.length === 1 ? "purchase" : "purchases"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ chart ------------------------------ */

const W = 640;
const H = 280;
const PAD = { l: 56, r: 24, t: 16, b: 32 };
const DAY_MS = 86_400_000;

type Series = { key: string; label: string; unit: string; color: string; points: Point[] };

function PriceChart({ from, to, series }: { from: string; to: string; series: Series[] }) {
  const [hover, setHover] = useState<number | null>(null); // time of the hovered purchase day
  const compare = series.length > 1;

  // One product plots real prices; two products of different scale plot % change since their first purchase in the period.
  const lines = series.map((s) => ({
    ...s,
    values: s.points.map((p) => (compare ? pctChange(p.price, s.points[0].price) : p.price)),
  }));
  const all = lines.flatMap((l) => l.values);
  const { min, max, ticks } = niceTicks(Math.min(...all), Math.max(...all));

  // Time axis over the whole period, so gaps between purchases show as gaps in time.
  const start = fromIsoDate(from).getTime() - (from === to ? DAY_MS / 2 : 0);
  const end = fromIsoDate(to).getTime() + (from === to ? DAY_MS / 2 : 0);
  const x = (t: number) => PAD.l + ((t - start) / (end - start)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const labelCount = from === to ? 1 : Math.min(5, Math.round((end - start) / DAY_MS) + 1);
  const xLabels =
    labelCount === 1
      ? [from]
      : Array.from({ length: labelCount }, (_, k) => toIsoDate(new Date(start + (k / (labelCount - 1)) * (end - start))));
  const fmtTick = (t: number) => (compare ? `${t > 0 ? "+" : ""}${t}%` : fmtBaht(t));
  const allTimes = [...new Set(lines.flatMap((l) => l.points.map((p) => p.time)))];

  // Snap to the nearest day on which something was bought.
  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best: number | null = null;
    for (const t of allTimes) if (best === null || Math.abs(x(t) - px) < Math.abs(x(best) - px)) best = t;
    setHover(best);
  }

  const summary = lines
    .map((l) => {
      const a = l.points[0];
      const b = l.points[l.points.length - 1];
      return `${l.label}: ${l.points.length} purchase days, from ${fmtBaht(a.price)} baht on ${fmtLong(a.iso)} to ${fmtBaht(b.price)} baht on ${fmtLong(b.iso)} per ${l.unit}`;
    })
    .join("; ");
  const hoverIso = hover === null ? null : toIsoDate(new Date(hover));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y"
        role="img"
        aria-label={`${compare ? "Percent change since the first purchase in the period. " : ""}${summary}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              className={compare && t === 0 ? "stroke-teal-300" : "stroke-teal-100"}
              strokeWidth={1}
            />
            <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-teal-900/60 text-[11px]">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {xLabels.map((iso, k) => (
          <text
            key={iso}
            x={labelCount === 1 ? (PAD.l + W - PAD.r) / 2 : x(fromIsoDate(iso).getTime())}
            y={H - 8}
            textAnchor={labelCount === 1 ? "middle" : k === 0 ? "start" : k === xLabels.length - 1 ? "end" : "middle"}
            className="fill-teal-900/65 text-[11px]"
          >
            {fmtShort(iso)}
          </text>
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="stroke-teal-300" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {lines.map((l) => (
          <g key={l.key}>
            {l.points.length > 1 && (
              <path
                d={l.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.time)},${y(l.values[i])}`).join(" ")}
                fill="none"
                stroke={l.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Every marker is a real purchase day; too many would clutter, so then only the latest shows. */}
            {l.points.map((p, i) =>
              l.points.length <= 60 || i === l.points.length - 1 || p.time === hover ? (
                <circle
                  key={p.iso}
                  cx={x(p.time)}
                  cy={y(l.values[i])}
                  r={p.time === hover ? 5.5 : 4}
                  fill={l.color}
                  stroke="white"
                  strokeWidth={2}
                />
              ) : null,
            )}
          </g>
        ))}
      </svg>

      {hover !== null && hoverIso && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg bg-teal-950 px-3 py-2 text-xs text-white shadow-soft"
          style={{ left: `${Math.max(16, Math.min(84, (x(hover) / W) * 100))}%` }}
        >
          <p className="font-semibold">{fmtLong(hoverIso)}</p>
          {lines.map((l) => {
            const i = l.points.findIndex((p) => p.time === hover);
            const lastBefore = l.points.findLast((p) => p.time <= hover);
            return (
              <div key={l.key} className="mt-1">
                <p className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {i !== -1
                    ? `${l.label}: ${fmtBaht(l.points[i].price)} ฿/${l.unit}${compare ? ` (${fmtPct(round1(l.values[i]))})` : ""}`
                    : lastBefore
                      ? `${l.label}: not bought (last ${fmtBaht(lastBefore.price)} ฿ on ${fmtShort(lastBefore.iso)})`
                      : `${l.label}: not bought yet`}
                </p>
                {i !== -1 && l.points[i].suppliers.length > 1 &&
                  l.points[i].suppliers.map((s) => (
                    <p key={s.name} className="ml-3.5 text-white/70">
                      {s.name}: {fmtBaht(s.price)} ฿
                    </p>
                  ))}
                {i !== -1 && l.points[i].suppliers.length === 1 && (
                  <p className="ml-3.5 text-white/70">{l.points[i].suppliers[0].name}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* The same data as a table, for screen readers and anyone who prefers numbers. */}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-teal-700 hover:text-teal-900">Show as a table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                <th className="py-2 pr-3">Date</th>
                {lines.map((l) => (
                  <th key={l.key} className="py-2 pr-3 text-right">
                    {l.label} (฿/{l.unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100">
              {[...allTimes].sort((a, b) => a - b).map((t) => (
                <tr key={t}>
                  <td className="py-1.5 pr-3 text-teal-900/75">{fmtLong(toIsoDate(new Date(t)))}</td>
                  {lines.map((l) => {
                    const p = l.points.find((q) => q.time === t);
                    return (
                      <td key={l.key} className="py-1.5 pr-3 text-right tabular-nums text-teal-950">
                        {p ? fmtBaht(p.price) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: PurchaseRow[]; alerts: PriceAlertRow[] };

export default function PriceAnalysisPage() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [firstKey, setFirstKey] = useState<string | null>(null);
  const [secondKey, setSecondKey] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetId>("6m");
  const [today] = useState(() => bangkokToday());
  const [customFrom, setCustomFrom] = useState(() => addDaysIso(today, -30));
  const [customTo, setCustomTo] = useState(today);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPurchaseHistory(), fetchPriceAlerts(5)])
      .then(([rows, alerts]) => {
        if (!cancelled) setLoad({ status: "ready", rows, alerts });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLoad({ status: "error", message: err instanceof Error ? err.message : "Your prices could not be loaded." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = load.status === "ready" ? load.rows : null;
  const products = useMemo(() => (rows ? buildProducts(rows) : []), [rows]);
  const byKey = useMemo(() => new Map(products.map((p) => [p.key, p])), [products]);
  const earliest = products.reduce<string | null>(
    (min, p) => (min === null || p.purchases[0].date < min ? p.purchases[0].date : min),
    null,
  );
  // Start on the product bought most often.
  const mostBought = [...products].sort((a, b) => b.purchases.length - a.purchases.length);
  const first = (firstKey && byKey.get(firstKey)) || mostBought[0];
  const second = secondKey && secondKey !== first?.key ? byKey.get(secondKey) : undefined;
  const selected = first ? (second ? [first, second] : [first]) : [];

  const from = preset === "custom" ? customFrom : addDaysIso(today, -(PRESETS.find((p) => p.id === preset)?.days ?? 180));
  const to = preset === "custom" ? customTo : today;
  const rangeValid = !!from && !!to && from <= to;

  const series: Series[] = rangeValid
    ? selected.map((p, i) => ({
        key: p.key,
        label: p.label,
        unit: p.unit,
        color: i === 0 ? COLORS.first : COLORS.second,
        points: dailyPoints(p, from, to),
      }))
    : [];
  const plotted = series.filter((s) => s.points.length > 0);
  const missing = series.filter((s) => s.points.length === 0);

  const comparison =
    second && rangeValid
      ? series.map((s, i) => {
          const firstPoint = s.points[0];
          const lastPoint = s.points[s.points.length - 1];
          return {
            s,
            latest: lastPoint ?? null,
            start: firstPoint ?? null,
            change: firstPoint && lastPoint ? round1(pctChange(lastPoint.price, firstPoint.price)) : null,
            cheapest: supplierRows(selected[i], from, to)[0] ?? null,
          };
        })
      : null;

  const alerts = load.status === "ready" ? load.alerts : [];

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Price Analysis</h1>

        {load.status === "loading" && (
          <p role="status" className="mt-6 rounded-2xl border border-teal-100 bg-white p-8 text-center text-sm text-teal-900/70 shadow-card">
            Loading your prices…
          </p>
        )}
        {load.status === "error" && (
          <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
            We couldn&apos;t load your prices: {load.message}
          </p>
        )}

        {load.status === "ready" && !first && (
          <section className="mt-6 flex flex-col items-center rounded-2xl border border-teal-100 bg-white px-6 py-12 text-center shadow-card">
            <div className="relative h-40 w-56 max-w-full">
              <Image src="/Snap%20Photo.png" alt="Mascot ready to photograph your first invoice" fill sizes="224px" className="object-contain" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-teal-950">No invoices yet</h2>
            <p className="mt-2 max-w-sm text-sm text-teal-900/65">
              Scan your invoices to see how the prices you pay change over time, and which supplier is cheapest.
            </p>
            <Link
              href="/dashboard/invoices/scan"
              className="mt-6 rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
            >
              Scan your first invoice
            </Link>
          </section>
        )}

        {load.status === "ready" && first && (
          <>
            {/* Date range */}
            <section aria-label="Date range" className="mt-6 rounded-2xl border border-teal-100 bg-white p-4 shadow-card">
              <div role="radiogroup" aria-label="Period" className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={preset === p.id}
                    onClick={() => setPreset(p.id)}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                      preset === p.id
                        ? "bg-teal-700 text-white shadow-card"
                        : "border border-teal-200 text-teal-800 hover:bg-teal-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {preset === "custom" && (
                <div className="mt-4 flex flex-wrap items-end gap-4">
                  <div>
                    <label htmlFor="from" className={labelClass}>
                      From
                    </label>
                    <input id="from" type="date" min={earliest ?? undefined} max={today} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="to" className={labelClass}>
                      To
                    </label>
                    <input id="to" type="date" min={earliest ?? undefined} max={today} value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}
            </section>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-full sm:w-64">
                      <ProductSelect
                        id="product-1"
                        label="Product"
                        color={COLORS.first}
                        products={products}
                        value={first.key}
                        onChange={setFirstKey}
                        exclude={second?.key}
                      />
                    </div>
                    {second ? (
                      <>
                        <div className="w-full sm:w-64">
                          <ProductSelect
                            id="product-2"
                            label="Compare with"
                            color={COLORS.second}
                            products={products}
                            value={second.key}
                            onChange={setSecondKey}
                            exclude={first.key}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSecondKey(null)}
                          className="rounded-full border border-teal-200 px-5 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                        >
                          Remove comparison
                        </button>
                      </>
                    ) : (
                      products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSecondKey(mostBought.find((p) => p.key !== first.key)?.key ?? null)}
                          className="rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-teal-800"
                        >
                          Compare with another product
                        </button>
                      )
                    )}
                  </div>

                  <h2 className="mt-6 text-lg font-semibold text-teal-950">Price evolution</h2>
                  <p className="mt-1 text-sm text-teal-900/65">
                    {second
                      ? "Change since each product's first purchase in the period, so products with different prices can be compared."
                      : `${first.label}, ฿ per ${first.unit}. Each dot is a day you bought it.`}
                    {rangeValid && ` · ${fmtLong(from)} – ${fmtLong(to)}`}
                  </p>

                  {second && (
                    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-teal-950" aria-label="Legend">
                      {series.map((s) => (
                        <li key={s.key} className="flex items-center gap-2">
                          <Dot color={s.color} />
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4">
                    {!rangeValid ? (
                      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                        Pick a start date on or before the end date.
                      </p>
                    ) : plotted.length === 0 ? (
                      <p className="rounded-xl bg-teal-50 p-6 text-center text-sm text-teal-900/75">
                        You didn&apos;t buy {selected.map((p) => p.label).join(" or ")} between {fmtLong(from)} and {fmtLong(to)}.
                        Try a longer period.
                      </p>
                    ) : (
                      <>
                        <PriceChart from={from} to={to} series={plotted} />
                        {missing.length > 0 && (
                          <p className="mt-2 text-sm text-teal-900/65">
                            No purchases of {missing.map((s) => s.label).join(" or ")} in this period.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {comparison && (
                  <section className="rounded-2xl border border-teal-100 bg-white shadow-card">
                    <div className="border-b border-teal-100 px-6 py-4">
                      <h2 className="text-lg font-semibold text-teal-950">Product comparison</h2>
                      <p className="mt-0.5 text-sm text-teal-900/60">
                        {fmtLong(from)} – {fmtLong(to)}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3 text-right">Latest price</th>
                            <th className="px-6 py-3 text-right">Start of period</th>
                            <th className="px-6 py-3 text-right">Change</th>
                            <th className="px-6 py-3">Cheapest supplier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-teal-100">
                          {comparison.map((r) => (
                            <tr key={r.s.key} className="transition hover:bg-teal-50/60">
                              <td className="px-6 py-4 font-medium text-teal-950">
                                <span className="flex items-center gap-2.5">
                                  <Dot color={r.s.color} />
                                  {r.s.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">
                                {r.latest ? `${fmtBaht(r.latest.price)} ฿/${r.s.unit}` : "—"}
                              </td>
                              <td className="px-6 py-4 text-right tabular-nums text-teal-900/70">
                                {r.start ? `${fmtBaht(r.start.price)} ฿/${r.s.unit}` : "—"}
                              </td>
                              <td className={`px-6 py-4 text-right font-semibold tabular-nums ${r.change === null ? "text-teal-900/60" : changeTone(r.change)}`}>
                                {r.change === null ? "—" : `${changeArrow(r.change)}${fmtPct(r.change)}`}
                              </td>
                              <td className="px-6 py-4 text-teal-950">
                                {r.cheapest ? (
                                  <>
                                    {r.cheapest.name}
                                    <span className="ml-2 text-teal-900/60">{fmtBaht(r.cheapest.price)} ฿</span>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {rangeValid &&
                  series.map((s, i) => {
                    const suppliers = supplierRows(selected[i], from, to);
                    return (
                      <section key={s.key} className="rounded-2xl border border-teal-100 bg-white shadow-card">
                        <div className="flex items-center gap-2.5 border-b border-teal-100 px-6 py-4">
                          <Dot color={s.color} />
                          <h2 className="text-lg font-semibold text-teal-950">Suppliers for {s.label}</h2>
                        </div>
                        {suppliers.length === 0 ? (
                          <p className="px-6 py-5 text-sm text-teal-900/65">No supplier sold you {s.label} in this period.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left text-sm">
                              <thead>
                                <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                                  <th className="px-6 py-3">Supplier</th>
                                  <th className="px-6 py-3 text-right">Latest price</th>
                                  <th className="px-6 py-3">Last bought</th>
                                  <th className="px-6 py-3 text-right">Change</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-teal-100">
                                {suppliers.map((sup, idx) => {
                                  const change = sup.previous === null ? null : round1(pctChange(sup.price, sup.previous));
                                  return (
                                    <tr key={sup.name} className="transition hover:bg-teal-50/60">
                                      <td className="px-6 py-4 font-medium text-teal-950">
                                        {sup.name}
                                        {idx === 0 && suppliers.length > 1 && (
                                          <span className="ml-2 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                                            Best price
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">
                                        {fmtBaht(sup.price)} ฿/{s.unit}
                                      </td>
                                      <td className="px-6 py-4 text-teal-900/70">{fmtLong(sup.date)}</td>
                                      <td
                                        className={`px-6 py-4 text-right font-semibold tabular-nums ${change === null ? "text-teal-900/60" : changeTone(change)}`}
                                        title={sup.previous === null ? undefined : `Previously ${fmtBaht(sup.previous)} ฿/${s.unit}`}
                                      >
                                        {change === null ? "First purchase" : `${changeArrow(change)}${fmtPct(change)}`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    );
                  })}
              </div>

              <aside aria-label="Price alerts" className="rounded-2xl border border-red-200 bg-white p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                  Price alerts
                </h2>
                {alerts.length === 0 ? (
                  <p className="mt-4 text-sm text-teal-900/65">No price alerts right now.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {alerts.map((a) => (
                      <li key={`${a.product}-${a.supplier}-${a.change}`} className="rounded-xl border border-red-100 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">
                          {a.product} {a.change}
                        </p>
                        <p className="mt-1 text-xs text-red-900/70">
                          {a.supplier}: {fmtBaht(a.from)} → {fmtBaht(a.to)} ฿/{a.unit}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
