import type { LineCheck } from "../../lib/scanInvoice";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * The "Line total" cell: the printed total (or quantity × unit price on old invoices), the real
 * unit price after a line discount, and "Check line" while the line is flagged.
 */
export default function LineTotal({
  check,
  quantity,
  unitPrice,
  flagged,
}: {
  check: LineCheck;
  quantity: number;
  unitPrice: number;
  /** Shown as "Check line" (a scan in progress, or a line still flagged in Needs review). */
  flagged: boolean;
}) {
  return (
    <>
      <span className="font-medium tabular-nums text-teal-950">{fmt(check.total)} ฿</span>
      {check.discount && (
        <span className="block text-xs font-normal text-teal-700">Discount · {fmt(check.effectiveUnitPrice)} ฿/unit</span>
      )}
      {flagged && check.mismatch && (
        <span className="block text-xs font-semibold text-gold-800">
          Check line: {fmt(quantity)} × {fmt(unitPrice)} = {fmt(Math.round(quantity * unitPrice * 100) / 100)} ฿
        </span>
      )}
    </>
  );
}
