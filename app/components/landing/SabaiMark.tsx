/** The SabaiBiz mark: a ribbon "S" (teal to gold). Drawn in SVG so the page needs no image. */
export default function SabaiMark({ size = 36, id = "m" }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#19D3B5" />
          <stop offset="1" stopColor="#E8B94A" />
        </linearGradient>
      </defs>
      <path
        d="M34 13C31 9.500 26.500 8 22 8C15.500 8 11.500 11.500 11.500 16C11.500 20.500 15.500 22 24 24.500C32.500 27 36.500 28.500 36.500 33C36.500 37.500 32 40.500 25.500 40.500C20.500 40.500 16 38.500 13 35"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark + name. "Sabai" in cream, "Biz" in gold. */
export function Wordmark({ size = 34, id = "w", className = "text-xl" }: { size?: number; id?: string; className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <SabaiMark size={size} id={id} />
      <span className={`font-display font-extrabold leading-none ${className}`}>
        Sabai<span className="text-[#E8B94A]">Biz</span>
      </span>
    </span>
  );
}
