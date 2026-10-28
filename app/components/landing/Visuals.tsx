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

export const STEP_COLORS = [TEAL, GOLD, CHILI];

type StepUi = { product: string; qty: string; price: string; read: string; check: string; sales: string; purchases: string; result: string; confirm: string; invoice: string };

/** Steps: a connected story. The same invoice (Makro, 2,229 ฿) goes from photo → read lines → day result. */
export function StepVisual({ i, tag, ui }: { i: number; tag: string; ui: StepUi }) {
  const c = STEP_COLORS[i];
  const lines: [string, string, string][] = [
    ["Milk 1L", "12", "684"],
    ["Eggs", "30", "255"],
    ["Olive oil 5L", "1", "1,290"],
  ];
  return (
    <div
      className="relative flex h-[22.5rem] flex-col overflow-hidden rounded-2xl border p-4"
      style={{ borderColor: `${c}40`, background: `radial-gradient(circle at 50% 0%, ${c}28, #031B1C 75%)` }}
    >
      <span className="inline-block rounded-full px-3 py-1 font-plex text-[11px] font-bold text-[#031B1C]" style={{ background: c }}>
        {tag}
      </span>
      <div className="mt-3 flex flex-1 items-center justify-center">
        {i === 0 && (
          <div className="relative w-52 rounded-[26px] border-2 bg-[#031B1C] p-3 pb-9" style={{ borderColor: c }}>
            <div className="relative rounded-lg bg-[#F4EBD8] p-3 text-[#031B1C]">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-extrabold">MAKRO</span>
                <span className="font-plex text-[9px] tracking-widest">{ui.invoice}</span>
              </div>
              <div className="mt-2 space-y-1.5 border-t border-[#031B1C]/20 pt-2 font-plex text-[10px]">
                {lines.map(([n, q, v]) => (
                  <div key={n} className="flex justify-between">
                    <span>{n} ×{q}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-[#031B1C]/20 pt-1.5 font-plex text-[11px] font-bold">
                <span>TOTAL</span>
                <span>2,229</span>
              </div>
              <div className="absolute inset-x-0 h-0.5 animate-[scan_2.6s_ease-in-out_infinite]" style={{ background: c, boxShadow: `0 0 12px 3px ${c}` }} />
            </div>
            {[["left-1.5 top-1.5", "border-l-2 border-t-2"], ["right-1.5 top-1.5", "border-r-2 border-t-2"], ["left-1.5 bottom-10", "border-l-2 border-b-2"], ["right-1.5 bottom-10", "border-r-2 border-b-2"]].map(([pos, b]) => (
              <span key={pos} className={`absolute h-4 w-4 ${pos} ${b}`} style={{ borderColor: c }} />
            ))}
            <span className="absolute bottom-2 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#F4EBD8]/80">
              <span className="h-4 w-4 rounded-full" style={{ background: GOLD }} />
            </span>
          </div>
        )}
        {i === 1 && (
          <div className="w-full max-w-xs">
            <p className="mb-2 font-plex text-[11px] text-[#F4EBD8]/70">MAKRO · {ui.read}</p>
            <div className="overflow-hidden rounded-xl bg-[#031B1C] text-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3.5 py-2 font-plex text-[10px] tracking-wider text-[#F4EBD8]/50">
                <span>{ui.product.toUpperCase()}</span>
                <span>{ui.qty.toUpperCase()}</span>
                <span className="w-14 text-right">{ui.price.toUpperCase()}</span>
              </div>
              {lines.map(([n, q, v], k) => (
                <div
                  key={n}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-t border-[#F4EBD8]/10 px-3.5 py-2.5"
                  style={k === 2 ? { background: `${c}22` } : undefined}
                >
                  <span>{n}</span>
                  <span className="text-[#F4EBD8]/70">{q}</span>
                  <span className="w-14 text-right font-bold">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: `${c}22`, color: c }}>
              ⚠ Olive oil 5L · {ui.check}
            </p>
            <div className="mt-2 rounded-xl py-2.5 text-center font-display font-bold text-[#031B1C]" style={{ background: TEAL }}>
              ✓ {ui.confirm}
            </div>
          </div>
        )}
        {i === 2 && (
          <div className="w-full max-w-xs space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-[#031B1C] px-4 py-3">
              <span className="text-sm text-[#F4EBD8]/75">{ui.sales}</span>
              <span className="font-bold text-[#19D3B5]">+12,220 ฿</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#031B1C] px-4 py-3">
              <span className="text-sm text-[#F4EBD8]/75">{ui.purchases}</span>
              <span className="font-bold" style={{ color: CHILI }}>−2,229 ฿</span>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: `${GOLD}22`, border: `1.5px solid ${GOLD}` }}>
              <p className="text-xs text-[#F4EBD8]/75">{ui.result}</p>
              <p className="font-display text-3xl font-extrabold" style={{ color: GOLD }}>9,991 ฿</p>
            </div>
          </div>
        )}
      </div>
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
