import { supabase } from "./supabase";
import { bangkokToday } from "./invoices";
import { fetchBusinessId } from "./team";

// Photos of customers' transfer receipts, kept 90 days (supabase/25_payment_scans.sql).

export const PAYMENT_SCAN_BUCKET = "payment-scans";
export const PAYMENT_SCAN_RETENTION_DAYS = 90;
/** A manager only sees the last 30 days; the owner sees everything that is kept. */
export const MANAGER_HISTORY_DAYS = 30;
const MAX_SIDE = 1600;

export type PaymentScan = {
  id: string;
  scannedBy: string | null;
  scannedAt: string;
  imagePath: string;
  /** Short-lived link to the photo. */
  url: string | null;
};

/** True when the SQL has not been run yet (function / table missing). */
export function isPaymentScansNotSetUp(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code === "42883" || code === "42P01" || code === "PGRST202" || code === "PGRST205";
}

/** May the signed-in user photograph transfers? False on the free plan or when not allowed. */
export async function canScanPayments(): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_scan_payments");
  if (error) return false;
  return data === true;
}

/** Shrinks a phone photo (often 4-8 MB) to ~200-400 KB: a receipt stays readable. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't process photos.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) throw new Error("The photo could not be processed.");
  return blob;
}

/** Uploads one photo and records it. The server stamps who took it and when. */
export async function uploadPaymentScan(file: File): Promise<void> {
  const businessId = await fetchBusinessId();
  const blob = await compress(file);
  const path = `${businessId}/${bangkokToday()}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from(PAYMENT_SCAN_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw up.error;
  const { error } = await supabase.from("payment_scans").insert({ image_path: path });
  if (error) {
    // Don't leave a file without a record.
    await supabase.storage.from(PAYMENT_SCAN_BUCKET).remove([path]);
    throw error;
  }
}

const SELECT = "id, scanned_by, scanned_at, image_path";
type Raw = { id: string; scanned_by: string | null; scanned_at: string; image_path: string };

/** Photos taken on one Bangkok day, newest first (owner and managers only: employees have no access to the history). */
export async function fetchPaymentScansForDay(day: string): Promise<PaymentScan[]> {
  const from = new Date(`${day}T00:00:00+07:00`);
  const to = new Date(from.getTime() + 24 * 3600 * 1000);
  const { data, error } = await supabase
    .from("payment_scans")
    .select(SELECT)
    .gte("scanned_at", from.toISOString())
    .lt("scanned_at", to.toISOString())
    .order("scanned_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Raw[];
  const urls = new Map<string, string>();
  if (rows.length > 0) {
    const signed = await supabase.storage.from(PAYMENT_SCAN_BUCKET).createSignedUrls(
      rows.map((r) => r.image_path),
      3600,
    );
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    scannedBy: r.scanned_by,
    scannedAt: r.scanned_at,
    imagePath: r.image_path,
    url: urls.get(r.image_path) ?? null,
  }));
}

/** Owner only: deletes the record and the file. */
export async function deletePaymentScan(scan: PaymentScan): Promise<void> {
  const rm = await supabase.storage.from(PAYMENT_SCAN_BUCKET).remove([scan.imagePath]);
  if (rm.error) throw rm.error;
  const { error } = await supabase.from("payment_scans").delete().eq("id", scan.id);
  if (error) throw error;
}
