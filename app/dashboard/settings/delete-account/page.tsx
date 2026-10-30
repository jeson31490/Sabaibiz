"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SettingsShell from "../../../components/SettingsShell";
import { useUser } from "../../../context/UserContext";
import { supabase } from "../../../../lib/supabase";
import Turnstile, { CAPTCHA_ENABLED } from "../../../components/Turnstile";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { role, user } = useUser();
  const email = user.email;
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owner = role === "owner";

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      if (CAPTCHA_ENABLED && !captchaToken) throw new Error("Please complete the check below.");
      // Re-enter the password: this also gives a fresh session, which the server requires.
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: captchaToken ?? undefined },
      });
      if (pwError) throw new Error("That password isn't right.");
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ confirm: text }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "We couldn't delete your account.");
      await supabase.auth.signOut();
      router.replace("/?deleted=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't delete your account.");
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
      setBusy(false);
    }
  }

  return (
    <SettingsShell title="Delete my account">
      <div className="mt-6 space-y-4 rounded-2xl border border-red-300/40 bg-red-500/5 p-6 text-teal-950">
        <p className="font-semibold">This cannot be undone.</p>
        {owner ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-teal-900/80">
            <li>Your business and everything in it is deleted: invoices, sales, products, recipes, payroll and photos.</li>
            <li>Your team members lose their access to this business.</li>
            <li>Export what you need first: Invoices → CSV export.</li>
          </ul>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-teal-900/80">
            <li>Your login and your access to this business are deleted.</li>
            <li>The business keeps its own records (invoices, sales).</li>
          </ul>
        )}
        <label htmlFor="confirm" className="block text-sm font-medium">
          Type <b>DELETE</b> to confirm
        </label>
        <input
          id="confirm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          className="w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950"
        />
        <label htmlFor="password" className="block text-sm font-medium">
          Your password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-base text-teal-950"
        />
        <Turnstile onToken={setCaptchaToken} resetKey={captchaKey} />
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={text !== "DELETE" || !password || busy}
          onClick={remove}
          className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </SettingsShell>
  );
}
