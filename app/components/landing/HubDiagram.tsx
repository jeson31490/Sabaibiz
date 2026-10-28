import type { L2 } from "../../../lib/landing2";
import { SabaiCurve } from "./SabaiMark";

const SRC_Y = [60, 160, 260, 360];
const OUT_Y = [60, 160, 260, 360];

/** Small generic icons (24×24), drawn in teal. Loyverse uses its real logo (live integration); no third-party logos otherwise. */
function SourceIcon({ i, x, y }: { i: number; x: number; y: number }) {
  const common = { fill: "none", stroke: "#19D3B5", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${x} ${y - 12})`}>
      {i === 0 && (
        <g {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M15 3v4h4M9 12h7M9 15.500h7M9 9h3" />
        </g>
      )}
      {i === 1 && (
        <g>
          <rect x="-2" y="-2" width="28" height="28" rx="7" fill="#fff" />
          <image href="/brand/loyverse.png" x="1" y="0" width="22" height="24" preserveAspectRatio="xMidYMid meet" />
        </g>
      )}
      {i === 2 && (
        <g {...common}>
          <path d="M5 8h14l-1 12H6z" />
          <path d="M9 8V6.500a3 3 0 0 1 6 0V8" />
        </g>
      )}
      {i === 3 && (
        <g {...common}>
          <path d="M4 5h16v11H11l-4 4v-4H4z" />
          <path d="M8 9.500h8M8 12.500h5" />
        </g>
      )}
    </g>
  );
}

/** Sources flow into the Sabai sphere; the answers flow out. Desktop: animated SVG. Mobile: stacked chips. */
export default function HubDiagram({ t }: { t: L2["hub"] }) {
  const sources = [t.invoice, t.till, t.grab, t.line];
  const outputs = [
    { a: t.today, b: "12,220 ฿", c: "#E8B94A" },
    { a: t.alert, b: t.alertV, c: "#FF8A6E" },
    { a: t.margin, b: t.marginV, c: "#19D3B5" },
    { a: t.archive, b: "", c: "#F4EBD8" },
  ];
  return (
    <div>
      <svg viewBox="0 0 900 440" className="hidden w-full md:block" role="img" aria-label="SabaiBiz">
        <defs>
          <radialGradient id="sphere" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#1E5F5B" />
            <stop offset="0.6" stopColor="#0B3A3A" />
            <stop offset="1" stopColor="#031B1C" />
          </radialGradient>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#19D3B5" />
            <stop offset="1" stopColor="#E8B94A" />
          </linearGradient>
        </defs>
        {SRC_Y.map((y, i) => {
          const d = `M215 ${y} C 330 ${y}, 340 220, 395 220`;
          return (
            <g key={`s${i}`}>
              <path d={d} fill="none" stroke="#19D3B5" strokeOpacity="0.35" strokeWidth="1.500" />
              <circle r="4" fill="#19D3B5">
                <animateMotion dur={`${3 + i * 0.4}s`} repeatCount="indefinite" path={d} />
              </circle>
            </g>
          );
        })}
        {OUT_Y.map((y, i) => {
          const d = `M505 220 C 560 220, 570 ${y}, 685 ${y}`;
          return (
            <g key={`o${i}`}>
              <path d={d} fill="none" stroke={outputs[i].c} strokeOpacity="0.4" strokeWidth="1.500" />
              <circle r="4" fill={outputs[i].c}>
                <animateMotion dur={`${3.200 + i * 0.3}s`} repeatCount="indefinite" path={d} />
              </circle>
            </g>
          );
        })}
        {sources.map((s, i) => {
          const [title, sub] = s.split("|");
          return (
            <g key={s}>
              <rect x="20" y={SRC_Y[i] - 26} width="195" height="52" rx="14" fill="#072A2B" stroke="#19D3B5" strokeOpacity="0.4" />
              <SourceIcon i={i} x={34} y={SRC_Y[i]} />
              <text x="72" y={SRC_Y[i] + (sub ? -2 : 5)} fill="#F4EBD8" fontSize="15" fontFamily="var(--font-plex), monospace">
                {title}
              </text>
              {sub && (
                <text x="72" y={SRC_Y[i] + 15} fill="#F4EBD8" fillOpacity="0.65" fontSize="11.500" fontFamily="var(--font-plex), monospace">
                  {sub}
                </text>
              )}
            </g>
          );
        })}
        {outputs.map((o, i) => (
          <g key={o.a}>
            <rect x="685" y={OUT_Y[i] - 30} width="200" height="60" rx="14" fill="#072A2B" stroke={o.c} strokeOpacity="0.55" />
            <text x="701" y={OUT_Y[i] - 8} fill="#F4EBD8" fillOpacity="0.7" fontSize="12" fontFamily="var(--font-plex), monospace">
              {o.a}
            </text>
            {o.b && (
              <text x="701" y={OUT_Y[i] + 16} fill={o.c} fontSize="19" fontWeight="700" fontFamily="var(--font-display), sans-serif">
                {o.b}
              </text>
            )}
          </g>
        ))}
        <circle cx="450" cy="220" r="82" fill="none" stroke="url(#ring)" strokeOpacity="0.5" strokeWidth="1.500" strokeDasharray="3 7">
          <animateTransform attributeName="transform" type="rotate" from="0 450 220" to="360 450 220" dur="40s" repeatCount="indefinite" />
        </circle>
        <circle cx="450" cy="220" r="66" fill="url(#sphere)" stroke="url(#ring)" strokeWidth="2" />
        <g transform="translate(416 168)">
          <SabaiCurve size={68} id="hub" />
        </g>
        <text x="450" y="262" textAnchor="middle" fill="#F4EBD8" fontSize="15" fontWeight="700" fontFamily="Prompt, sans-serif" letterSpacing="-0.4">
          Sabai<tspan fill="#F2B84B">Biz</tspan>
        </text>
      </svg>

      <div className="flex flex-col items-center gap-3 md:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          {sources.map((s) => (
            <span key={s} className="rounded-full border border-[#19D3B5]/40 bg-[#072A2B] px-3 py-1.5 font-plex text-xs text-[#F4EBD8]">
              {s.replace("|", " (") + (s.includes("|") ? ")" : "")}
            </span>
          ))}
        </div>
        <span className="text-[#19D3B5]">▼</span>
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-[#19D3B5] bg-[radial-gradient(circle_at_38%_32%,#1E5F5B,#031B1C)]">
          <SabaiCurve size={40} id="hubm" />
          <span className="mt-1 text-sm font-bold tracking-tight text-[#F4EBD8]">Sabai<span className="text-[#F2B84B]">Biz</span></span>
        </div>
        <span className="text-[#E8B94A]">▼</span>
        <div className="grid w-full grid-cols-2 gap-2">
          {outputs.map((o) => (
            <div key={o.a} className="rounded-xl border bg-[#072A2B] p-3" style={{ borderColor: `${o.c}88` }}>
              <p className="font-plex text-[11px] text-[#F4EBD8]/70">{o.a}</p>
              {o.b && (
                <p className="font-display text-lg font-bold" style={{ color: o.c }}>
                  {o.b}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
