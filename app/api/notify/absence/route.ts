import { createClient } from "@supabase/supabase-js";
import { linkOrigin } from "../../../../lib/site";

// E-mails the owner and managers when someone declares an absence or a sick day.
// Called by the app right after the declaration is saved. Best effort: the in-app notification
// (created by a database trigger) never depends on this. Without RESEND_API_KEY and NOTIFY_FROM_EMAIL
// it does nothing.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Server-only: finds the managers' e-mail addresses and marks the declaration as e-mailed.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// e.g. "SabaiBiz <notifications@sabaibiz.com>" (the domain must be verified in Resend)
const FROM = process.env.NOTIFY_FROM_EMAIL;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** One line of plain text: no line breaks sneaking into a subject. */
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const fmtDay = (isoDay: string) =>
  new Date(`${isoDay}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Please sign in.", 401);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await asUser.auth.getUser(token);
  if (authError || !auth.user) return jsonError("Your session has expired. Please sign in again.", 401);
  const me = auth.user;

  let body: { absenceId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", 400);
  }
  const absenceId = typeof body.absenceId === "string" && UUID_RE.test(body.absenceId) ? body.absenceId : null;
  if (!absenceId) return jsonError("Missing declaration.", 400);

  if (!SERVICE_ROLE_KEY || !RESEND_API_KEY || !FROM) {
    return Response.json({ sent: false, reason: "email-not-configured" });
  }

  // Read as the user: Row Level Security only lets you see your own declarations (or your team's, as a manager).
  const { data: absence, error: absenceError } = await asUser
    .from("absences")
    .select("id, user_id, employee_id, kind, start_date, end_date, note, email_sent_at")
    .eq("id", absenceId)
    .maybeSingle();
  if (absenceError) {
    // 42703: email_sent_at doesn't exist yet (supabase/19 not run): no e-mails, the app carries on.
    if (absenceError.code === "42703") return Response.json({ sent: false, reason: "not-migrated" });
    console.error("notify/absence: read failed", absenceError.message);
    return jsonError("We couldn't read this declaration.", 500);
  }
  // Only the person who declared it can trigger the e-mail.
  if (!absence || absence.employee_id !== me.id) return jsonError("Declaration not found.", 404);
  if (absence.email_sent_at) return Response.json({ sent: false, reason: "already-sent" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Claim it first so a double tap (or a retry) can't send the e-mail twice.
  const { data: claimed, error: claimError } = await admin
    .from("absences")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", absence.id)
    .is("email_sent_at", null)
    .select("id");
  if (claimError) {
    console.error("notify/absence: claim failed", claimError.message);
    return jsonError("We couldn't send the e-mail.", 500);
  }
  if (!claimed || claimed.length === 0) return Response.json({ sent: false, reason: "already-sent" });

  const unclaim = () => admin.from("absences").update({ email_sent_at: null }).eq("id", absence.id);

  // The owner and every active manager, except the person who declared it.
  const { data: managers, error: managersError } = await admin
    .from("team_members")
    .select("member_user_id")
    .eq("user_id", absence.user_id)
    .eq("status", "active")
    .eq("role", "manager");
  if (managersError) {
    console.error("notify/absence: team read failed", managersError.message);
    await unclaim();
    return jsonError("We couldn't send the e-mail.", 500);
  }
  const recipientIds = new Set<string>([absence.user_id]);
  for (const m of managers ?? []) if (m.member_user_id) recipientIds.add(m.member_user_id);
  recipientIds.delete(absence.employee_id);

  const emails: string[] = [];
  let businessName = "your business";
  for (const id of recipientIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.email) emails.push(data.user.email);
    if (id === absence.user_id) {
      const name = data.user?.user_metadata?.business_name;
      if (typeof name === "string" && name.trim()) businessName = name.trim();
    }
  }
  if (emails.length === 0) return Response.json({ sent: false, reason: "no-recipients" });

  const who = oneLine(String(me.user_metadata?.full_name || me.email || "A team member"));
  const what = absence.kind === "sick" ? "a sick day" : "an absence";
  const dates =
    absence.start_date === absence.end_date
      ? fmtDay(absence.start_date)
      : `${fmtDay(absence.start_date)} → ${fmtDay(absence.end_date)}`;
  const link = `${linkOrigin(request)}/dashboard/team`;
  const text = [
    `${who} declared ${what} at ${businessName}.`,
    "",
    `Dates: ${dates}`,
    ...(absence.note ? [`Note: ${absence.note}`] : []),
    "",
    `See it in SabaiBiz: ${link}`,
  ].join("\n");
  const subject = `${who} declared ${what} (${dates})`;

  // One e-mail each, so nobody sees the others' addresses.
  const results = await Promise.allSettled(
    emails.map(async (to) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to, subject, text }),
      });
      if (!res.ok) throw new Error(`Resend answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }),
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  for (const r of results) if (r.status === "rejected") console.error("notify/absence:", String(r.reason));

  if (sent === 0) {
    // Nothing went out: allow another try.
    await unclaim();
    return jsonError("We couldn't send the e-mail.", 502);
  }
  return Response.json({ sent: true, count: sent });
}
