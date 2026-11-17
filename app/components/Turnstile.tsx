"use client";

import { useEffect, useRef, useState } from "react";
import { AUTH, type AuthLang } from "../../lib/authCopy";

// The site key is public by design (it is sent to every visitor's browser). The secret key lives only in Supabase.
// NEXT_PUBLIC_TURNSTILE_SITE_KEY overrides it; set it to "off" to switch the captcha off.
const ENV_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SITE_KEY = ENV_KEY === "off" ? undefined : ENV_KEY || "0x4AAAAAAFpJfgDpn0o2O_5k";

/** True when a Cloudflare Turnstile site key is set. Without it, no captcha is shown and nothing changes. */
export const CAPTCHA_ENABLED = !!SITE_KEY;

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("captcha script failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile (free, privacy friendly). Supabase checks the token when "Enable Captcha protection"
 * is on in Auth settings. Change `resetKey` to get a fresh challenge after a failed attempt.
 *
 * If the check cannot load (old phone WebView, blocked script, network), a message and a "Try again" button
 * are shown instead of an empty gap, so nobody is left stuck on a form that silently refuses to submit.
 */
export default function Turnstile({
  onToken,
  resetKey = 0,
  lang = "en",
}: {
  onToken: (token: string | null) => void;
  resetKey?: number;
  lang?: AuthLang;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const t = AUTH[lang];
  useEffect(() => {
    cb.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let id: string | undefined;
    let cancelled = false;
    let gotToken = false;
    const fail = () => {
      if (cancelled) return;
      cb.current(null);
      setFailed(true);
    };
    // The widget draws an iframe within a few seconds. No iframe and no token after 15 s means it is stuck.
    const watchdog = window.setTimeout(() => {
      if (!gotToken && !box.current?.querySelector("iframe")) fail();
    }, 15000);
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        id = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => {
            gotToken = true;
            setFailed(false);
            cb.current(token);
          },
          "expired-callback": () => cb.current(null),
          "error-callback": () => {
            fail();
            return true;
          },
          "unsupported-callback": fail,
          retry: "auto",
          "refresh-expired": "auto",
        });
      })
      .catch(fail);
    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      cb.current(null);
      if (id) window.turnstile?.remove(id);
    };
  }, [resetKey, attempt]);

  if (!SITE_KEY) return null;
  return (
    <div>
      <div ref={box} aria-label={t.captchaChecking} className="flex min-h-[65px] justify-center" />
      {failed && (
        <div role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
          <p className="font-semibold">{t.captchaFailed}</p>
          {typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) && <p className="mt-1 text-xs">{t.captchaHint}</p>}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
            className="mt-2 rounded-full bg-teal-700 px-5 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            {t.captchaRetry}
          </button>
        </div>
      )}
    </div>
  );
}
