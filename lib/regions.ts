// Price zones and country detection for the public pages.
// The country (read from the visitor's IP) only *suggests* a language and a price zone: a VPN can change it,
// so the zone that is actually charged will be decided by the billing country at checkout (when payments go live).
import type { Lang } from "./landingCopy";
import type { CycleId, PlanId } from "./plans";
import { CYCLES } from "./plans";

export type ZoneId = "th" | "eu" | "au" | "intl";

export const ZONES: Record<ZoneId, { id: ZoneId; currency: string; symbol: string; label: string; after?: boolean }> = {
  th: { id: "th", currency: "THB", symbol: "฿", label: "฿ THB", after: true },
  eu: { id: "eu", currency: "EUR", symbol: "€", label: "€ EUR" },
  au: { id: "au", currency: "AUD", symbol: "A$", label: "A$ AUD" },
  intl: { id: "intl", currency: "USD", symbol: "$", label: "$ USD" },
};
export const ZONE_ORDER: ZoneId[] = ["th", "eu", "au", "intl"];

/** Monthly list prices per zone (monthly cycle). Placeholders to validate: the Thai prices are the live ones. */
export const ZONE_PRICES: Record<ZoneId, Record<PlanId, number>> = {
  th: { free: 0, solo: 149, team: 249, tracker: 499 },
  eu: { free: 0, solo: 9, team: 15, tracker: 29 },
  au: { free: 0, solo: 15, team: 25, tracker: 49 },
  intl: { free: 0, solo: 9, team: 15, tracker: 29 },
};

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "CH", "NO", "IS", "LI",
]);

export function isZone(v: unknown): v is ZoneId {
  return v === "th" || v === "eu" || v === "au" || v === "intl";
}

/** Price zone suggested for an ISO country code. */
export function zoneForCountry(country: string | null | undefined): ZoneId {
  const c = (country ?? "").toUpperCase();
  if (c === "TH") return "th";
  if (c === "AU") return "au";
  if (EU_COUNTRIES.has(c)) return "eu";
  return "intl";
}

/** Site language suggested for a country, or null when we have nothing better than the page being viewed. */
export function langForCountry(country: string | null | undefined): Lang | null {
  const c = (country ?? "").toUpperCase();
  if (c === "TH") return "th";
  if (c === "FR") return "fr";
  return null;
}

/** Monthly price in a zone's currency on a billing cycle, rounded to a whole unit. */
export function zonePrice(plan: PlanId, zone: ZoneId, cycle: CycleId): number {
  const c = CYCLES.find((x) => x.id === cycle) ?? CYCLES[0];
  return Math.round(ZONE_PRICES[zone][plan] * (1 - c.discount));
}

/** "฿1,428" / "€96": the amount with the zone's symbol, on the side the currency is written. */
export function formatMoney(amount: number, zone: ZoneId): string {
  const z = ZONES[zone];
  const n = amount.toLocaleString("en-US");
  return z.after ? `${n} ${z.symbol}` : `${z.symbol}${n}`;
}

/** What is charged at the start of a billing cycle, in the zone's currency (the per-month price x the months). */
export function zoneCycleTotal(plan: PlanId, zone: ZoneId, cycle: CycleId): number {
  const c = CYCLES.find((x) => x.id === cycle) ?? CYCLES[0];
  return zonePrice(plan, zone, cycle) * c.months;
}

/** Words of the "switch site" suggestion, written in the language it suggests. */
export const SWITCH_BANNER: Partial<Record<Lang, { text: string; cta: string }>> = {
  fr: { text: "Vous êtes en France ? SabaiBiz existe en français.", cta: "Voir la version française" },
  th: { text: "อยู่ในประเทศไทยใช่ไหม? SabaiBiz มีภาษาไทย", cta: "ดูเวอร์ชันภาษาไทย" },
};
