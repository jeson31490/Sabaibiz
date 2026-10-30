"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { computePayslip, deleteStaff, fetchStaff, payslipHtml, saveStaff, type Staff } from "../../lib/payroll";
import { supabase } from "../../lib/supabase";
import { inputClass } from "./FormField";
import { usePlanUsage } from "./usePlanUsage";

const money = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;
const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 7);

export default function PayrollManager() {
  const { usage } = usePlanUsage();
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(thisMonth());
  const [lang, setLang] = useState<"en" | "th">("en");
  const [business, setBusiness] = useState("");
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [extras, setExtras] = useState<Record<string, { extra: number; other: number }>>({});

  const load = useCallback(async () => {
    try {
      setStaff(await fetchStaff());
      setError(null);
    } catch (e) {
      console.error("payroll", e);
      setError("The payroll list could not be loaded. If this is the first time, the payroll table may not be set up yet.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    supabase.auth.getUser().then(({ data }) => setBusiness(String(data.user?.user_metadata?.business_name ?? "")));
  }, [load]);

  const rows = useMemo(
    () =>
      (staff ?? []).map((s) => {
        const e = extras[s.id] ?? { extra: 0, other: 0 };
        return { s, e, slip: computePayslip(s.baseSalary, e.extra, e.other) };
      }),
    [staff, extras],
  );
  const totals = rows.reduce((t, r) => ({ gross: t.gross + r.slip.gross, sso: t.sso + r.slip.sso, tax: t.tax + r.slip.tax, net: t.net + r.slip.net }), { gross: 0, sso: 0, tax: 0, net: 0 });

  if (usage && !usage.degraded && usage.plan.id !== "team" && usage.plan.id !== "tracker") {
    return (
      <div className="rounded-2xl border border-gold-500/40 bg-gold-50 p-6 text-sm text-gold-800">
        <p className="font-semibold">Payroll is part of the Team and Tracker plans.</p>
        <p className="mt-1">You are on the {usage.plan.name} plan.</p>
        <Link href="/dashboard/settings/subscription-plan" className="mt-3 inline-block font-semibold underline">
          See plans
        </Link>
      </div>
    );
  }

  function printSlip(s: Staff, slip: ReturnType<typeof computePayslip>) {
    const w = window.open("", "_blank");
    if (!w) {
      setError("Your browser blocked the payslip window. Please allow pop-ups for this site.");
      return;
    }
    w.document.write(payslipHtml({ business, staff: s, month, slip, lang }));
    w.document.close();
    // Printed from here: the strict security policy does not allow an inline script in the payslip itself.
    setTimeout(() => w.print(), 400);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium text-teal-900">
          Month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${inputClass} mt-1.5 w-auto`} />
        </label>
        <label className="text-sm font-medium text-teal-900">
          Payslip language
          <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "th")} className={`${inputClass} mt-1.5 w-auto`}>
            <option value="en">English</option>
            <option value="th">ไทย</option>
          </select>
        </label>
        <button type="button" onClick={() => setEditing("new")} className="ml-auto rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800">
          Add a person
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
      {!staff && !error && <p className="mt-6 text-sm text-teal-900/60">Loading…</p>}
      {staff && staff.length === 0 && !error && (
        <p className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 text-sm text-teal-900/70">No one yet. Add your first person and their monthly salary.</p>
      )}

      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-teal-50 text-left text-xs uppercase tracking-wide text-teal-900/70">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right" title="Overtime and bonuses are only what you type here. Clock-in times never add pay.">Overtime / bonus</th>
                <th className="px-4 py-3 text-right">Social security</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">Net pay</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, e, slip }) => (
                <tr key={s.id} className="border-t border-teal-100">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setEditing(s)} className="text-left font-semibold text-teal-900 hover:underline">
                      {s.name}
                    </button>
                    <div className="text-xs text-teal-900/60">{s.roleTitle}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(s.baseSalary)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      aria-label={`Bonus for ${s.name}`}
                      value={e.extra || ""}
                      onChange={(ev) => setExtras((x) => ({ ...x, [s.id]: { ...e, extra: Number(ev.target.value) || 0 } }))}
                      className="w-24 rounded-lg border border-teal-200 px-2 py-1 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(slip.sso)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(slip.tax)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(slip.net)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => printSlip(s, slip)} className="rounded-full border border-teal-300 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50">
                      Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-teal-200 bg-teal-50 font-semibold">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(totals.gross)}</td>
                <td />
                <td className="px-4 py-3 text-right tabular-nums">{money(totals.sso)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(totals.tax)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(totals.net)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-teal-900/60">
        Social security is 5% of pay, between 1,650 and 17,500 ฿ (so 875 ฿ at most), and your own contribution is the same again. Tax is the monthly
        withholding worked out from a year of the same pay. Check the figures with your accountant for special cases.
      </p>

      {editing && <StaffDialog initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </div>
  );
}

function StaffDialog({ initial, onClose, onSaved }: { initial: Staff | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [roleTitle, setRoleTitle] = useState(initial?.roleTitle ?? "");
  const [salary, setSalary] = useState(initial ? String(initial.baseSalary) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const baseSalary = Number(salary);
    if (!name.trim() || !(baseSalary >= 0) || salary === "") {
      setError("Please enter a name and a monthly salary.");
      return;
    }
    setBusy(true);
    try {
      await saveStaff({ id: initial?.id, name, roleTitle, baseSalary });
      onSaved();
    } catch (err) {
      console.error(err);
      setError("We couldn't save this person. Please try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !window.confirm(`Remove ${initial.name} from payroll?`)) return;
    setBusy(true);
    try {
      await deleteStaff(initial.id);
      onSaved();
    } catch (err) {
      console.error(err);
      setError("We couldn't remove this person.");
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Person" className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-teal-950">{initial ? "Edit person" : "Add a person"}</h2>
        <label className="block text-sm font-medium text-teal-900">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-medium text-teal-900">
          Position
          <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-medium text-teal-900">
          Monthly salary (฿)
          <input type="number" min={0} step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">Save</button>
          <button type="button" onClick={onClose} className="rounded-full px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">Cancel</button>
          {initial && (
            <button type="button" disabled={busy} onClick={remove} className="ml-auto text-sm font-semibold text-red-700 hover:underline">Remove</button>
          )}
        </div>
      </form>
    </div>
  );
}
