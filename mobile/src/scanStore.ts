// Hands the AI reading from the scan screen to the review screen (too big for route params).
import type { ScanResult } from "./api";

type Current = { result: ScanResult; pageCount: number };
let current: Current | null = null;

export const setScan = (value: Current) => {
  current = value;
};
export const getScan = () => current;
export const clearScan = () => {
  current = null;
};
