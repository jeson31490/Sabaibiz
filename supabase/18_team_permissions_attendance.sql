-- SabaiBiz: per-person scan permission, clock in/out, and absence declarations
-- Run AFTER 03_team_members.sql, in the Supabase SQL Editor. Safe to run more than once.
-- Re-running 03_team_members.sql resets the invoice policies; run this file again afterwards.
--
-- Who can do what, inside one business:
--   owner     everything
--   manager   everything except business settings (unchanged)
--   employee  clock in/out and declare absences, plus scan/see invoices ONLY when the owner allowed it
--
-- The scan permission is enforced here, in the database, not just by hiding buttons.

-- ---------------------------------------------------------------------------
-- Scan permission on a team member
-- ---------------------------------------------------------------------------

-- Existing members keep the access they have today (true); the owner can switch it off per person.
alter table public.team_members add column if not exists can_scan boolean not null default true;

-- True for the owner and for managers.
-- security definer so it can read team_members without going through its RLS.
create or replace function public.is_business_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = public.current_business_id()
      or exists (
        select 1
          from public.team_members tm
         where tm.member_user_id = auth.uid()
           and tm.status = 'active'
           and tm.role = 'manager'
      )
$$;

-- True when the signed-in user may scan and see invoices: owner, manager, or an employee the owner allowed.
create or replace function public.can_scan_invoices()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_business_manager()
      or coalesce(
           (select tm.can_scan
              from public.team_members tm
             where tm.member_user_id = auth.uid()
               and tm.status = 'active'
             limit 1),
           false)
$$;

revoke all on function public.is_business_manager() from public, anon;
revoke all on function public.can_scan_invoices() from public, anon;
grant execute on function public.is_business_manager() to authenticated;
grant execute on function public.can_scan_invoices() to authenticated;

-- The owner may change can_scan and nothing else on a team row (03 deliberately has no general UPDATE:
-- otherwise an owner could point member_user_id at anyone). Column-level privilege + owner-only policy.
revoke update on public.team_members from authenticated;
grant update (can_scan) on public.team_members to authenticated;

drop policy if exists "Owner sets permissions" on public.team_members;
create policy "Owner sets permissions" on public.team_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Managers can see who is on the team (names for the attendance screen). Read-only: they can't invite,
-- remove or change permissions.
drop policy if exists "Manager sees team" on public.team_members;
create policy "Manager sees team" on public.team_members
  for select to authenticated
  using (
    user_id = (select public.current_business_id())
    and (select public.is_business_manager())
  );

-- Restrictive policies are ANDed with the "Business ..." policies from 03: an employee without the
-- scan permission can neither read nor write invoices.
drop policy if exists "Scan permission" on public.invoices;
create policy "Scan permission" on public.invoices
  as restrictive
  for all to authenticated
  using ((select public.can_scan_invoices()))
  with check ((select public.can_scan_invoices()));

drop policy if exists "Scan permission" on public.invoice_items;
create policy "Scan permission" on public.invoice_items
  as restrictive
  for all to authenticated
  using ((select public.can_scan_invoices()))
  with check ((select public.can_scan_invoices()));

-- ---------------------------------------------------------------------------
-- Clock in / clock out
-- ---------------------------------------------------------------------------

create table if not exists public.time_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default public.current_business_id() references auth.users (id) on delete cascade,  -- the business
  employee_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  clock_in     timestamptz not null default now(),
  clock_out    timestamptz,
  check (clock_out is null or clock_out >= clock_in)
);

-- One open shift per person at a time.
create unique index if not exists time_entries_one_open_idx on public.time_entries (employee_id) where clock_out is null;
create index if not exists time_entries_business_idx on public.time_entries (user_id, clock_in desc);
create index if not exists time_entries_employee_idx on public.time_entries (employee_id, clock_in desc);

alter table public.time_entries enable row level security;

-- You see your own shifts; the owner and managers see everyone's in the business.
-- There is no INSERT/UPDATE/DELETE policy on purpose: times are set by the server clock in the
-- functions below, so nobody can write a different time.
drop policy if exists "Read attendance" on public.time_entries;
create policy "Read attendance" on public.time_entries
  for select to authenticated
  using (
    user_id = (select public.current_business_id())
    and (employee_id = (select auth.uid()) or (select public.is_business_manager()))
  );

-- Starts a shift now. Pressing it twice just returns the shift that is already open.
create or replace function public.clock_in()
returns public.time_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.time_entries;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  insert into public.time_entries (user_id, employee_id)
  values (public.current_business_id(), auth.uid())
  on conflict (employee_id) where clock_out is null do nothing
  returning * into entry;

  if entry.id is null then
    select * into entry
      from public.time_entries
     where employee_id = auth.uid() and clock_out is null;
  end if;

  return entry;
end
$$;

-- Ends the open shift now. Returns an all-null row when there was no open shift.
create or replace function public.clock_out()
returns public.time_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.time_entries;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  update public.time_entries
     set clock_out = now()
   where employee_id = auth.uid() and clock_out is null
  returning * into entry;

  return entry;
end
$$;

revoke all on function public.clock_in() from public, anon;
revoke all on function public.clock_out() from public, anon;
grant execute on function public.clock_in() to authenticated;
grant execute on function public.clock_out() to authenticated;

-- ---------------------------------------------------------------------------
-- Absence and sick-day declarations
-- ---------------------------------------------------------------------------

create table if not exists public.absences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default public.current_business_id() references auth.users (id) on delete cascade,  -- the business
  employee_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('absence', 'sick')),
  start_date   date not null,
  end_date     date not null,
  note         text check (note is null or char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 60)
);

create index if not exists absences_business_idx on public.absences (user_id, start_date desc);
create index if not exists absences_employee_idx on public.absences (employee_id, start_date desc);

alter table public.absences enable row level security;

drop policy if exists "Read absences" on public.absences;
create policy "Read absences" on public.absences
  for select to authenticated
  using (
    user_id = (select public.current_business_id())
    and (employee_id = (select auth.uid()) or (select public.is_business_manager()))
  );

-- You can only declare for yourself, in your own business.
drop policy if exists "Declare own absence" on public.absences;
create policy "Declare own absence" on public.absences
  for insert to authenticated
  with check (
    employee_id = (select auth.uid())
    and user_id = (select public.current_business_id())
  );

-- Cancel a declaration that hasn't ended yet (a typo, a change of plan). Owner and managers can too.
drop policy if exists "Cancel absence" on public.absences;
create policy "Cancel absence" on public.absences
  for delete to authenticated
  using (
    user_id = (select public.current_business_id())
    and (employee_id = (select auth.uid()) or (select public.is_business_manager()))
    and end_date >= (now() at time zone 'Asia/Bangkok')::date
  );
