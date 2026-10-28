/** The SabaiBiz logo: a growth curve (teal to gold) rising to a gold point, on a dark rounded tile. Drawn in SVG so the page needs no image. */
export default function SabaiMark({ size = 36, id = "m" }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`t-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f5553" />
          <stop offset="1" stopColor="#031b1c" />
        </linearGradient>
        <linearGradient id={`l-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#19c7b5" />
          <stop offset="1" stopColor="#f7cf6c" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="118" height="118" rx="30" fill={`url(#t-${id})`} stroke="#1f7a75" strokeWidth="2" />
      <path d="M20 76 H100 M20 52 H100" fill="none" stroke="#1c5553" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 100 H100" fill="none" stroke="#3a807c" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 86 C62 86 58 34 100 34" fill="none" stroke={`url(#l-${id})`} strokeWidth="10" strokeLinecap="round" />
      <circle cx="100" cy="34" r="15" fill="#f2b84b" opacity="0.25" />
      <circle cx="100" cy="34" r="9" fill="#f2b84b" />
    </svg>
  );
}

/** The curve and its gold point without the tile, for sitting on a dark sphere. */
export function SabaiCurve({ size = 60, id = "c" }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="10 20 110 90" aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`cl-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#19c7b5" />
          <stop offset="1" stopColor="#f7cf6c" />
        </linearGradient>
      </defs>
      <path d="M20 86 C62 86 58 34 100 34" fill="none" stroke={`url(#cl-${id})`} strokeWidth="10" strokeLinecap="round" />
      <circle cx="100" cy="34" r="15" fill="#f2b84b" opacity="0.25" />
      <circle cx="100" cy="34" r="9" fill="#f2b84b" />
    </svg>
  );
}

/** Logo + name, as in the brand pack: "Sabai" in cream (Prompt SemiBold), "Biz" in gold (Prompt Bold). */
export function Wordmark({ size = 34, id = "w", className = "text-xl" }: { size?: number; id?: string; className?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <SabaiMark size={size} id={id} />
      <span className={`font-sans leading-none tracking-[-0.03em] ${className}`}>
        <span className="font-semibold">Sabai</span>
        <span className="font-bold text-[#F2B84B]">Biz</span>
      </span>
    </span>
  );
}
