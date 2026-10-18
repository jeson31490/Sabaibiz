import { bangkokToday } from "./invoices";
import { supabase } from "./supabase";

// Clock in/out and absence declarations (supabase/18_team_permissions_attendance.sql).
// Times are set by the database clock; the app can only ask to start or end a shift.

export type Shift = {
  id: string;
  employeeId: string;
  clockIn: string;
  /** Null while the shift is still open. */
  clockOut: string | null;
};

export type AbsenceKind = "absence" | "sick";

export type Absence = {
  id: string;
  employeeId: string;
  kind: AbsenceKind;
  /** YYYY-MM-DD, both ends included. */
  startDate: string;
  endDate: string;
  note: string | null;
};

type RawShift = { id: string | null; employee_id: string; clock_in: string; clock_out: string | null };
type RawAbsence = {
  id: string;
  employee_id: string;
  kind: AbsenceKind;
  start_date: string;
  end_date: string;
  note: string | null;
};

const toShift = (r: RawShift): Shift => ({
  id: r.id as string,
  employeeId: r.employee_id,
  clockIn: r.clock_in,
  clockOut: r.clock_out,
});

const toAbsence = (r: RawAbsence): Absence => ({
  id: r.id,
  employeeId: r.employee_id,
  kind: r.kind,
  startDate: r.start_date,
  endDate: r.end_date,
  note: r.note,
});

const SHIFT_SELECT = "id, employee_id, clock_in, clock_out";
const ABSENCE_SELECT = "id, employee_id, kind, start_date, end_date, note";

/** Supabase answers like this when supabase/18_team_permissions_attendance.sql hasn't been run yet. */
export const isAttendanceNotSetUp = (e: unknown) =>
  typeof e === "object" &&
  e !== null &&
  ["42P01", "PGRST205", "42883", "PGRST202"].includes((e as { code?: string }).code ?? "");

export const NOT_SET_UP_MESSAGE = "Attendance isn't set up in the database yet (run supabase/18_team_permissions_attendance.sql).";

/** Midnight at the start of a Bangkok day, as an instant. */
const bangkokDayStart = (isoDay: string) => `${isoDay}T00:00:00+07:00`;

/** The shift this person has open right now, if any. */
export async function fetchOpenShift(userId: string): Promise<Shift | null> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(SHIFT_SELECT)
    .eq("employee_id", userId)
    .is("clock_out", null)
    .maybeSingle();
  if (error) throw error;
  return data ? toShift(data as RawShift) : null;
}

/** This person's shifts since a Bangkok day (YYYY-MM-DD), newest first. */
export async function fetchMyShifts(userId: string, sinceDay: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(SHIFT_SELECT)
    .eq("employee_id", userId)
    .gte("clock_in", bangkokDayStart(sinceDay))
    .order("clock_in", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RawShift[]).map(toShift);
}

/** Starts a shift now. Pressing it twice returns the shift that is already open. */
export async function clockIn(): Promise<Shift> {
  const { data, error } = await supabase.rpc("clock_in");
  if (error) throw error;
  return toShift(data as RawShift);
}

/** Ends the open shift now. Null when there was nothing to end. */
export async function clockOut(): Promise<Shift | null> {
  const { data, error } = await supabase.rpc("clock_out");
  if (error) throw error;
  // A composite return type comes back as an object whose fields are all null when nothing matched.
  const row = data as RawShift | null;
  return row?.id ? toShift(row) : null;
}

/** Absences that haven't ended yet, plus the last two weeks, for one person. */
export async function fetchMyAbsences(userId: string): Promise<Absence[]> {
  const today = bangkokToday();
  const { data, error } = await supabase
    .from("absences")
    .select(ABSENCE_SELECT)
    .eq("employee_id", userId)
    .gte("end_date", shiftDay(today, -14))
    .order("start_date", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RawAbsence[]).map(toAbsence);
}

export async function declareAbsence(input: {
  kind: AbsenceKind;
  startDate: string;
  endDate: string;
  note: string;
}): Promise<Absence> {
  const { data, error } = await supabase
    .from("absences")
    .insert({
      kind: input.kind,
      start_date: input.startDate,
      end_date: input.endDate,
      note: input.note.trim() || null,
    })
    .select(ABSENCE_SELECT)
    .single();
  if (error) throw error;
  return toAbsence(data as RawAbsence);
}

/** Cancels a declaration that hasn't ended yet. */
export async function cancelAbsence(id: string): Promise<void> {
  const { data, error } = await supabase.from("absences").delete().eq("id", id).select("id");
  if (error) throw error;
  // Row Level Security filters out rows you can't delete (e.g. already over) without an error.
  if (!data || data.length === 0) throw new Error("This declaration can no longer be cancelled.");
}

/** Everyone's shifts in the business since a Bangkok day. Owner and managers only (RLS). */
export async function fetchBusinessShifts(sinceDay: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(SHIFT_SELECT)
    .gte("clock_in", bangkokDayStart(sinceDay))
    .order("clock_in", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RawShift[]).map(toShift);
}

/** Everyone's absences that end on or after a Bangkok day. Owner and managers only (RLS). */
export async function fetchBusinessAbsences(fromDay: string): Promise<Absence[]> {
  const { data, error } = await supabase
    .from("absences")
    .select(ABSENCE_SELECT)
    .gte("end_date", fromDay)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawAbsence[]).map(toAbsence);
}

/** YYYY-MM-DD shifted by a number of days (plain calendar arithmetic). */
export function shiftDay(isoDay: string, days: number): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "7h 05m", or "—" while a shift is still open. */
export function shiftDuration(s: Pick<Shift, "clockIn" | "clockOut">): string {
  if (!s.clockOut) return "—";
  const minutes = Math.max(0, Math.round((Date.parse(s.clockOut) - Date.parse(s.clockIn)) / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

const bangkokTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "08:30" in Bangkok time. */
export const fmtClock = (iso: string) => bangkokTime.format(new Date(iso));

/** "Mon 20 Oct" for a YYYY-MM-DD day. */
export const fmtDay = (isoDay: string) =>
  new Date(`${isoDay}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/** "Mon 20 Oct", or "Mon 20 Oct → Wed 22 Oct". */
export const fmtDayRange = (a: Absence) =>
  a.startDate === a.endDate ? fmtDay(a.startDate) : `${fmtDay(a.startDate)} → ${fmtDay(a.endDate)}`;

export const kindLabel = (k: AbsenceKind) => (k === "sick" ? "Sick" : "Absence");

/** The Bangkok day (YYYY-MM-DD) an instant falls on. */
export const bangkokDayOf = (iso: string) => bangkokToday(new Date(iso));
