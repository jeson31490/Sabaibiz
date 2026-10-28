/** The Sabai S-ribbon, teal to gold. Drawn in SVG so the page needs no image. */
export default function SabaiMark({ size = 36, id = "m" }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#19D3B5" />
          <stop offset="1" stopColor="#E8B94A" />
        </linearGradient>
      </defs>
      <path
        d="M34 11c-3-3-7-4-11-4-7 0-12 4-12 9.5 0 5.5 5 7.5 12 9 6 1.3 9.500 2.700 9.500 6.500 0 3.600-3.700 6-8.500 6-4.500 0-8.500-1.800-11.500-5"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="6.500"
        strokeLinecap="round"
      />
    </svg>
  );
}
