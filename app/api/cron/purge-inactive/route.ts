import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { purgeAccount } from "../../../../lib/accountPurge";
import { SITE_URL } from "../../../../lib/site";
import { createAdminClient } from "../../../../lib/posServer";

// Keeps the Free plan free: a Free account nobody has used for 3 months is warned by e-mail, then deleted a
// week later if still unused. Called daily by Vercel Cron (vercel.json). Add ?dry=1 to see what it WOULD do.
//
// Safety rules (all must hold, otherwise the account is left alone):
//  - an owner on the Free plan (no row in business_plans, or plan = free); never a team member, never a paid plan
//  - no sign-in AND no activity (invoices, scans, daily sales) for 90 days
//  - the warning e-mail was sent at least 7 days ago and the person has done nothing since
//  - e-mail sending is configured (no way to warn = nothing is ever deleted)
//  - any error while checking counts as "active"
export const maxDuration = 300;

const WARN_AFTER_DAYS = 83;
const DELETE_AFTER_DAYS = 90;
const GRACE_DAYS = 7;
const MAX_WARNINGS_PER_RUN = 200;
const MAX_DELETIONS_PER_RUN = 50;
const DAY = 24 * 3600 * 1000;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Latest sign of life in the data, or null when there is none. Throws on a read error (caller treats it as active). */
async function lastDataActivity(admin: SupabaseClient, userId: string): Promise<number | null> {
  const probes: [string, string][] = [
    ["invoices", "created_at"],
    ["invoice_scans", "created_at"],
    ["daily_sales", "updated_at"],
  ];
  let latest: number | null = null;
  for (const [table, column] of probes) {
    const { data, error } = await admin.from(table).select(column).eq("user_id", userId).order(column, { ascending: false }).limit(1);
    if (error) {
      // A table that doesn't exist yet is not a sign of life; any other error is not safe to ignore.
      if (["42P01", "PGRST205"].includes(error.code ?? "")) continue;
      throw new Error(`${table}: ${error.message}`);
    }
    const row = data?.[0] as unknown as Record<string, string> | undefined;
    const t = row ? Date.parse(row[column]) : NaN;
    if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t;
  }
  return latest;
}

async function sendWarning(to: string, businessName: string | null): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  if (!key || !from) return false;
  const name = businessName ? ` (${businessName})` : "";
  const text = [
    `Your free SabaiBiz account${name} has not been used for almost 3 months.`,
    `To keep the service free for everyone, it will be deleted in ${GRACE_DAYS} days, with everything in it.`,
    "",
    `To keep it, just sign in once: ${SITE_URL}/login`,
    `(Want to keep your data? Export it first: Invoices → CSV export.)`,
    "",
    `บัญชี SabaiBiz ฟรีของคุณ${name} ไม่ได้ใช้งานมาเกือบ 3 เดือน`,
    `จะถูกลบพร้อมข้อมูลทั้งหมดใน ${GRACE_DAYS} วัน หากต้องการเก็บไว้ เพียงเข้าสู่ระบบหนึ่งครั้ง: ${SITE_URL}/login`,
  ].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: "Your free SabaiBiz account will be deleted in 7 days", text }),
  });
  return res.ok;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const dry = new URL(request.url).searchParams.get("dry") === "1";

  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "not configured" }, { status: 500 });
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_FROM_EMAIL) {
    return Response.json({ skipped: "e-mail is not configured: nothing is warned or deleted" });
  }

  // Who is a team member, who is on a paid plan.
  const [members, plans] = await Promise.all([
    admin.from("team_members").select("member_user_id").not("member_user_id", "is", null),
    admin.from("business_plans").select("user_id, plan"),
  ]);
  if (members.error || plans.error) {
    console.error("cron/purge-inactive: lookup failed", members.error?.message ?? plans.error?.message);
    return Response.json({ error: "lookup failed" }, { status: 500 });
  }
  const memberIds = new Set((members.data ?? []).map((m) => m.member_user_id as string));
  const paidIds = new Set((plans.data ?? []).filter((p) => p.plan !== "free").map((p) => p.user_id as string));

  const now = Date.now();
  const result = { checked: 0, warned: 0, deleted: 0, reactivated: 0, errors: 0, dry };

  for (let page = 1; page <= 30; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("cron/purge-inactive: listUsers failed", error.message);
      result.errors++;
      break;
    }
    const users: User[] = data.users;
    for (const user of users) {
      if (memberIds.has(user.id) || paidIds.has(user.id) || !user.email) continue;
      result.checked++;
      try {
        const signedIn = Date.parse(user.last_sign_in_at ?? user.created_at);
        const activity = await lastDataActivity(admin, user.id);
        const lastSeen = Math.max(signedIn, activity ?? 0);
        const idleDays = (now - lastSeen) / DAY;
        const warnedAt = Date.parse(String(user.app_metadata?.inactivity_warned_at ?? ""));
        const warned = !Number.isNaN(warnedAt);

        if (warned && lastSeen > warnedAt) {
          // Came back after the warning: all is forgiven.
          if (!dry) await admin.auth.admin.updateUserById(user.id, { app_metadata: { inactivity_warned_at: null } });
          result.reactivated++;
        } else if (!warned && idleDays >= WARN_AFTER_DAYS) {
          if (result.warned >= MAX_WARNINGS_PER_RUN) continue;
          if (dry) {
            result.warned++;
          } else if (await sendWarning(user.email, typeof user.user_metadata?.business_name === "string" ? user.user_metadata.business_name : null)) {
            await admin.auth.admin.updateUserById(user.id, { app_metadata: { inactivity_warned_at: new Date().toISOString() } });
            result.warned++;
          } else {
            result.errors++;
          }
        } else if (warned && idleDays >= DELETE_AFTER_DAYS && now - warnedAt >= GRACE_DAYS * DAY) {
          if (result.deleted >= MAX_DELETIONS_PER_RUN) continue;
          if (dry || (await purgeAccount(admin, user.id, false))) result.deleted++;
          else result.errors++;
        }
      } catch (e) {
        result.errors++;
        console.error(`cron/purge-inactive: ${user.id.slice(0, 8)} left alone:`, e instanceof Error ? e.message : e);
      }
    }
    if (users.length < 1000) break;
  }

  console.log("cron/purge-inactive:", JSON.stringify(result));
  return Response.json(result);
}
