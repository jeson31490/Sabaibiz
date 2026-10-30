"use client";

import { useEffect, useState } from "react";

const T = {
  en: { offline: "You are offline. Some things won't work until you reconnect.", install: "Install SabaiBiz", installSub: "Open it like an app, full screen, one tap from your home screen.", add: "Install", later: "Not now", ios: "On iPhone: tap Share, then “Add to Home Screen”." },
  th: { offline: "คุณออฟไลน์อยู่ บางอย่างจะใช้ไม่ได้จนกว่าจะเชื่อมต่อ", install: "ติดตั้ง SabaiBiz", installSub: "เปิดใช้เหมือนแอป เต็มหน้าจอ แตะครั้งเดียวจากหน้าจอหลัก", add: "ติดตั้ง", later: "ไว้ก่อน", ios: "บน iPhone: กดแชร์ แล้วเลือก “เพิ่มลงในหน้าจอโฮม”" },
};
const DISMISS_KEY = "sabai-install-dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Registers the service worker, shows an offline banner and an "install the app" card.
export default function PwaRegister() {
  const [online, setOnline] = useState(true);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [lang, setLang] = useState<"en" | "th">("en");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    // Browser-only values, read once on mount (not available during server rendering).
    /* eslint-disable react-hooks/set-state-in-effect */
    setLang(navigator.language?.toLowerCase().startsWith("th") ? "th" : "en");
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setHidden(dismissed || standalone);
    if (isIos && !standalone) setShowIos(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const t = T[lang];
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  return (
    <>
      {!online && (
        <div role="status" className="fixed inset-x-0 top-0 z-[60] bg-[#E8B94A] px-4 py-2 text-center text-sm font-semibold text-[#031B1C]">
          {t.offline}
        </div>
      )}
      {!hidden && (deferred || showIos) && (
        <div className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-md rounded-2xl border border-[#19D3B5]/30 bg-[#072A2B] p-4 text-[#F4EBD8] shadow-2xl md:bottom-6">
          <p className="font-semibold">{t.install}</p>
          <p className="mt-1 text-sm opacity-80">{deferred ? t.installSub : t.ios}</p>
          <div className="mt-3 flex gap-2">
            {deferred && (
              <button onClick={install} className="rounded-full bg-[#19D3B5] px-4 py-2 text-sm font-bold text-[#031B1C]">
                {t.add}
              </button>
            )}
            <button onClick={dismiss} className="rounded-full px-4 py-2 text-sm opacity-70">
              {t.later}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
