-- SabaiBiz: new plan lineup (free / solo / team / tracker) and "bring your own AI key".
-- Run AFTER 20_plans_and_quotas.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- 1. The top plan "empire" becomes "tracker". Existing "empire" rows are renamed.
-- 2. Each business can save its own Anthropic API key, stored ENCRYPTED by the server (lib/posCrypto.ts).
--    The browser never reads it: it only asks has_ai_key() whether one exists.
-- 3. Readings made with the business's own key are flagged (own_key) and don't count in the Sabai AI quota.

-- ---------------------------------------------------------------------------
-- 1. Plan names
-- ---------------------------------------------------------------------------

alter table public.business_plans drop constraint if exists business_plans_plan_check;
update public.business_plans set plan = 'tracker' where plan = 'empire';
alter table public.business_plans
  add constraint business_plans_plan_check check (plan in ('free', 'solo', 'team', 'tracker'));

-- ---------------------------------------------------------------------------
-- 2. The business's own AI key
-- ---------------------------------------------------------------------------

create table if not exists public.business_ai_keys (
  user_id        uuid primary key references auth.users (id) on delete cascade,  -- the business = its owner
  key_encrypted  text not null,          -- AES-256-GCM, see lib/posCrypto.ts. Never sent to the browser.
  last4          text not null,          -- shown in Settings so the owner can recognise the key
  created_at     timestamptz not null default now()
);

alter table public.business_ai_keys enable row level security;
-- Deliberately NO policy: only the server (secret key) reads or writes this table.

create or replace function public.has_ai_key()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.business_ai_keys where user_id = (select public.current_business_id()));
$$;

revoke all on function public.has_ai_key() from public;
grant execute on function public.has_ai_key() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Flag the readings made with the business's own key
-- ---------------------------------------------------------------------------

alter table public.invoice_scans add column if not exists own_key boolean not null default false;
