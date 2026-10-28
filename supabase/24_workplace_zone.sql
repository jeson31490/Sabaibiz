-- SabaiBiz: "in zone / out of zone" check when someone clocks in or out
-- Run AFTER 18_team_permissions_attendance.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- The owner switches it on and marks the workplace (a point and a radius). When an employee clocks in or
-- out, the phone's position is sent to clock_in / clock_out, which only keeps a RESULT: in / out / unknown
-- (position not shared). The coordinates themselves are never stored. The results are erased after 3 months
-- (purge_old_zone_checks, called by the daily cron); the shift times themselves are kept.

create table if not exists public.business_zone (
  user_id    uuid primary key default public.current_business_id() references auth.users (id) on delete cascade,
  enabled    boolean not null default false,
  lat        double precision check (lat between -90 and 90),
  lng        double precision check (lng between -180 and 180),
  radius_m   integer not null default 150 check (radius_m between 30 and 2000),
  updated_at timestamptz not null default now()
);

alter table public.business_zone enable row level security;

-- Only the owner reads and sets the workplace point. Everybody else only learns whether the check is on (zone_required).
drop policy if exists "Owner reads zone" on public.business_zone;
create policy "Owner reads zone" on public.business_zone
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Owner adds zone" on public.business_zone;
create policy "Owner adds zone" on public.business_zone
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Owner changes zone" on public.business_zone;
create policy "Owner changes zone" on public.business_zone
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.time_entries add column if not exists clock_in_zone text check (clock_in_zone in ('in', 'out', 'unknown'));
alter table public.time_entries add column if not exists clock_out_zone text check (clock_out_zone in ('in', 'out', 'unknown'));

-- Is the check switched on for my business? (Employees need to know, to ask the phone for its position.)
create or replace function public.zone_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select z.enabled and z.lat is not null and z.lng is not null
       from public.business_zone z
      where z.user_id = public.current_business_id()),
    false)
$$;

-- 'in' / 'out' / 'unknown' for a position, or null when the check is off. Nothing about the position is kept.
create or replace function public.zone_result(p_lat double precision, p_lng double precision)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  z public.business_zone;
  a double precision;
  dist double precision;
begin
  select * into z from public.business_zone where user_id = public.current_business_id();
  if z.user_id is null or not z.enabled or z.lat is null or z.lng is null then
    return null;
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return 'unknown';
  end if;
  -- Haversine distance in metres.
  a := power(sin(radians(p_lat - z.lat) / 2), 2)
     + cos(radians(z.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - z.lng) / 2), 2);
  dist := 2 * 6371000 * asin(least(1, sqrt(a)));
  return case when dist <= z.radius_m then 'in' else 'out' end;
end
$$;

-- The old no-argument versions go: the new ones take an optional position (a call without one still works).
drop function if exists public.clock_in();
drop function if exists public.clock_out();

create or replace function public.clock_in(p_lat double precision default null, p_lng double precision default null)
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

  insert into public.time_entries (user_id, employee_id, clock_in_zone)
  values (public.current_business_id(), auth.uid(), public.zone_result(p_lat, p_lng))
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

create or replace function public.clock_out(p_lat double precision default null, p_lng double precision default null)
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
     set clock_out = now(),
         clock_out_zone = public.zone_result(p_lat, p_lng)
   where employee_id = auth.uid() and clock_out is null
  returning * into entry;

  return entry;
end
$$;

revoke all on function public.zone_required() from public, anon;
revoke all on function public.zone_result(double precision, double precision) from public, anon;
revoke all on function public.clock_in(double precision, double precision) from public, anon;
revoke all on function public.clock_out(double precision, double precision) from public, anon;
grant execute on function public.zone_required() to authenticated;
grant execute on function public.zone_result(double precision, double precision) to authenticated;
grant execute on function public.clock_in(double precision, double precision) to authenticated;
grant execute on function public.clock_out(double precision, double precision) to authenticated;

-- Erases the zone results older than 3 months (the shifts stay). Called by the daily cron, server side only.
create or replace function public.purge_old_zone_checks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.time_entries
     set clock_in_zone = null, clock_out_zone = null
   where clock_in < now() - interval '3 months'
     and (clock_in_zone is not null or clock_out_zone is not null);
  get diagnostics n = row_count;
  return n;
end
$$;

revoke all on function public.purge_old_zone_checks() from public, anon, authenticated;
grant execute on function public.purge_old_zone_checks() to service_role;
