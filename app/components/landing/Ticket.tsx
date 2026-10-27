import type { LandingCopy } from "../../../lib/landingCopy";

const fmt = (n: number) => n.toLocaleString("en-US");

// An example day: 18,450 in, 3,820 + 1,150 + 1,260 = 6,230 out, 12,220 left.
const SALES = 18450;
const INVOICES = [3820, 1150, 1260];
const LEFT = SALES - INVOICES.reduce((a, b) => a + b, 0);

/**
 * A thermal-paper ticket with an example day. The one animated moment of the page: it prints once
 * when the page loads (and not at all for people who ask for reduced motion).
 */
export default function Ticket({ copy, className = "" }: { copy: LandingCopy["ticket"]; className?: string }) {
  return (
    <div className={className} style={{ filter: "drop-shadow(0 14px 22px rgba(5, 46, 51, 0.2))" }}>
      <div
        className="animate-print bg-paper px-5 pb-9 pt-5 text-teal-950"
        style={{
          WebkitMask: "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 16px 100%",
          mask: "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 16px 100%",
        }}
      >
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold">{copy.heading}</p>
          <p className="text-xs text-teal-900/60">{copy.example}</p>
        </div>

        <div className="mt-3 border-t border-dashed border-teal-950/30" />

        <ul className="num mt-3 space-y-2 text-sm">
          <Row label={copy.sales} value={`+${fmt(SALES)}`} tone="in" />
        </ul>

        <p className="mt-4 text-xs font-medium text-teal-900/60">{copy.outLabel}</p>
        <ul className="num mt-1.5 space-y-2 text-sm">
          {copy.suppliers.map((name, i) => (
            <Row key={name} label={name} value={`−${fmt(INVOICES[i])}`} tone="out" />
          ))}
        </ul>

        <div className="mt-4 border-t border-dashed border-teal-950/30" />
        <div className="num mt-3">
          <p className="text-sm font-semibold">{copy.left}</p>
          <p className="mt-0.5 whitespace-nowrap text-right text-3xl font-bold text-teal-700">{fmt(LEFT)} ฿</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "in" | "out" }) {
  return (
    <li className="flex items-baseline gap-2">
      <span>{label}</span>
      <span aria-hidden className="min-w-4 flex-1 border-b border-dotted border-teal-950/25" />
      <span className={tone === "in" ? "font-semibold text-teal-700" : "font-semibold text-crimson-600"}>{value}</span>
    </li>
  );
}
