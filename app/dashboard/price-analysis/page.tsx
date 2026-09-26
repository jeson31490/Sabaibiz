"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import DashboardNavbar from "../../components/DashboardNavbar";
import { inputClass, labelClass } from "../../components/FormField";

// Fixed "today" for the placeholder data; real prices come from Supabase later.
const TODAY = new Date(2026, 8, 26);
const DAY_MS = 86_400_000;
const MAX_DAYS_BACK = 180;

type Product = {
  unit: string;
  color: string; // each product keeps this color everywhere it appears
  monthly: number[]; // Apr..Sep, the last value is today's price
  extraAnchors?: { day: number; value: number }[]; // day offsets from today (negative)
  suppliers: { name: string; price: number; previous: number }[];
};

// Teal and gold lead (brand); the other three are only used for extra products.
const PRODUCTS: Record<string, Product> = {
  "Chicken breast": {
    unit: "kg",
    color: "#0f766e",
    monthly: [118, 121, 119, 126, 131, 147],
    extraAnchors: [{ day: -7, value: 131 }],
    suppliers: [
      { name: "Chaweng Fresh Market", price: 147, previous: 131 },
      { name: "Makro Samui", price: 152, previous: 149 },
      { name: "Lamai Meat Supply", price: 139, previous: 141 },
    ],
  },
  "Pork belly": {
    unit: "kg",
    color: "#b45309",
    monthly: [188, 190, 186, 192, 195, 193],
    suppliers: [
      { name: "Lamai Meat Supply", price: 193, previous: 195 },
      { name: "Makro Samui", price: 198, previous: 196 },
      { name: "Chaweng Fresh Market", price: 201, previous: 201 },
    ],
  },
  "Tiger shrimp": {
    unit: "kg",
    color: "#2563eb",
    monthly: [420, 435, 450, 445, 470, 508],
    suppliers: [
      { name: "Samui Seafood Co.", price: 508, previous: 470 },
      { name: "Chaweng Fresh Market", price: 520, previous: 500 },
      { name: "Makro Samui", price: 495, previous: 498 },
    ],
  },
  "Cooking oil": {
    unit: "litre",
    color: "#7c3aed",
    monthly: [52, 52, 54, 55, 58, 61],
    suppliers: [
      { name: "Makro Samui", price: 61, previous: 58 },
      { name: "Chaweng Fresh Market", price: 63, previous: 62 },
      { name: "Lotus's Samui", price: 59, previous: 60 },
    ],
  },
  "Jasmine rice": {
    unit: "kg",
    color: "#db2777",
    monthly: [34, 34, 35, 35, 36, 36],
    suppliers: [
      { name: "Makro Samui", price: 36, previous: 36 },
      { name: "Lotus's Samui", price: 35, previous: 36 },
      { name: "Chaweng Fresh Market", price: 38, previous: 37 },
    ],
  },
};
const NAMES = Object.keys(PRODUCTS);

const ALERTS = [
  { title: "Chicken +12% this week", detail: "Chaweng Fresh Market: 131 → 147 ฿/kg" },
  { title: "Tiger shrimp +8% this month", detail: "Samui Seafood Co.: 470 → 508 ฿/kg" },
  { title: "Cooking oil +5% this month", detail: "Makro Samui: 58 → 61 ฿/litre" },
];

const PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "3m", label: "Last 3 months", days: 90 },
  { id: "6m", label: "Last 6 months", days: 180 },
  { id: "custom", label: "Custom range", days: 0 },
] as const;
type PresetId = (typeof PRESETS)[number]["id"];

/* ------------------------------ data helpers ------------------------------ */

function priceAt(p: Product, offset: number, seed: number) {
  // Anchors: monthly prices every 30 days ending today, one extrapolated point at -180.
  const m = p.monthly;
  const anchors = [
    { day: -180, value: 2 * m[0] - m[1] },
    ...m.map((value, i) => ({ day: -150 + i * 30, value })),
    ...(p.extraAnchors ?? []),
  ].sort((a, b) => a.day - b.day);

  let i = 0;
  while (i < anchors.length - 2 && offset > anchors[i + 1].day) i++;
  const a = anchors[i];
  const b = anchors[i + 1];
  const t = (offset - a.day) / (b.day - a.day);
  const base = a.value + (b.value - a.value) * t;
  // Small deterministic wiggle that vanishes on anchor days, so anchor prices stay exact.
  const wiggle = 0.006 * base * Math.sin(offset * 1.7 + seed) * Math.sin(Math.PI * t);
  return Math.round((base + wiggle) * 10) / 10;
}

const seedOf = (name: string) => NAMES.indexOf(name) * 2.3;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmtShort = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtLong = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dayOffset = (d: Date) => Math.round((d.getTime() - TODAY.getTime()) / DAY_MS);

function niceTicks(lo: number, hi: number) {
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.1);
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? mag * 10;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
}

const pctChange = (now: number, before: number) => ((now - before) / before) * 100;
const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

/* ------------------------------ product dropdown ------------------------------ */

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-3 w-3 flex-none rounded-full" style={{ backgroundColor: color }} />;
}

function ProductSelect({
  id,
  label,
  value,
  onChange,
  exclude,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (name: string) => void;
  exclude?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const options = NAMES.filter((n) => n !== exclude);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function openList() {
    setActive(Math.max(0, options.indexOf(value)));
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
      onChange(options[active]);
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
        <Dot color={PRODUCTS[value].color} />
        <span className="flex-1">{value}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-teal-700" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-teal-200 bg-white py-1 shadow-soft"
        >
          {options.map((n, i) => (
            <li
              key={n}
              role="option"
              aria-selected={n === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-teal-950 ${
                i === active ? "bg-teal-50" : ""
              } ${n === value ? "font-semibold" : ""}`}
            >
              <Dot color={PRODUCTS[n].color} />
              {n}
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
const PAD = { l: 52, r: 24, t: 16, b: 32 };

type Series = { name: string; unit: string; color: string; prices: number[] };

function PriceChart({ dates, series }: { dates: Date[]; series: Series[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const compare = series.length > 1;
  const n = dates.length;

  // One product plots real prices; two products of different scale plot % change since the start.
  const lines = series.map((s) => ({
    ...s,
    values: compare ? s.prices.map((p) => pctChange(p, s.prices[0])) : s.prices,
  }));
  const all = lines.flatMap((l) => l.values);
  const { min, max, ticks } = niceTicks(Math.min(...all), Math.max(...all));

  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const xLabels = Array.from({ length: Math.min(6, n) }, (_, k) => Math.round((k / (Math.min(6, n) - 1)) * (n - 1)));
  const showMarkers = n <= 31;
  const fmtTick = (t: number) => (compare ? `${t > 0 ? "+" : ""}${t}%` : String(t));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  }

  const label = lines
    .map((l) => `${l.name} from ${l.prices[0]} to ${l.prices[n - 1]} baht per ${l.unit}`)
    .join("; ");

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y"
        role="img"
        aria-label={`${compare ? "Percent change since start of period. " : ""}${label}`}
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
        {xLabels.map((i, k) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={k === 0 ? "start" : k === xLabels.length - 1 ? "end" : "middle"}
            className="fill-teal-900/65 text-[11px]"
          >
            {fmtShort(dates[i])}
          </text>
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="stroke-teal-300" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {lines.map((l) => (
          <g key={l.name}>
            <path
              d={l.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={l.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {(showMarkers ? l.values.map((_, i) => i) : []).map((i) => (
              <circle key={i} cx={x(i)} cy={y(l.values[i])} r={4} fill={l.color} stroke="white" strokeWidth={2} />
            ))}
            <circle cx={x(n - 1)} cy={y(l.values[n - 1])} r={4.5} fill={l.color} stroke="white" strokeWidth={2} />
            {hover !== null && (
              <circle cx={x(hover)} cy={y(l.values[hover])} r={5} fill={l.color} stroke="white" strokeWidth={2} />
            )}
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg bg-teal-950 px-3 py-2 text-xs text-white shadow-soft"
          style={{ left: `${Math.max(14, Math.min(86, (x(hover) / W) * 100))}%` }}
        >
          <p className="font-semibold">{fmtLong(dates[hover])}</p>
          {lines.map((l) => (
            <p key={l.name} className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.name}: {l.prices[hover]} ฿/{l.unit}
              {compare && ` (${fmtPct(round1(l.values[hover]))})`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export default function PriceAnalysisPage() {
  const [first, setFirst] = useState(NAMES[0]);
  const [second, setSecond] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetId>("6m");
  const [from, setFrom] = useState(toIso(addDays(TODAY, -14)));
  const [to, setTo] = useState(toIso(TODAY));

  const minIso = toIso(addDays(TODAY, -MAX_DAYS_BACK));
  const maxIso = toIso(TODAY);

  // Day offsets (from today) covered by the chosen period.
  let startOffset: number;
  let endOffset = 0;
  if (preset === "custom") {
    startOffset = dayOffset(fromIso(from || maxIso));
    endOffset = dayOffset(fromIso(to || maxIso));
  } else {
    startOffset = -(PRESETS.find((p) => p.id === preset)?.days ?? 180);
  }
  const rangeValid =
    startOffset >= -MAX_DAYS_BACK && endOffset <= 0 && endOffset - startOffset >= 1;

  const selected = second ? [first, second] : [first];

  const { dates, series } = useMemo(() => {
    if (!rangeValid) return { dates: [] as Date[], series: [] as Series[] };
    const offsets = Array.from({ length: endOffset - startOffset + 1 }, (_, i) => startOffset + i);
    return {
      dates: offsets.map((o) => addDays(TODAY, o)),
      series: selected.map((name) => ({
        name,
        unit: PRODUCTS[name].unit,
        color: PRODUCTS[name].color,
        prices: offsets.map((o) => priceAt(PRODUCTS[name], o, seedOf(name))),
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeValid, startOffset, endOffset, first, second]);

  const comparison = selected.length === 2
    ? selected.map((name) => {
        const p = PRODUCTS[name];
        const now = priceAt(p, 0, seedOf(name));
        const before = priceAt(p, -30, seedOf(name));
        const cheapest = [...p.suppliers].sort((a, b) => a.price - b.price)[0];
        return { name, p, now, before, change: round1(pctChange(now, before)), cheapest };
      })
    : null;

  return (
    <div className="min-h-screen bg-teal-50/60 pb-16">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Price Analysis</h1>

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
                <input id="from" type="date" min={minIso} max={maxIso} value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="to" className={labelClass}>
                  To
                </label>
                <input id="to" type="date" min={minIso} max={maxIso} value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-full sm:w-64">
                  <ProductSelect id="product-1" label="Product" value={first} onChange={setFirst} exclude={second} />
                </div>
                {second ? (
                  <>
                    <div className="w-full sm:w-64">
                      <ProductSelect id="product-2" label="Compare with" value={second} onChange={setSecond} exclude={first} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSecond(null)}
                      className="rounded-full border border-teal-200 px-5 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                    >
                      Remove comparison
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSecond(NAMES.find((n) => n !== first) ?? null)}
                    className="rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-teal-800"
                  >
                    Compare with another product
                  </button>
                )}
              </div>

              <h2 className="mt-6 text-lg font-semibold text-teal-950">Price evolution</h2>
              <p className="mt-1 text-sm text-teal-900/65">
                {second
                  ? "Change since the start of the period, so products with different prices can be compared."
                  : `${first}, ฿ per ${PRODUCTS[first].unit}`}
                {rangeValid && ` · ${fmtLong(dates[0])} – ${fmtLong(dates[dates.length - 1])}`}
              </p>

              {second && (
                <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-teal-950" aria-label="Legend">
                  {selected.map((n) => (
                    <li key={n} className="flex items-center gap-2">
                      <Dot color={PRODUCTS[n].color} />
                      {n}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4">
                {rangeValid ? (
                  <PriceChart dates={dates} series={series} />
                ) : (
                  <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                    Pick a start date before the end date, within the last {MAX_DAYS_BACK} days.
                  </p>
                )}
              </div>
            </section>

            {comparison && (
              <section className="rounded-2xl border border-teal-100 bg-white shadow-card">
                <div className="border-b border-teal-100 px-6 py-4">
                  <h2 className="text-lg font-semibold text-teal-950">Product comparison</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                        <th className="px-6 py-3">Product</th>
                        <th className="px-6 py-3 text-right">Current price</th>
                        <th className="px-6 py-3 text-right">30 days ago</th>
                        <th className="px-6 py-3 text-right">Change</th>
                        <th className="px-6 py-3">Cheapest supplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                      {comparison.map((r) => (
                        <tr key={r.name} className="transition hover:bg-teal-50/60">
                          <td className="px-6 py-4 font-medium text-teal-950">
                            <span className="flex items-center gap-2.5">
                              <Dot color={r.p.color} />
                              {r.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">
                            {r.now} ฿/{r.p.unit}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums text-teal-900/70">
                            {r.before} ฿/{r.p.unit}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-semibold tabular-nums ${
                              r.change > 0 ? "text-red-600" : r.change < 0 ? "text-green-700" : "text-teal-900/60"
                            }`}
                          >
                            {r.change > 0 ? "▲ " : r.change < 0 ? "▼ " : ""}
                            {fmtPct(r.change)}
                          </td>
                          <td className="px-6 py-4 text-teal-950">
                            {r.cheapest.name}
                            <span className="ml-2 text-teal-900/60">{r.cheapest.price} ฿</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {selected.map((name) => {
              const p = PRODUCTS[name];
              const suppliers = [...p.suppliers].sort((a, b) => a.price - b.price);
              return (
                <section key={name} className="rounded-2xl border border-teal-100 bg-white shadow-card">
                  <div className="flex items-center gap-2.5 border-b border-teal-100 px-6 py-4">
                    <Dot color={p.color} />
                    <h2 className="text-lg font-semibold text-teal-950">Suppliers for {name}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-wide text-teal-900/55">
                          <th className="px-6 py-3">Supplier</th>
                          <th className="px-6 py-3 text-right">Current price</th>
                          <th className="px-6 py-3 text-right">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-100">
                        {suppliers.map((s, idx) => {
                          const rounded = round1(pctChange(s.price, s.previous));
                          const tone =
                            rounded > 0 ? "text-red-600" : rounded < 0 ? "text-green-700" : "text-teal-900/60";
                          return (
                            <tr key={s.name} className="transition hover:bg-teal-50/60">
                              <td className="px-6 py-4 font-medium text-teal-950">
                                {s.name}
                                {idx === 0 && (
                                  <span className="ml-2 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                                    Best price
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right font-semibold tabular-nums text-teal-950">
                                {s.price} ฿/{p.unit}
                              </td>
                              <td className={`px-6 py-4 text-right font-semibold tabular-nums ${tone}`}>
                                {rounded > 0 ? "▲ " : rounded < 0 ? "▼ " : ""}
                                {fmtPct(rounded)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
            <ul className="mt-4 space-y-3">
              {ALERTS.map((a) => (
                <li key={a.title} className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">{a.title}</p>
                  <p className="mt-1 text-xs text-red-900/70">{a.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
