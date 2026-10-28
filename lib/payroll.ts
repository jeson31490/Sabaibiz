import { supabase } from "./supabase";

// Thai payroll maths. Figures for the current rules; kept in one place so a change is a one-line edit.
export const SSO_RATE = 0.05;
export const SSO_WAGE_MIN = 1650;
export const SSO_WAGE_MAX = 17500; // contribution wage ceiling: 5% of it = 875 baht a month, for the employee and again for the employer
const EXPENSE_RATE = 0.5;
const EXPENSE_MAX = 100000;
const PERSONAL_ALLOWANCE = 60000;
const SSO_DEDUCTION_MAX = 9000;
// Annual taxable income brackets: [upper bound, rate]
const BRACKETS: [number, number][] = [
  [150000, 0],
  [300000, 0.05],
  [500000, 0.1],
  [750000, 0.15],
  [1000000, 0.2],
  [2000000, 0.25],
  [5000000, 0.3],
  [Infinity, 0.35],
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Social security paid by the employee (the employer pays the same amount on top). */
export function socialSecurity(gross: number): number {
  if (gross <= 0) return 0;
  const wage = Math.min(Math.max(gross, SSO_WAGE_MIN), SSO_WAGE_MAX);
  return round2(wage * SSO_RATE);
}

/** Monthly withholding tax: the annual tax on 12 months of this pay, divided by 12. */
export function monthlyIncomeTax(gross: number, sso: number): number {
  const annual = gross * 12;
  const expense = Math.min(annual * EXPENSE_RATE, EXPENSE_MAX);
  const taxable = Math.max(0, annual - expense - PERSONAL_ALLOWANCE - Math.min(sso * 12, SSO_DEDUCTION_MAX));
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of BRACKETS) {
    if (taxable > lower) tax += (Math.min(taxable, upper) - lower) * rate;
    lower = upper;
  }
  return round2(tax / 12);
}

export type Payslip = {
  base: number;
  extra: number; // overtime, bonus...
  gross: number;
  sso: number;
  tax: number;
  otherDeduction: number;
  net: number;
  employerSso: number;
};

export function computePayslip(base: number, extra = 0, otherDeduction = 0): Payslip {
  const gross = round2(base + extra);
  const sso = socialSecurity(gross);
  const tax = monthlyIncomeTax(gross, sso);
  return { base, extra, gross, sso, tax, otherDeduction, net: round2(gross - sso - tax - otherDeduction), employerSso: sso };
}

export type Staff = { id: string; name: string; roleTitle: string; baseSalary: number };

type Row = { id: string; name: string; role_title: string | null; base_salary: number | string };
const toStaff = (r: Row): Staff => ({ id: r.id, name: r.name, roleTitle: r.role_title ?? "", baseSalary: Number(r.base_salary) });

export async function fetchStaff(): Promise<Staff[]> {
  const { data, error } = await supabase.from("payroll_staff").select("id, name, role_title, base_salary").order("created_at");
  if (error) throw error;
  return (data as Row[]).map(toStaff);
}

export async function saveStaff(input: { id?: string; name: string; roleTitle: string; baseSalary: number }): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in again.");
  const row = { name: input.name.trim(), role_title: input.roleTitle.trim() || null, base_salary: input.baseSalary };
  const res = input.id
    ? await supabase.from("payroll_staff").update(row).eq("id", input.id)
    : await supabase.from("payroll_staff").insert({ ...row, user_id: auth.user.id });
  if (res.error) throw res.error;
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from("payroll_staff").delete().eq("id", id);
  if (error) throw error;
}

const LABELS = {
  en: { title: "Payslip", employee: "Employee", position: "Position", period: "Pay period", earnings: "Earnings", base: "Base salary", extra: "Overtime / bonus", gross: "Gross pay", deductions: "Deductions", sso: "Social security (5%)", tax: "Income tax withheld", other: "Other deductions", net: "Net pay", employer: "Employer social security contribution", sign: "Employer signature", baht: "THB" },
  th: { title: "สลิปเงินเดือน", employee: "พนักงาน", position: "ตำแหน่ง", period: "งวดเดือน", earnings: "รายได้", base: "เงินเดือน", extra: "ค่าล่วงเวลา / โบนัส", gross: "รวมรายได้", deductions: "รายการหัก", sso: "ประกันสังคม (5%)", tax: "ภาษีหัก ณ ที่จ่าย", other: "รายการหักอื่นๆ", net: "เงินได้สุทธิ", employer: "เงินสมทบประกันสังคมส่วนนายจ้าง", sign: "ลายเซ็นนายจ้าง", baht: "บาท" },
} as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The printable payslip as a small HTML page (open it, then "Print" → "Save as PDF" or send it). */
export function payslipHtml(opts: { business: string; staff: Staff; month: string; slip: Payslip; lang: "en" | "th" }): string {
  const L = LABELS[opts.lang];
  const { slip } = opts;
  const row = (label: string, value: number, bold = false) =>
    `<tr${bold ? ' class="b"' : ""}><td>${esc(label)}</td><td class="n">${money(value)}</td></tr>`;
  return `<!doctype html><html lang="${opts.lang}"><head><meta charset="utf-8"><title>${esc(L.title)} ${esc(opts.staff.name)} ${esc(opts.month)}</title>
<style>
body{font-family:"Prompt","Segoe UI",Arial,sans-serif;color:#052e33;max-width:720px;margin:32px auto;padding:0 24px}
h1{font-size:22px;margin:0}.sub{color:#555;margin:4px 0 24px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:20px;font-size:14px}.meta b{display:block;font-size:12px;color:#777;font-weight:500}
table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px}th{text-align:left;font-size:12px;color:#777;border-bottom:1px solid #ccc;padding:6px 0}
td{padding:6px 0;border-bottom:1px solid #eee}.n{text-align:right;font-variant-numeric:tabular-nums}.b td{font-weight:700;border-bottom:2px solid #052e33}
.net{background:#eef7f7;padding:14px 16px;border-radius:10px;display:flex;justify-content:space-between;font-weight:700;font-size:18px;margin:16px 0}
.small{font-size:12px;color:#777}.sig{margin-top:56px;border-top:1px solid #888;width:240px;padding-top:6px;font-size:12px;color:#555}
@media print{body{margin:12mm auto}}
</style></head><body>
<h1>${esc(opts.business || "SabaiBiz")}</h1><p class="sub">${esc(L.title)}</p>
<div class="meta"><div><b>${L.employee}</b>${esc(opts.staff.name)}</div><div><b>${L.period}</b>${esc(opts.month)}</div>
<div><b>${L.position}</b>${esc(opts.staff.roleTitle || "-")}</div><div></div></div>
<table><tr><th>${L.earnings}</th><th class="n">${L.baht}</th></tr>${row(L.base, slip.base)}${slip.extra ? row(L.extra, slip.extra) : ""}${row(L.gross, slip.gross, true)}</table>
<table><tr><th>${L.deductions}</th><th class="n">${L.baht}</th></tr>${row(L.sso, slip.sso)}${row(L.tax, slip.tax)}${slip.otherDeduction ? row(L.other, slip.otherDeduction) : ""}</table>
<div class="net"><span>${L.net}</span><span>${money(slip.net)} ${L.baht}</span></div>
<p class="small">${L.employer}: ${money(slip.employerSso)} ${L.baht}</p>
<div class="sig">${L.sign}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`;
}
