"use client";

import { useEffect, useState } from "react";
import { canScanPayments } from "./paymentScans";

/** Whether the signed-in user may photograph transfer receipts (null while looking it up). Skips the request when `enabled` is false. */
export function useCanScanPayments(enabled = true): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    canScanPayments().then((v) => !cancelled && setAllowed(v));
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return enabled ? allowed : false;
}
