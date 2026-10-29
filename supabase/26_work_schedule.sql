-- SabaiBiz: planned working hours per team member (e.g. 08:00 - 17:00)
-- Run AFTER 18_team_permissions_attendance.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- The planned hours are only used to show the owner whether someone arrived and left on time.
-- Clock times NEVER add up to overtime or pay: overtime is only what the owner types in the payroll.

alter table public.team_members add column if not exists work_start time;
alter table public.team_members add column if not exists work_end time;

-- The owner may change these columns (the owner-only update policy from 18 applies).
grant update (work_start, work_end) on public.team_members to authenticated;

-- Employees see only TODAY's clock times (and a shift still open, so they can clock out): never the arrival and
-- departure times of earlier days. The owner and managers still see the whole history.
drop policy if exists "Read attendance" on public.time_entries;
create policy "Read attendance" on public.time_entries
  for select to authenticated
  using (
    user_id = (select public.current_business_id())
    and (
      (select public.is_business_manager())
      or (
        employee_id = (select auth.uid())
        and (
          clock_out is null
          or clock_in >= (date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok')
        )
      )
    )
  );
