"use client";

import { useEffect, useState, type FormEvent } from "react";
import { fetchSuppliers, mergeSuppliers, renameSupplier, type SupplierRow } from "../../lib/suppliers";

const smallButton =
  "rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-60";
const smallPrimary =
  "rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60";
const fieldClass =
  "w-full rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// One row is edited at a time.
type Editing =
  | { kind: "rename"; id: string; value: string }
  | { kind: "merge"; id: string; intoId: string; confirming: boolean }
  | null;

export default function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<SupplierRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    return fetchSuppliers()
      .then((rows) => {
        setSuppliers(rows);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }

  useEffect(() => {
    let cancelled = false;
    fetchSuppliers()
      .then((rows) => !cancelled && setSuppliers(rows))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  function start(next: Editing) {
    setEditing(next);
    setError(null);
    setNotice(null);
  }

  async function saveRename(e: FormEvent) {
    e.preventDefault();
    if (editing?.kind !== "rename") return;
    setBusy(true);
    setError(null);
    try {
      const name = await renameSupplier(editing.id, editing.value);
      setSuppliers((prev) => (prev ?? []).map((s) => (s.id === editing.id ? { ...s, name } : s)));
      setEditing(null);
      setNotice(`Renamed to "${name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't rename this supplier.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmMerge() {
    if (editing?.kind !== "merge") return;
    const from = suppliers?.find((s) => s.id === editing.id);
    const into = suppliers?.find((s) => s.id === editing.intoId);
    if (!from || !into) return;
    setBusy(true);
    setError(null);
    try {
      const moved = await mergeSuppliers(from.id, into.id);
      setEditing(null);
      setNotice(`${from.name} was merged into ${into.name}: ${plural(moved, "invoice")} moved.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't merge these suppliers.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        We couldn&apos;t load your suppliers. Please refresh the page.
      </p>
    );
  }
  if (!suppliers) {
    return (
      <p role="status" className="mt-6 text-sm text-teal-900/70">
        Loading…
      </p>
    );
  }

  return (
    <>
      <p className="mt-1 text-sm text-teal-900/65">
        Rename a supplier, or merge two that are the same shop (e.g. &quot;MAKRO&quot; and &quot;Makro&quot;) so its prices
        are tracked together.
      </p>

      {notice && (
        <p role="status" className="mt-6 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-teal-100 bg-white shadow-card">
        {suppliers.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-teal-900/60">
            No suppliers yet. They are added when you save an invoice.
          </p>
        ) : (
          <ul className="divide-y divide-teal-100">
            {suppliers.map((s) => {
              const others = suppliers.filter((o) => o.id !== s.id);
              const renaming = editing?.kind === "rename" && editing.id === s.id ? editing : null;
              const merging = editing?.kind === "merge" && editing.id === s.id ? editing : null;
              const into = merging ? suppliers.find((o) => o.id === merging.intoId) : undefined;
              return (
                <li key={s.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      {renaming ? (
                        <form onSubmit={saveRename} className="flex flex-wrap items-center gap-2">
                          <label htmlFor={`rename-${s.id}`} className="sr-only">
                            New name for {s.name}
                          </label>
                          <input
                            id={`rename-${s.id}`}
                            value={renaming.value}
                            onChange={(e) => setEditing({ ...renaming, value: e.target.value })}
                            autoFocus
                            className={`${fieldClass} sm:w-64`}
                          />
                          <button type="submit" disabled={busy || !renaming.value.trim()} className={smallPrimary}>
                            {busy ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => start(null)} disabled={busy} className={smallButton}>
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <p className="font-semibold text-teal-950">{s.name}</p>
                      )}
                      {s.legalName && <p className="mt-0.5 truncate text-xs text-teal-900/55">{s.legalName}</p>}
                      <p className="mt-0.5 text-xs text-teal-900/60">
                        {plural(s.invoices, "invoice")}
                        {s.taxId && ` · Tax ID ${s.taxId}`}
                      </p>
                    </div>
                    {!renaming && !merging && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => start({ kind: "rename", id: s.id, value: s.name })} className={smallButton}>
                          Rename
                        </button>
                        {others.length > 0 && (
                          <button
                            type="button"
                            onClick={() => start({ kind: "merge", id: s.id, intoId: "", confirming: false })}
                            className={smallButton}
                          >
                            Merge into…
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {merging && (
                    <div className="mt-3 rounded-xl bg-teal-50/70 p-4">
                      {!merging.confirming ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-0 flex-1 sm:max-w-xs">
                            <label htmlFor={`merge-${s.id}`} className="block text-xs font-medium text-teal-900/70">
                              Keep this supplier instead of {s.name}
                            </label>
                            <select
                              id={`merge-${s.id}`}
                              value={merging.intoId}
                              onChange={(e) => setEditing({ ...merging, intoId: e.target.value })}
                              className={`mt-1 ${fieldClass}`}
                            >
                              <option value="">Choose a supplier…</option>
                              {others.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name} ({plural(o.invoices, "invoice")})
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            disabled={!merging.intoId}
                            onClick={() => setEditing({ ...merging, confirming: true })}
                            className={smallPrimary}
                          >
                            Continue
                          </button>
                          <button type="button" onClick={() => start(null)} className={smallButton}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-teal-950">
                            Move {plural(s.invoices, "invoice")} from <strong>{s.name}</strong> to{" "}
                            <strong>{into?.name}</strong>, then delete <strong>{s.name}</strong>? This can&apos;t be undone.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={confirmMerge}
                              disabled={busy}
                              className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                              {busy ? "Merging…" : "Yes, merge"}
                            </button>
                            <button type="button" onClick={() => start(null)} disabled={busy} className={smallButton}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
