"use client";

import { useEffect, useState } from "react";
import { fetchAiKeyStatus, removeAiKey, saveAiKey, type AiKeyStatus } from "../../lib/aiKey";

export default function AiKeyCard() {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchAiKeyStatus().then(setStatus).catch((e) => setError(e instanceof Error ? e.message : "Error"));
  useEffect(() => {
    void load();
  }, []);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setKey("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
      <h2 className="text-lg font-semibold text-teal-950">Your own AI key</h2>
      <p className="mt-1 text-sm text-teal-900/65">
        Paste your Anthropic API key to read as many invoices as you want, on any plan, free of Sabai scan limits. You pay Anthropic
        directly, about 1–2 ฿ per invoice. Your key is checked, then stored encrypted. It is never shown again.
      </p>
      {status === null && !error && <p className="mt-4 text-sm text-teal-900/60">Loading…</p>}
      {status?.saved ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-teal-50 p-4">
          <p className="text-sm font-medium text-teal-900">Key saved · ends with …{status.last4}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => act(removeAiKey)}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Remove key
          </button>
        </div>
      ) : (
        status && (
          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => saveAiKey(key));
            }}
          >
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-…"
              className="min-w-0 flex-1 rounded-xl border border-teal-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            />
            <button
              type="submit"
              disabled={busy || key.trim().length < 20}
              className="rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Save key"}
            </button>
          </form>
        )
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <ol className="mt-6 list-decimal space-y-1 pl-5 text-sm text-teal-900/70">
        <li>Create a free account at console.anthropic.com and add a few dollars of credit.</li>
        <li>Open “API keys” and create a key.</li>
        <li>Paste it here. Done.</li>
      </ol>
    </div>
  );
}
