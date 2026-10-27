"use client";

import Link from "next/link";
import { usePlanUsage } from "./usePlanUsage";

/** "42 of 60 scans left this month", turning gold when nearly used up and linking to the plans. */
export default function ScanQuota() {
  const { usage } = usePlanUsage();
  if (!usage || usage.degraded) return null;

  const { scansLeft, plan } = usage;
  if (plan.scansPerMonth === 0) {
    return (
      <p className="mt-4 rounded-xl bg-gold-100 px-4 py-3 text-center text-sm text-gold-800">
        <span className="font-semibold">Reading invoices is part of the paid plans.</span>{" "}
        <Link href="/dashboard/settings/subscription-plan" className="font-semibold underline underline-offset-2">
          See plans
        </Link>
      </p>
    );
  }
  const low = scansLeft <= Math.max(2, Math.ceil(plan.scansPerMonth * 0.2));
  const resetDay = usage.resetsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Bangkok" });

  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-center text-sm ${
        low ? "bg-gold-100 text-gold-800" : "bg-teal-50 text-teal-800"
      }`}
    >
      <span className="font-semibold">
        {scansLeft} of {plan.scansPerMonth} scans left
      </span>{" "}
      this month on your {plan.name} plan{scansLeft === 0 ? `. Back on ${resetDay}.` : "."}{" "}
      {low && (
        <Link href="/dashboard/settings/subscription-plan" className="font-semibold underline underline-offset-2">
          See plans
        </Link>
      )}
    </p>
  );
}
