"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import {
  connectLoyverse,
  disconnectLoyverse,
  fetchLoyverseStatus,
  syncLoyverse,
  type PosStatus,
} from "../../lib/pos";
import { inputClass, labelClass } from "./FormField";

// A first sync stopped by the time limit carries on by itself, a few times at most.
const MAX_SYNC_ROUNDS = 5;

const formatSyncDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const primaryButton =
  "rounded-full bg-teal-700 px-6 py-3 text-base font-semibold text-white shadow-card transition hover:bg-teal-800 disabled:opacity-60";
const secondaryButton =
  "rounded-full border border-teal-200 px-6 py-3 text-base font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-60";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; connection: PosStatus | null };

export default function LoyverseCard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLoyverseStatus()
      .then((connection) => !cancelled && setState({ kind: "ready", connection }))
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const connection = state.kind === "ready" ? state.connection : null;

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy("connect");
    try {
      const connected = await connectLoyverse(token.trim());
      setToken("");
      setState({ kind: "ready", connection: connected });
      setNotice("Loyverse is connected. Click “Sync sales now” to import your sales.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't connect Loyverse. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    if (!connection) return;
    setError(null);
    setNotice(null);
    setBusy("sync");
    let imported = 0;
    try {
      for (let round = 1; round <= MAX_SYNC_ROUNDS; round++) {
        const result = await syncLoyverse();
        imported += result.imported;
        setState({ kind: "ready", connection: { ...connection, lastSyncedAt: result.lastSyncedAt } });
        if (result.complete) {
          const sales =
            imported === 0 ? "Your sales are up to date." : `${imported} new receipt${imported === 1 ? "" : "s"} imported.`;
          setNotice(result.menuItems === null ? sales : `${sales} Menu updated: ${result.menuItems} items.`);
          return;
        }
      }
      setNotice(`${imported} receipts imported so far. Click “Sync sales now” again to import the rest.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't sync your sales. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setNotice(null);
    setBusy("disconnect");
    try {
      await disconnectLoyverse();
      setState({ kind: "ready", connection: null });
      setConfirmingDisconnect(false);
      setNotice("Loyverse is disconnected. Sales already imported are kept.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't disconnect Loyverse. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
      <div className="flex items-center gap-4">
        <Image
          src="/Loyverse%20logo.png"
          alt="Loyverse logo"
          width={252}
          height={254}
          className="h-10 w-auto flex-none object-contain"
        />
        <h2 className="text-lg font-semibold text-teal-950">Loyverse</h2>
        {connection && (
          <span className="ml-auto inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            Connected
          </span>
        )}
      </div>

      {state.kind === "loading" && (
        <p role="status" className="mt-4 text-sm text-teal-900/70">
          Loading…
        </p>
      )}

      {state.kind === "error" && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          We couldn&apos;t load your Loyverse connection. Please refresh the page.
        </p>
      )}

      {state.kind === "ready" && !connection && (
        <form onSubmit={handleConnect} className="mt-4 flex flex-1 flex-col">
          <p className="text-sm leading-relaxed text-teal-900/65">
            Sync your sales and menu items from Loyverse to see real margins per dish.
          </p>
          <div className="mt-5">
            <label htmlFor="loyverse-token" className={labelClass}>
              Paste your Loyverse access token
            </label>
            <input
              id="loyverse-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-teal-900/60">Loyverse Back Office → Settings → Access tokens</p>
          </div>
          <button type="submit" disabled={busy !== null || token.trim() === ""} className={`mt-6 ${primaryButton}`}>
            {busy === "connect" ? "Checking…" : "Test & connect"}
          </button>
        </form>
      )}

      {state.kind === "ready" && connection && (
        <div className="mt-4 flex flex-1 flex-col">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-teal-900/65">Business</dt>
              <dd className="text-right font-medium text-teal-950">{connection.merchantName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-teal-900/65">Last sync</dt>
              <dd className="text-right font-medium text-teal-950">
                {connection.lastSyncedAt ? formatSyncDate(connection.lastSyncedAt) : "Never"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={handleSync} disabled={busy !== null} className={primaryButton}>
              {busy === "sync" ? "Syncing…" : "Sync sales now"}
            </button>
            {confirmingDisconnect ? (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={busy !== null}
                  className="rounded-full bg-red-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {busy === "disconnect" ? "Disconnecting…" : "Yes, disconnect"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDisconnect(false)}
                  disabled={busy !== null}
                  className={secondaryButton}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(true)}
                disabled={busy !== null}
                className={secondaryButton}
              >
                Disconnect
              </button>
            )}
          </div>
          {busy === "sync" && (
            <p className="mt-3 text-xs text-teal-900/60">
              The first sync imports the last 90 days and can take a few minutes.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {notice}
        </p>
      )}
    </div>
  );
}
