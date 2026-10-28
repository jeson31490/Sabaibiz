import type { L2 } from "../../../lib/landing2";
import SabaiMark from "./SabaiMark";

const SRC_Y = [60, 160, 260, 360];
const OUT_Y = [60, 160, 260, 360];

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
      <svg viewBox="0 0 900 440" className="hidden w-full md:block" role="img" aria-label="Sabai AI">
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
        {sources.map((s, i) => (
          <g key={s}>
            <rect x="20" y={SRC_Y[i] - 26} width="195" height="52" rx="14" fill="#072A2B" stroke="#19D3B5" strokeOpacity="0.4" />
            <circle cx="42" cy={SRC_Y[i]} r="5" fill="#19D3B5" />
            <text x="58" y={SRC_Y[i] + 5} fill="#F4EBD8" fontSize="15" fontFamily="var(--font-plex), monospace">
              {s}
            </text>
          </g>
        ))}
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
        <g transform="translate(428 186)">
          <SabaiMark size={44} id="hub" />
        </g>
        <text x="450" y="262" textAnchor="middle" fill="#F4EBD8" fontSize="14" fontWeight="700" fontFamily="var(--font-display), sans-serif">
          Sabai AI
        </text>
      </svg>

      <div className="flex flex-col items-center gap-3 md:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          {sources.map((s) => (
            <span key={s} className="rounded-full border border-[#19D3B5]/40 bg-[#072A2B] px-3 py-1.5 font-plex text-xs text-[#F4EBD8]">
              {s}
            </span>
          ))}
        </div>
        <span className="text-[#19D3B5]">▼</span>
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-[#19D3B5] bg-[radial-gradient(circle_at_38%_32%,#1E5F5B,#031B1C)]">
          <SabaiMark size={40} id="hubm" />
          <span className="mt-1 font-display text-sm font-bold text-[#F4EBD8]">Sabai AI</span>
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
