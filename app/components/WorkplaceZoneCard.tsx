"use client";

import { useEffect, useState } from "react";
import { fetchZone, getPosition, saveZone, ZONE_RADII, type WorkplaceZone } from "../../lib/zone";

// Owner: switch the "in zone / out of zone" check on and mark the workplace.
export default function WorkplaceZoneCard() {
  const [zone, setZone] = useState<WorkplaceZone>({ enabled: false, lat: null, lng: null, radiusM: 150 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchZone()
      .then((z) => !cancelled && z && setZone(z))
      .catch(() => !cancelled && setError("The workplace zone isn't set up yet. Please try again in a few minutes."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: WorkplaceZone, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveZone(next);
      setZone(next);
      setMessage(done);
    } catch {
      setError("We couldn't save this. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function markHere() {
    setBusy(true);
    setError("");
    setMessage("");
    const p = await getPosition(15000);
    setBusy(false);
    if (!p) {
      setError("We couldn't get your position. Allow location for this site in your browser, then try again from the workplace.");
      return;
    }
    await persist({ ...zone, lat: p.lat, lng: p.lng }, "Workplace saved.");
  }

  const placed = zone.lat !== null && zone.lng !== null;

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-teal-950">Check presence at clock-in</h2>
        <p className="mt-2 text-sm text-teal-900/75">
          When an employee clocks in or out, their phone shares its position once. SabaiBiz only keeps the result:{" "}
          <strong>in zone</strong>, <strong>out of zone</strong> or <strong>location not shared</strong>. The position itself is never
          stored, and the results are erased after 3 months.
        </p>
        <p className="mt-2 text-sm text-teal-900/75">
          You are responsible for telling your team (a short notice is shown on their clock-in screen). A phone&apos;s position can be
          faked: this discourages clocking in from home, it is not a proof.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-teal-900/65">Loading…</p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={markHere} disabled={busy} className="rounded-full bg-gold-500 px-6 py-3 font-semibold transition hover:bg-gold-400 disabled:opacity-60">
                {placed ? "Move the workplace to where I am now" : "Set the workplace to where I am now"}
              </button>
              <span className="text-sm text-teal-900/65">{placed ? "Workplace is set." : "Do this while you are at the workplace."}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label htmlFor="zone-radius" className="text-sm font-medium text-teal-900">
                Zone radius
              </label>
              <select
                id="zone-radius"
                value={zone.radiusM}
                disabled={busy}
                onChange={(e) => persist({ ...zone, radiusM: Number(e.target.value) }, "Radius saved.")}
                className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-teal-950"
              >
                {ZONE_RADII.map((r) => (
                  <option key={r} value={r}>
                    {r} m
                  </option>
                ))}
              </select>
            </div>

            <label className="mt-5 flex items-center gap-3 text-teal-950">
              <input
                type="checkbox"
                checked={zone.enabled}
                disabled={busy || !placed}
                onChange={(e) => persist({ ...zone, enabled: e.target.checked }, e.target.checked ? "The check is on." : "The check is off.")}
                className="h-5 w-5 accent-[#19D3B5]"
              />
              <span className="font-medium">Turn the check on</span>
              {!placed && <span className="text-sm text-teal-900/60">(set the workplace first)</span>}
            </label>
          </>
        )}

        {message && (
          <p role="status" className="mt-4 text-sm font-medium text-teal-700">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
