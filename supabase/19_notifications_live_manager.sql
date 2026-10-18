-- SabaiBiz: absence notifications, live updates, and owner-only sales
-- Run AFTER 18_team_permissions_attendance.sql (and 04_pos_loyverse.sql), in the Supabase SQL Editor.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- In-app notifications: someone declared an absence or a sick day
-- ---------------------------------------------------------------------------

-- Set by the server once the e-mail for this declaration has been sent, so it is only ever sent once.
alter table public.absences add column if not exists email_sent_at timestamptz;

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,  -- the business
  recipient_id  uuid not null references auth.users (id) on delete cascade,  -- who gets notified
  -- Cancelling a declaration removes its notifications too.
  absence_id    uuid not null references public.absences (id) on delete cascade,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- You only ever see your own notifications.
drop policy if exists "Read own notifications" on public.notifications;
create policy "Read own notifications" on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

-- ...and the only thing you can change is whether you have read them. Rows are created by the
-- trigger below, never by the app.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Mark own notifications read" on public.notifications;
create policy "Mark own notifications read" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- When someone declares an absence or sick day, notify the owner and every active manager
-- (but not the person who declared it).
create or replace function public.notify_absence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, recipient_id, absence_id)
  select new.user_id, r.id, new.id
    from (
      select new.user_id as id
      union
      select tm.member_user_id
        from public.team_members tm
       where tm.user_id = new.user_id
         and tm.status = 'active'
         and tm.role = 'manager'
         and tm.member_user_id is not null
    ) r
   where r.id <> new.employee_id;
  return new;
end
$$;

revoke all on function public.notify_absence() from public, anon, authenticated;

drop trigger if exists absences_notify on public.absences;
create trigger absences_notify
  after insert on public.absences
  for each row execute function public.notify_absence();

-- ---------------------------------------------------------------------------
-- Live updates (Supabase Realtime): new notifications, absences, clock-ins and invoices show up
-- on the Team and Today screens without reloading. Row Level Security still decides who gets what.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['notifications', 'absences', 'time_entries', 'invoices'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Sales (POS revenue) are for the owner only
-- ---------------------------------------------------------------------------

-- Managers don't see the owner's dashboard, so they don't read the sales behind it either.
-- Restrictive and SELECT-only: it is ANDed with the existing business policy, and writes
-- (the POS sync) are untouched.
do $$
begin
  if to_regclass('public.sales') is not null then
    drop policy if exists "Owner reads sales" on public.sales;
    create policy "Owner reads sales" on public.sales
      as restrictive
      for select to authenticated
      using ((select auth.uid()) = (select public.current_business_id()));
  end if;

  if to_regclass('public.sale_items') is not null then
    drop policy if exists "Owner reads sale items" on public.sale_items;
    create policy "Owner reads sale items" on public.sale_items
      as restrictive
      for select to authenticated
      using ((select auth.uid()) = (select public.current_business_id()));
  end if;
end
$$;
