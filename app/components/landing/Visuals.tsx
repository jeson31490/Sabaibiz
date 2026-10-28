// Small illustrated mock-ups for the landing page. Language-neutral on purpose (numbers, ฿, short product names).
const TEAL = "#19D3B5";
const GOLD = "#E8B94A";
const CHILI = "#FF8A6E";
const CREAM = "#F4EBD8";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-[#19D3B5]/25 bg-[#072A2B] p-5 shadow-[0_20px_60px_-20px_rgba(25,211,181,0.35)] ${className}`}>{children}</div>;
}

/** Invoices: a photo being read, lines filling in. */
function InvoiceVisual() {
  const rows = [
    ["Milk 1L ×12", "684"],
    ["Eggs ×30", "255"],
    ["Olive oil 5L", "1,290"],
  ];
  return (
    <Card>
      <div className="flex gap-4">
        <div className="relative h-36 w-28 flex-none overflow-hidden rounded-xl bg-[#F4EBD8] p-2.5 text-[#031B1C]">
          <div className="h-2 w-12 rounded bg-[#031B1C]/70" />
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="mt-2 h-1.5 rounded bg-[#031B1C]/25" style={{ width: `${95 - (n % 3) * 18}%` }} />
          ))}
          <div className="absolute inset-x-0 h-0.5 animate-[scan_2.6s_ease-in-out_infinite] bg-[#19D3B5] shadow-[0_0_12px_3px_#19D3B5]" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-plex text-[11px] tracking-widest text-[#19D3B5]">MAKRO · 14/10</p>
          {rows.map(([a, b]) => (
            <div key={a} className="flex items-center justify-between gap-2 rounded-lg bg-[#031B1C] px-3 py-2 text-sm">
              <span className="truncate">{a}</span>
              <span className="font-semibold text-[#E8B94A]">{b} ฿</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#19D3B5] px-4 py-3 font-display font-bold text-[#031B1C]">
        <span>✓ OK</span>
        <span>2,229 ฿</span>
      </div>
    </Card>
  );
}

/** Prices: a rising line and an alert chip. */
function PriceVisual() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-bold">Olive oil 5L</p>
        <span className="rounded-full bg-[#FF8A6E]/20 px-3 py-1 font-plex text-xs font-bold text-[#FF8A6E]">▲ 9%</span>
      </div>
      <svg viewBox="0 0 300 120" className="mt-3 w-full" aria-hidden>
        <defs>
          <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={CHILI} stopOpacity="0.4" />
            <stop offset="1" stopColor={CHILI} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 90 L50 86 L100 88 L150 80 L200 78 L250 40 L300 28 L300 120 L0 120Z" fill="url(#pv)" />
        <path d="M0 90 L50 86 L100 88 L150 80 L200 78 L250 40 L300 28" fill="none" stroke={CHILI} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="300" cy="28" r="6" fill={CHILI} />
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-[#031B1C] p-3">
          <p className="text-[#F4EBD8]/60">Supplier A</p>
          <p className="font-bold text-[#FF8A6E]">1,290 ฿</p>
        </div>
        <div className="rounded-xl bg-[#031B1C] p-3">
          <p className="text-[#F4EBD8]/60">Supplier B</p>
          <p className="font-bold text-[#19D3B5]">1,180 ฿</p>
        </div>
      </div>
    </Card>
  );
}

/** Margins: bars per product. */
function MarginVisual() {
  const rows: [string, number, string][] = [
    ["Latte", 74, TEAL],
    ["Pad Thai", 62, GOLD],
    ["Linen shirt", 68, TEAL],
    ["Cheesecake", 41, CHILI],
  ];
  return (
    <Card>
      <p className="font-plex text-[11px] tracking-widest text-[#F4EBD8]/60">MARGIN</p>
      <div className="mt-3 space-y-3">
        {rows.map(([n, v, c]) => (
          <div key={n}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{n}</span>
              <span className="font-bold" style={{ color: c }}>
                {v}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#031B1C]">
              <div className="h-full rounded-full" style={{ width: `${v}%`, background: c }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Team: avatars, clock-in status. */
function TeamVisual() {
  const people: [string, string, string, string][] = [
    ["N", "08:02", "in", TEAL],
    ["P", "08:15", "in", TEAL],
    ["K", "—", "off", CREAM],
    ["M", "09:40", "late", GOLD],
  ];
  return (
    <Card>
      <p className="font-plex text-[11px] tracking-widest text-[#F4EBD8]/60">TODAY</p>
      <ul className="mt-3 space-y-2">
        {people.map(([n, time, st, c]) => (
          <li key={n} className="flex items-center gap-3 rounded-xl bg-[#031B1C] px-3 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full font-display font-bold text-[#031B1C]" style={{ background: c }}>
              {n}
            </span>
            <span className="flex-1 font-plex text-sm">{time}</span>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: st === "off" ? "#F4EBD855" : c }} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

const TABS = [InvoiceVisual, PriceVisual, MarginVisual, TeamVisual];
export function TabVisual({ i }: { i: number }) {
  const V = TABS[i] ?? InvoiceVisual;
  return <V />;
}

/** Steps: camera, check, number. */
export function StepVisual({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className="relative mx-auto flex h-36 w-28 items-center justify-center rounded-3xl border-2 border-[#19D3B5] bg-[#031B1C]">
        <div className="h-20 w-16 rounded-lg bg-[#F4EBD8] p-1.5">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="mt-1.5 h-1 rounded bg-[#031B1C]/30" />
          ))}
        </div>
        <span className="absolute -bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#E8B94A] text-[#031B1C]">●</span>
      </div>
    );
  if (i === 1)
    return (
      <div className="mx-auto w-48 space-y-2">
        {["Milk", "Eggs", "Oil"].map((x, n) => (
          <div key={x} className="flex items-center justify-between rounded-lg bg-[#031B1C] px-3 py-2 text-sm">
            <span>{x}</span>
            <span className={n === 2 ? "text-[#E8B94A]" : "text-[#19D3B5]"}>{n === 2 ? "✎" : "✓"}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="mx-auto w-48 rounded-2xl bg-[#031B1C] p-4 text-center">
      <p className="font-plex text-[11px] tracking-widest text-[#F4EBD8]/60">12/10</p>
      <p className="font-display text-3xl font-extrabold text-[#E8B94A]">12,220 ฿</p>
      <p className="mt-1 text-sm font-bold text-[#19D3B5]">▲ +8%</p>
    </div>
  );
}

const WHY_ICONS = [
  <path key="0" d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7z" />, // camera
  <path key="1" d="M3 17l5-5 4 4 8-9M15 7h5v5" />, // trend
  <path key="2" d="M12 3v18M16.500 7.500C16.500 6 14.500 5 12 5S7.500 6 7.500 8s2 2.500 4.500 3 4.500 1 4.500 3-2 3-4.500 3-4.500-1-4.500-2.500" />, // baht/coin
  <path key="3" d="M12 3l2.500 5.500L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.500-.5z" />, // star
  <path key="4" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 12a2.500 2.500 0 1 0 0-5M3 20c0-3 2.500-5 5-5s5 2 5 5M15 15c3 0 6 1 6 5" />, // people
  <path key="5" d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" />, // lock
];
const WHY_COLORS = [TEAL, CHILI, GOLD, TEAL, GOLD, CHILI];
export function WhyIcon({ i }: { i: number }) {
  const c = WHY_COLORS[i % 6];
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${c}22`, boxShadow: `0 0 30px -8px ${c}` }}>
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {WHY_ICONS[i % 6]}
      </svg>
    </span>
  );
}
export const whyColor = (i: number) => WHY_COLORS[i % 6];
