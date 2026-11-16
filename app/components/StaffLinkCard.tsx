"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

// Shows a one-time staff link the owner can send with ANY app (share sheet), copy, or show as a QR code in person.
export default function StaffLinkCard({ link, label, days, business, onClose }: { link: string; label: string; days: number; business: string; onClose: () => void }) {
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const message = `${business} invited you to SabaiBiz. Open this link, enter your phone number and choose a 6-digit code:`;

  useEffect(() => {
    let live = true;
    QRCode.toString(link, { type: "svg", margin: 1, width: 192, errorCorrectionLevel: "M" }).then((s) => live && setSvg(s)).catch(() => {});
    return () => {
      live = false;
    };
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link is shown below: it can be selected by hand */
    }
  }

  return (
    <section aria-label={`Link for ${label}`} className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
      <h3 className="text-lg font-semibold text-teal-950">Link for {label}</h3>
      <p className="mt-1 text-sm text-teal-900/75">
        Send it with WhatsApp, LINE, Telegram, SMS… or show the QR code. It works once and expires in {days} days. Don&apos;t post it publicly.
      </p>
      <div className="mt-4 flex flex-wrap items-start gap-5">
        {svg && <div role="img" aria-label="QR code of the link" className="h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-teal-100 bg-white" dangerouslySetInnerHTML={{ __html: svg }} />}
        <div className="min-w-0 flex-1">
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Staff link" className="w-full rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-2 text-xs text-teal-950" />
          <div className="mt-3 flex flex-wrap gap-2">
            {canShare && (
              <button type="button" onClick={() => navigator.share({ title: "SabaiBiz", text: message, url: link }).catch(() => {})} className="rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-teal-950 hover:bg-gold-400">
                Share…
              </button>
            )}
            <button type="button" onClick={copy} className="rounded-full border border-teal-200 px-5 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-teal-200 px-5 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">
              Done
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
