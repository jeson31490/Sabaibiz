// The subscription plans: the single source of truth for prices, quotas and what each plan includes.
// Used by the pricing pages, the scan quota check (/api/scan-invoice) and the team invitation limits.
// No "server-only" here: the pricing pages (client) read it too.
//
// Sabai's own AI scans are limited per plan. With their OWN AI key (supabase/21…, Settings → AI key) a
// business scans without limit on every plan, because it pays its AI provider directly. The Free plan
// has no Sabai scans at all: it only reads invoices with the owner's own key.

import type { Lang } from "./landingCopy";

export type PlanId = "free" | "solo" | "team" | "tracker";

/** One sentence in each language of the public pages. */
export type Words = Record<Lang, string>;

export type PlanFeature = {
  t: Words;
  /** "head": the "Everything in …" line. "sub": a detail under the line above. */
  kind?: "head" | "sub";
  /** Announced but not built yet: shown with a "Soon" tag so the pricing page never over-promises. */
  soon?: boolean;
  /** Recently added: shown with a "New" tag. */
  isNew?: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  /** Baht per month on the monthly cycle. 0 for the free plan. */
  priceMonthly: number;
  /** Invoice readings with Sabai's own AI included each calendar month (Bangkok time). */
  scansPerMonth: number;
  /** Managers the owner can invite besides themselves. null = unlimited. */
  managerSeats: number | null;
  /** Employees (clock-in area) the owner can invite. Free, but capped so nobody can mass-create accounts. */
  employeeCap: number;
  tag: Words;
  popular?: boolean;
  features: PlanFeature[];
};

export const PLAN_ORDER: PlanId[] = ["free", "solo", "team", "tracker"];

const w = (en: string, th: string, fr: string, ru: string): Words => ({ en, th, fr, ru });
const check = (t: Words, extra: Pick<PlanFeature, "soon" | "isNew"> = {}): PlanFeature => ({ t, ...extra });
const sub = (t: Words): PlanFeature => ({ t, kind: "sub" });
const head = (t: Words): PlanFeature => ({ t, kind: "head" });

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    scansPerMonth: 0,
    managerSeats: 0,
    employeeCap: 0,
    tag: w(
      "Try Sabai with your own AI key",
      "ลองใช้ Sabai ด้วยคีย์ AI ของคุณเอง",
      "Essayez Sabai avec votre propre clé IA",
      "Попробуйте Sabai со своим ключом ИИ",
    ),
    features: [
      check(w("1 user", "ผู้ใช้ 1 คน", "1 utilisateur", "1 пользователь")),
      check(w("Daily number: sales in, costs out", "ตัวเลขประจำวัน: เงินเข้า เงินออก", "Le chiffre du jour : ventes et dépenses", "Цифра дня: доходы и расходы")),
      check(w("Add expenses by hand", "เพิ่มค่าใช้จ่ายเอง", "Saisie manuelle des dépenses", "Ручной ввод расходов")),
      check(w("Invoice archive and CSV export", "เก็บบิลและส่งออก CSV", "Archive des factures et export CSV", "Архив счетов и экспорт в CSV")),
      check(
        w(
          "Bring your own AI key: unlimited scans",
          "ใช้คีย์ AI ของคุณเอง สแกนได้ไม่จำกัด",
          "Votre propre clé IA : scans illimités",
          "Свой ключ ИИ: сканирование без лимита",
        ),
        { isNew: true },
      ),
      check(
        w(
          "Works on iPhone, Android and any browser",
          "ใช้ได้บน iPhone, Android และเบราว์เซอร์ทั่วไป",
          "Fonctionne sur iPhone, Android et navigateur",
          "Работает на iPhone, Android и в браузере",
        ),
      ),
    ],
  },
  solo: {
    id: "solo",
    name: "Solo",
    priceMonthly: 149,
    scansPerMonth: 15,
    managerSeats: 0,
    employeeCap: 10,
    tag: w(
      "For one-person businesses",
      "สำหรับธุรกิจที่ดูแลเองคนเดียว",
      "Pour les petits commerces en solo",
      "Для бизнеса из одного человека",
    ),
    features: [
      head(w("Everything in Free plan", "ทุกอย่างในแพ็กเกจ Free", "Tout ce qu'il y a dans Free", "Всё из тарифа Free")),
      check(
        w(
          "15 scans included with Sabai AI",
          "สแกนด้วย Sabai AI รวม 15 ใบต่อเดือน",
          "15 scans inclus avec l'IA de Sabai",
          "15 сканирований с ИИ Sabai включено",
        ),
      ),
      check(
        w(
          "Multi-page invoices (up to 4 pages), Thai and English bills",
          "บิลหลายหน้า (สูงสุด 4 หน้า) ทั้งไทยและอังกฤษ",
          "Factures multipages (4 pages max), en thaï et en anglais",
          "Многостраничные счета (до 4 страниц), на тайском и английском",
        ),
      ),
      check(
        w(
          "Find invoices by date and supplier",
          "ค้นหาบิลตามวันที่และซัพพลายเออร์",
          "Recherche par date et fournisseur",
          "Поиск счетов по дате и поставщику",
        ),
      ),
      sub(w("Total between two dates, ready for VAT", "ยอดรวมระหว่างสองวัน พร้อมใช้ทำ VAT", "Total entre deux dates, prêt pour la TVA", "Сумма за период, готово для НДС")),
      check(w("Loyverse till link", "เชื่อมเครื่องคิดเงิน Loyverse", "Caisse Loyverse reliée", "Подключение кассы Loyverse")),
      sub(w("Sales synced automatically", "ซิงค์ยอดขายอัตโนมัติ", "Ventes synchronisées automatiquement", "Продажи синхронизируются автоматически")),
      check(
        w(
          "Employee area for up to 10 employees",
          "พื้นที่พนักงานสูงสุด 10 คน",
          "Espace employé jusqu'à 10 employés",
          "Кабинет сотрудника, до 10 человек",
        ),
        { isNew: true },
      ),
      sub(
        w(
          "Clock in and out, declare absences, see the month",
          "ลงเวลาเข้า-ออก แจ้งวันลา ดูสรุปของเดือน",
          "Pointage, déclaration d'absences, récap du mois",
          "Отметка прихода и ухода, заявки на отсутствие, сводка месяца",
        ),
      ),
      sub(w("Invite by email, remove access in one tap", "เชิญทางอีเมล ปิดสิทธิ์ได้ในแตะเดียว", "Invitation par e-mail, accès retiré en un geste", "Приглашение по e-mail, доступ отзывается одним касанием")),
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceMonthly: 249,
    scansPerMonth: 25,
    managerSeats: 2,
    employeeCap: 20,
    popular: true,
    tag: w(
      "For businesses with staff",
      "สำหรับธุรกิจที่มีทีมงาน",
      "Pour les commerces avec du personnel",
      "Для бизнеса с сотрудниками",
    ),
    features: [
      head(w("Everything in Solo plan", "ทุกอย่างในแพ็กเกจ Solo", "Tout ce qu'il y a dans Solo", "Всё из тарифа Solo")),
      check(w("Owner + 2 managers", "เจ้าของ + ผู้จัดการ 2 คน", "Patron + 2 managers", "Владелец + 2 менеджера")),
      sub(
        w(
          "Managers photograph invoices, only the owner sees the money",
          "ผู้จัดการถ่ายบิลได้ มีแต่เจ้าของที่เห็นตัวเลขเงิน",
          "Les managers photographient les factures, seul le patron voit l'argent",
          "Менеджеры фотографируют счета, деньги видит только владелец",
        ),
      ),
      check(
        w(
          "Employee area for up to 20 employees",
          "พื้นที่พนักงานสูงสุด 20 คน",
          "Espace employé jusqu'à 20 employés",
          "Кабинет сотрудника, до 20 человек",
        ),
      ),
      check(w("Monthly absence report", "รายงานวันลาประจำเดือน", "Rapport mensuel des absences", "Месячный отчёт по отсутствиям")),
      check(
        w(
          "25 scans included with Sabai AI",
          "สแกนด้วย Sabai AI รวม 25 ใบต่อเดือน",
          "25 scans inclus avec l'IA de Sabai",
          "25 сканирований с ИИ Sabai включено",
        ),
      ),
      check(w("Price history for every product", "ประวัติราคาของสินค้าทุกรายการ", "Historique des prix de chaque produit", "История цен по каждому товару")),
      check(w("Price increase alerts", "แจ้งเตือนเมื่อราคาขึ้น", "Alertes de hausse de prix", "Оповещения о росте цен")),
      check(w("Supplier price comparison", "เปรียบเทียบราคาระหว่างซัพพลายเออร์", "Comparaison des prix entre fournisseurs", "Сравнение цен поставщиков")),
      check(w("Daily summary on LINE", "สรุปรายวันทาง LINE", "Résumé quotidien sur LINE", "Ежедневная сводка в LINE"), { soon: true }),
      check(w("Grab invoices straight from email", "รับบิล Grab จากอีเมลโดยตรง", "Factures Grab directement depuis l'e-mail", "Счета Grab прямо из почты"), { soon: true }),
      check(w("Payslips, pre-filled each month", "สลิปเงินเดือนกรอกให้ล่วงหน้าทุกเดือน", "Fiches de paie préremplies chaque mois", "Расчётные листки, заполненные заранее")),
      sub(
        w(
          "Social security and tax calculated, you can edit everything",
          "คำนวณประกันสังคมและภาษีให้ แก้ไขได้ทุกอย่าง",
          "Sécu et impôt calculés, tout est modifiable",
          "Соцстрах и налог рассчитаны, всё можно править",
        ),
      ),
      sub(
        w(
          "Thai and English PDF, monthly summary to print",
          "PDF ไทย-อังกฤษ และสรุปรายเดือนสำหรับพิมพ์",
          "PDF thaï et anglais, récap mensuel à imprimer",
          "PDF на тайском и английском, месячная сводка для печати",
        ),
      ),
      check(
        w(
          "AI Connector for Claude and ChatGPT",
          "AI Connector สำหรับ Claude และ ChatGPT",
          "Connecteur IA pour Claude et ChatGPT",
          "AI-коннектор для Claude и ChatGPT",
        ),
        { soon: true },
      ),
    ],
  },
  tracker: {
    id: "tracker",
    name: "Tracker",
    priceMonthly: 499,
    scansPerMonth: 50,
    managerSeats: null,
    employeeCap: 50,
    tag: w(
      "Track everything in your business",
      "ติดตามทุกอย่างในธุรกิจของคุณ",
      "Suivez tout ce qui bouge dans votre commerce",
      "Следите за всем в вашем бизнесе",
    ),
    features: [
      head(w("Everything in Team plan", "ทุกอย่างในแพ็กเกจ Team", "Tout ce qu'il y a dans Team", "Всё из тарифа Team")),
      check(w("Unlimited managers", "ผู้จัดการไม่จำกัด", "Managers illimités", "Неограниченно менеджеров")),
      check(
        w(
          "Employee area for up to 50 employees",
          "พื้นที่พนักงานสูงสุด 50 คน",
          "Espace employé jusqu'à 50 employés",
          "Кабинет сотрудника, до 50 человек",
        ),
      ),
      check(
        w(
          "50 scans included with Sabai AI",
          "สแกนด้วย Sabai AI รวม 50 ใบต่อเดือน",
          "50 scans inclus avec l'IA de Sabai",
          "50 сканирований с ИИ Sabai включено",
        ),
      ),
      check(
        w(
          "Real-time tracking of sales, costs and prices",
          "ติดตามยอดขาย ต้นทุน และราคาแบบเรียลไทม์",
          "Suivi en temps réel des ventes, coûts et prix",
          "Отслеживание продаж, расходов и цен в реальном времени",
        ),
      ),
      check(w("Real margin per product", "กำไรจริงต่อสินค้า", "Marge réelle par produit", "Реальная маржа по товарам"), { isNew: true }),
      sub(w("Purchase price read from your invoices", "ราคาซื้ออ่านจากบิลของคุณ", "Prix d'achat lu dans vos factures", "Закупочная цена берётся из счетов")),
      sub(w("Updates with every price change", "อัปเดตทุกครั้งที่ราคาเปลี่ยน", "Mise à jour à chaque changement de prix", "Обновляется при каждом изменении цены")),
      check(w("Cost sheets for recipes and bundles", "สูตรต้นทุนสำหรับเมนูและชุดสินค้า", "Fiches de coût pour recettes et lots", "Калькуляция для рецептов и наборов"), { isNew: true }),
      sub(w("Drafted by AI, you correct them once", "AI ร่างให้ คุณแก้ครั้งเดียว", "Brouillon par l'IA, vous corrigez une fois", "Черновик от ИИ, вы правите один раз")),
      check(w("Suggested selling price when costs rise", "แนะนำราคาขายเมื่อต้นทุนสูงขึ้น", "Prix de vente conseillé quand les coûts montent", "Рекомендуемая цена при росте затрат"), { soon: true }),
      check(w("Weekly profit summary", "สรุปกำไรรายสัปดาห์", "Résumé hebdomadaire du bénéfice", "Недельная сводка прибыли"), { soon: true }),
      check(w("Alert when a margin drops below your target", "แจ้งเตือนเมื่อกำไรต่ำกว่าเป้า", "Alerte quand une marge passe sous votre objectif", "Оповещение, когда маржа ниже цели"), { soon: true }),
      check(w("Connect Grab, Ocha and LINE", "เชื่อม Grab, Ocha และ LINE", "Connexion à Grab, Ocha et LINE", "Подключение Grab, Ocha и LINE"), { soon: true }),
      check(w("Voice assistant", "ผู้ช่วยด้วยเสียง", "Assistant vocal", "Голосовой помощник"), { soon: true }),
      check(w("Priority support", "ซัพพอร์ตแบบเร่งด่วน", "Support prioritaire", "Приоритетная поддержка")),
      check(w("Early access to new features", "ทดลองฟีเจอร์ใหม่ก่อนใคร", "Accès anticipé aux nouveautés", "Ранний доступ к новым функциям")),
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

/**
 * Reads a plan name from the database. "empire" is the old name of the top plan (now "tracker"): accounts
 * created before supabase/21_tracker_plan_and_ai_key.sql was run still carry it.
 */
export function normalizePlanId(value: unknown): PlanId | null {
  if (value === "empire") return "tracker";
  return isPlanId(value) ? value : null;
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

/** First instant of today in Bangkok. */
export function dayStartBangkok(now: Date = new Date()): Date {
  const bkk = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()) - BANGKOK_OFFSET_MS);
}

export function formatResetDate(now: Date = new Date()): string {
  return nextMonthStartBangkok(now).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Bangkok",
  });
}
