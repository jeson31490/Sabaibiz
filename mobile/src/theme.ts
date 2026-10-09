export const colors = {
  teal: "#0f766e",
  tealDark: "#134e4a",
  tealDeep: "#042f2e",
  tealSoft: "#ccfbf1",
  tealMist: "#f0fdfa",
  gold: "#b45309",
  goldSoft: "#fef3c7",
  bg: "#f4faf9",
  card: "#ffffff",
  ink: "#0b2b29",
  muted: "#5b7773",
  line: "#d9e8e5",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
  ok: "#15803d",
  okSoft: "#dcfce7",
} as const;

export const radius = { card: 18, input: 12, pill: 999 } as const;

export const shadow = {
  shadowColor: "#0b2b29",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

/** 12,345 or 12,345.50, with the baht sign. */
export const baht = (n: number) =>
  `฿${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
