-- SabaiBiz: photos of customers' transfer receipts ("Transfers"), taken by the team with their phone
-- Run AFTER 18_team_permissions_attendance.sql and 21_tracker_plan_and_ai_key.sql, in the Supabase SQL Editor.
-- Safe to run more than once.
--
-- Who can do what, inside one business:
--   owner / manager   take photos, see every photo of the business, by day and by person
--   employee          take photos ONLY when the owner switched it on for them; sees their own list (time only)
--   owner             deletes
-- Paid plans only (a free account must cost nothing). The permission is enforced here, in the database.
-- Photos stay 6 months, then the daily cron (app/api/cron/sync-sales) deletes the file and the row.

-- ---------------------------------------------------------------------------
-- Permission per team member (off by default)
-- ---------------------------------------------------------------------------

alter table public.team_members add column if not exists can_scan_payments boolean not null default false;

-- 18 allowed the owner to change can_scan only; add this column to the same owner-only update policy.
grant update (can_scan, can_scan_payments) on public.team_members to authenticated;

-- True when this business is on a paid plan (a business with no row is on the free plan).
create or replace function public.plan_allows_payment_scans()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select bp.plan <> 'free'
       from public.business_plans bp
      where bp.user_id = public.current_business_id()),
    false)
$$;

-- True when the signed-in user may take transfer photos: paid plan, and owner / manager / allowed employee.
create or replace function public.can_scan_payments()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.plan_allows_payment_scans()
     and (
       public.is_business_manager()
       or coalesce(
            (select tm.can_scan_payments
               from public.team_members tm
              where tm.member_user_id = auth.uid()
                and tm.status = 'active'
              limit 1),
            false)
     )
$$;

revoke all on function public.plan_allows_payment_scans() from public, anon;
revoke all on function public.can_scan_payments() from public, anon;
grant execute on function public.plan_allows_payment_scans() to authenticated;
grant execute on function public.can_scan_payments() to authenticated;

-- ---------------------------------------------------------------------------
-- The photos: one row per photo, the file itself is in Storage
-- ---------------------------------------------------------------------------

create table if not exists public.payment_scans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default public.current_business_id() references auth.users (id) on delete cascade,  -- the business
  scanned_by  uuid default auth.uid() references auth.users (id) on delete set null,
  scanned_at  timestamptz not null default now(),
  image_path  text not null check (char_length(image_path) <= 300),
  note        text check (note is null or char_length(note) <= 200)
);

create index if not exists payment_scans_business_idx on public.payment_scans (user_id, scanned_at desc);

alter table public.payment_scans enable row level security;

-- Author and time come from the server, whatever the client sends: nobody can backdate a photo.
create or replace function public.payment_scans_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.scanned_by := auth.uid();
  new.scanned_at := now();
  return new;
end
$$;

drop trigger if exists payment_scans_stamp on public.payment_scans;
create trigger payment_scans_stamp
  before insert on public.payment_scans
  for each row execute function public.payment_scans_stamp();

-- Add: only if allowed, only into your own business folder. There is no UPDATE policy on purpose.
drop policy if exists "Allowed people add transfer photos" on public.payment_scans;
create policy "Allowed people add transfer photos" on public.payment_scans
  for insert to authenticated
  with check (
    user_id = (select public.current_business_id())
    and (select public.can_scan_payments())
    and image_path like (user_id::text || '/%')
  );

-- Read: owner and managers see all; an employee only their own rows.
drop policy if exists "See transfer photos" on public.payment_scans;
create policy "See transfer photos" on public.payment_scans
  for select to authenticated
  using (
    user_id = (select public.current_business_id())
    and ((select public.is_business_manager()) or scanned_by = (select auth.uid()))
  );

-- Delete: the owner only.
drop policy if exists "Owner deletes transfer photos" on public.payment_scans;
create policy "Owner deletes transfer photos" on public.payment_scans
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Private storage bucket (files are served only through short-lived signed links)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-scans', 'payment-scans', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Files live under "<business id>/<day>/<file>". The first folder decides who may touch them.
drop policy if exists "Allowed people upload transfer photos" on storage.objects;
create policy "Allowed people upload transfer photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-scans'
    and (storage.foldername(name))[1] = (select public.current_business_id())::text
    and (select public.can_scan_payments())
  );

drop policy if exists "Managers view transfer photos" on storage.objects;
create policy "Managers view transfer photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-scans'
    and (storage.foldername(name))[1] = (select public.current_business_id())::text
    and (select public.is_business_manager())
  );

drop policy if exists "Owner deletes transfer photos" on storage.objects;
create policy "Owner deletes transfer photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
