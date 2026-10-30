-- SabaiBiz: subscription plan of each business (free / solo / team / empire)
-- Run AFTER 03_team_members.sql and 05_scan_costs_and_duplicates.sql, in the Supabase SQL Editor.
-- Safe to run more than once.
--
-- The plan decides how many invoice scans a business gets per month (see lib/plans.ts).
-- The app only READS this table. Nobody can change a plan from the browser: only the server with the
-- service role key (the payment webhook, or you in the SQL Editor) can write to it.

create table if not exists public.business_plans (
  user_id             uuid primary key references auth.users (id) on delete cascade,  -- the business = its owner
  plan                text not null default 'free' check (plan in ('free', 'solo', 'team', 'empire')),
  billing_cycle       text not null default 'monthly' check (billing_cycle in ('monthly', '6months', 'yearly')),
  current_period_end  timestamptz,                  -- when the paid period ends; null for free / manual plans
  updated_at          timestamptz not null default now()
);

alter table public.business_plans enable row level security;

-- Read: the owner and their team. Deliberately NO insert/update/delete policy for logged-in users.
drop policy if exists "Business sees plan" on public.business_plans;
create policy "Business sees plan" on public.business_plans
  for select to authenticated
  using (user_id = (select public.current_business_id()));

-- A business with no row is treated as 'free' by the app, so new signups need nothing here.

-- ---------------------------------------------------------------------------
-- Existing accounts: keep the full product for the accounts that exist today
-- (your own Moustache account, the demo account…). Change the plan afterwards with, for example:
--   update public.business_plans set plan = 'team' where user_id = '<owner uuid>';
-- Team members are not businesses, so they get no row.
-- ---------------------------------------------------------------------------

insert into public.business_plans (user_id, plan)
select u.id, 'empire'
  from auth.users u
 where u.id not in (select member_user_id from public.team_members where member_user_id is not null)
on conflict (user_id) do nothing;
