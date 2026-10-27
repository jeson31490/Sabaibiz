// The subscription plans: the single source of truth for prices, quotas and what each plan includes.
// Used by the pricing pages, the scan quota check (/api/scan-invoice) and the team invitation limit.
// No "server-only" here: the pricing pages (client) read it too.

export type PlanId = "free" | "solo" | "team" | "empire";

export type PlanFeature = {
  text: string;
  /** Thai wording, for the /th pages. */
  th: string;
  /** Announced but not built yet: shown with a "Soon" tag so the pricing page never over-promises. */
  soon?: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  /** Baht per month on the monthly cycle. 0 for the free plan. */
  priceMonthly: number;
  /** Invoice readings (scans) included each calendar month (Bangkok time). */
  scansPerMonth: number;
  /** Manager/employee accounts the owner can invite. null = unlimited. */
  teamSeats: number | null;
  tagline: string;
  taglineTh: string;
  popular?: boolean;
  features: PlanFeature[];
};

export const PLAN_ORDER: PlanId[] = ["free", "solo", "team", "empire"];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    scansPerMonth: 10,
    teamSeats: 0,
    tagline: "Try Sabai on your real invoices.",
    taglineTh: "ลองกับบิลจริงของคุณ",
    features: [
      { text: "10 invoice scans per month", th: "สแกนบิล 10 ใบต่อเดือน" },
      { text: "Invoice archive, always searchable", th: "เก็บบิลทั้งหมด ค้นหาได้ตลอด" },
      { text: "Price tracking per product", th: "ติดตามราคาสินค้าแต่ละรายการ" },
    ],
  },
  solo: {
    id: "solo",
    name: "Solo",
    priceMonthly: 299,
    scansPerMonth: 60,
    teamSeats: 1,
    tagline: "For one-person shops and small cafés.",
    taglineTh: "สำหรับร้านเล็กและคาเฟ่ที่ดูแลเองคนเดียว",
    features: [
      { text: "60 invoice scans per month", th: "สแกนบิล 60 ใบต่อเดือน" },
      { text: "Everything in Free", th: "ทุกอย่างในแพ็กเกจ Free" },
      { text: "Loyverse sales sync: money in, money out, every day", th: "ซิงค์ยอดขายจาก Loyverse เห็นเงินเข้า-ออกทุกวัน" },
      { text: "1 team account (manager or employee)", th: "บัญชีทีมงาน 1 บัญชี (ผู้จัดการหรือพนักงาน)" },
      { text: "Export for your accountant (CSV)", th: "ส่งออกไฟล์ให้นักบัญชี (CSV)" },
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceMonthly: 690,
    scansPerMonth: 150,
    teamSeats: 3,
    popular: true,
    tagline: "For restaurants with a staff to run.",
    taglineTh: "สำหรับร้านอาหารที่มีทีมงาน",
    features: [
      { text: "150 invoice scans per month", th: "สแกนบิล 150 ใบต่อเดือน" },
      { text: "Everything in Solo", th: "ทุกอย่างในแพ็กเกจ Solo" },
      { text: "Price increase alerts", th: "แจ้งเตือนเมื่อราคาขึ้น" },
      { text: "Supplier price comparison", th: "เปรียบเทียบราคาระหว่างซัพพลายเออร์" },
      { text: "3 team accounts", th: "บัญชีทีมงาน 3 บัญชี" },
      { text: "Daily summary on LINE", th: "สรุปรายวันทาง LINE", soon: true },
      { text: "Grab invoices straight from email", th: "รับบิล Grab จากอีเมลโดยตรง", soon: true },
    ],
  },
  empire: {
    id: "empire",
    name: "Empire",
    priceMonthly: 1990,
    scansPerMonth: 400,
    teamSeats: null,
    tagline: "For busy kitchens that want every margin.",
    taglineTh: "สำหรับครัวที่ยุ่งและอยากรู้ทุกบาท",
    features: [
      { text: "400 invoice scans per month", th: "สแกนบิล 400 ใบต่อเดือน" },
      { text: "Everything in Team", th: "ทุกอย่างในแพ็กเกจ Team" },
      { text: "Recipes and real profit margin per dish", th: "สูตรอาหารและกำไรจริงต่อเมนู" },
      { text: "Unlimited team accounts", th: "บัญชีทีมงานไม่จำกัด" },
      { text: "Priority support", th: "ซัพพอร์ตแบบเร่งด่วน" },
      { text: "Voice assistant", th: "ผู้ช่วยด้วยเสียง", soon: true },
    ],
  },
};

/** Discount for paying several months at once. */
export const CYCLES = [
  { id: "monthly", label: "Monthly", months: 1, discount: 0 },
  { id: "6months", label: "6 months", months: 6, discount: 0.1 },
  { id: "yearly", label: "Yearly", months: 12, discount: 0.2 },
] as const;

export type CycleId = (typeof CYCLES)[number]["id"];

/** What a plan costs per month on a billing cycle, rounded to whole baht. */
export function monthlyPriceOnCycle(plan: Plan, cycle: CycleId): number {
  const c = CYCLES.find((x) => x.id === cycle) ?? CYCLES[0];
  return Math.round(plan.priceMonthly * (1 - c.discount));
}

/** Total charged at the start of a billing cycle. */
export function cycleTotal(plan: Plan, cycle: CycleId): number {
  const c = CYCLES.find((x) => x.id === cycle) ?? CYCLES[0];
  return monthlyPriceOnCycle(plan, cycle) * c.months;
}

/**
 * Online payment (PromptPay, card…) is wired up separately. Until it is, the Upgrade buttons say so
 * instead of pretending to charge anyone. Flip to true once the payment provider is connected.
 */
export const PAYMENTS_ENABLED = false;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_ORDER as string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Monthly quota window: calendar months in Bangkok time (UTC+7, no daylight saving)
// ---------------------------------------------------------------------------

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** First instant of the current calendar month in Bangkok. */
export function monthStartBangkok(now: Date = new Date()): Date {
  const bkk = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), 1) - BANGKOK_OFFSET_MS);
}

/** First instant of next month in Bangkok: when the quota resets. */
export function nextMonthStartBangkok(now: Date = new Date()): Date {
  const bkk = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, 1) - BANGKOK_OFFSET_MS);
}

export function formatResetDate(now: Date = new Date()): string {
  return nextMonthStartBangkok(now).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Bangkok",
  });
}
