"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Wordmark } from "../components/landing/SabaiMark";
import Turnstile, { CAPTCHA_ENABLED } from "../components/Turnstile";
import { supabase } from "../../lib/supabase";
import { normalizePhone, staffEmail, staffPassword } from "../../lib/staff";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950 placeholder:text-teal-900/40 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
const labelClass = "block text-sm font-medium text-teal-900";

const T = {
  en: { title: "Join your team", sub: "Enter your phone number and choose a 6-digit code. You will use them to sign in.", phone: "Phone number", phoneHint: "Type it the same way every time you sign in.", code: "Choose a 6-digit code", code2: "Repeat the code", go: "Join", going: "Joining…", mismatch: "The two codes don't match.", bad: "This link is missing or incomplete. Ask your manager for a new one.", wait: "Please wait for the security check to finish.", signin: "Already joined? Sign in", signinLink: "Staff sign in", warn: "Don't share your code. If you forget it, ask your manager for a new link." },
  th: { title: "เข้าร่วมทีมของคุณ", sub: "กรอกเบอร์โทรศัพท์และตั้งรหัส 6 หลัก ใช้สำหรับเข้าสู่ระบบ", phone: "เบอร์โทรศัพท์", phoneHint: "พิมพ์รูปแบบเดิมทุกครั้งที่เข้าสู่ระบบ", code: "ตั้งรหัส 6 หลัก", code2: "ยืนยันรหัสอีกครั้ง", go: "เข้าร่วม", going: "กำลังเข้าร่วม…", mismatch: "รหัสทั้งสองไม่ตรงกัน", bad: "ลิงก์ไม่ครบหรือใช้ไม่ได้ ขอลิงก์ใหม่จากผู้จัดการ", wait: "รอให้การตรวจสอบความปลอดภัยเสร็จก่อน", signin: "เข้าร่วมแล้ว? เข้าสู่ระบบ", signinLink: "เข้าสู่ระบบพนักงาน", warn: "อย่าบอกรหัสกับใคร หากลืม ขอลิงก์ใหม่จากผู้จัดการ" },
};

// Where a staff member lands from the link their manager sent. The one-time token is in the URL fragment (#),
// which browsers never send to servers. The person types a phone number and chooses a code; no e-mail needed.
export default function JoinPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "th">("en");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const t = T[lang];

  useEffect(() => {
    // Browser-only values, read once on mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setToken(window.location.hash.slice(1) || "");
    setLang(navigator.language?.toLowerCase().startsWith("th") ? "th" : "en");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = String(data.get("code")).trim();
    if (code !== String(data.get("code2")).trim()) return setError(t.mismatch);
    if (CAPTCHA_ENABLED && !captchaToken) return setError(t.wait);
    const phone = normalizePhone(String(data.get("phone")));
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, phone: String(data.get("phone")), code }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitting(false);
      setError(body?.error ?? "We couldn't join. Please try again.");
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: staffEmail(phone!),
      password: staffPassword(phone!, code),
      options: { captchaToken: captchaToken ?? undefined },
    });
    if (signInError) {
      // The account is ready; only the automatic sign-in failed (e.g. the security check expired).
      setSubmitting(false);
      setCaptchaKey((k) => k + 1);
      router.replace("/login?staff=1");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <main lang={lang} className="app-dark flex min-h-screen flex-col items-center px-6 py-10">
      <Link href="/" aria-label="SabaiBiz"><Wordmark size={44} id="auth" className="text-3xl" /></Link>
      <div className="mt-6 w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-card">
        <h1 className="text-center text-3xl font-bold tracking-tight text-teal-950">{t.title}</h1>
        {token === null ? null : token === "" ? (
          <p role="alert" className="mt-6 text-center text-sm text-teal-900/75">{t.bad}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <p className="text-sm text-teal-900/75">{t.sub}</p>
            <div>
              <label htmlFor="phone" className={labelClass}>{t.phone}</label>
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className={inputClass} />
              <p className="mt-1 text-xs text-teal-900/60">{t.phoneHint}</p>
            </div>
            <div>
              <label htmlFor="code" className={labelClass}>{t.code}</label>
              <input id="code" name="code" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="code2" className={labelClass}>{t.code2}</label>
              <input id="code2" name="code2" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" required className={inputClass} />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            <Turnstile onToken={setCaptchaToken} resetKey={captchaKey} />
            <button type="submit" disabled={submitting} className="w-full rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 disabled:cursor-wait disabled:opacity-60">
              {submitting ? t.going : t.go}
            </button>
            <p className="text-center text-xs text-teal-900/60">{t.warn}</p>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-teal-900/70">
          <Link href="/login?staff=1" className="font-semibold text-teal-700 hover:text-teal-900">{t.signin}</Link>
        </p>
      </div>
    </main>
  );
}
