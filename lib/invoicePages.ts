// Preparing invoice files in the browser before they are read: photos are shrunk under Claude's
// size limit, PDFs are sent as they are. Used by the scan page and the model comparison page.

export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
// Longest edge sent to Claude; larger photos would be downscaled by the API anyway.
const MAX_IMAGE_EDGE = 1568;

export type InvoicePage = {
  id: string;
  name: string;
  mediaType: "image/jpeg" | "application/pdf";
  /** Shrunk JPEG or the original PDF, as a data URL. */
  dataUrl: string;
};

// Phone photos are often 5-10MB, above Claude's 5MB image limit: shrink to a JPEG data URL.
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function toInvoicePage(file: File): Promise<InvoicePage> {
  const isPdf = file.type === "application/pdf";
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mediaType: isPdf ? "application/pdf" : "image/jpeg",
    dataUrl: isPdf ? await readAsDataUrl(file) : await shrinkImage(file),
  };
}
