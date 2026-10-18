import { isAttendanceNotSetUp, type Absence, type AbsenceKind } from "./attendance";
import { supabase } from "./supabase";

// "Someone declared an absence or a sick day" notices for the owner and managers.
// Rows are created by a database trigger (supabase/19_notifications_live_manager.sql).

export type AppNotification = {
  id: string;
  createdAt: string;
  /** Null while unread. */
  readAt: string | null;
  absence: Absence;
};

type RawNotification = {
  id: string;
  created_at: string;
  read_at: string | null;
  absences: RawAbsence | RawAbsence[] | null;
};

type RawAbsence = {
  id: string;
  employee_id: string;
  kind: AbsenceKind;
  start_date: string;
  end_date: string;
  note: string | null;
};

const first = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** The latest notifications, newest first. Empty (not an error) before the migration has been run. */
export async function fetchNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, created_at, read_at, absences(id, employee_id, kind, start_date, end_date, note)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isAttendanceNotSetUp(error)) return [];
    throw error;
  }
  return ((data ?? []) as unknown as RawNotification[]).flatMap((n) => {
    const a = first(n.absences);
    if (!a) return [];
    return [
      {
        id: n.id,
        createdAt: n.created_at,
        readAt: n.read_at,
        absence: {
          id: a.id,
          employeeId: a.employee_id,
          kind: a.kind,
          startDate: a.start_date,
          endDate: a.end_date,
          note: a.note,
        },
      },
    ];
  });
}

/** Marks every unread notification of the signed-in user as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}
