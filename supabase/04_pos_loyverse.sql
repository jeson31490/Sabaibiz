-- SabaiBiz: POS connections (Loyverse) and imported sales
-- Run AFTER 03_team_members.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- Only the server (API routes using the secret key) writes to these tables. The browser can read
-- the business's sales, and the connection status through pos_connection_status(), never the token.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.pos_connections (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,  -- the owner
  provider                text not null check (provider in ('loyverse')),
  access_token_encrypted  text not null,       -- AES-256-GCM, see lib/posCrypto.ts. Never sent to the browser.
  merchant_name           text,
  last_synced_at          timestamptz,         -- null until the first sync
  created_at              timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  provider        text not null check (provider in ('loyverse')),
  external_id     text not null,               -- Loyverse receipt_number
  receipt_type    text not null check (receipt_type in ('SALE', 'REFUND')),
  receipt_date    timestamptz not null,
  total_money     numeric(12, 2) not null default 0,
  total_tax       numeric(12, 2) not null default 0,
  total_discount  numeric(12, 2) not null default 0,
  store_id        text,
  raw             jsonb not null,              -- the full receipt as Loyverse sent it
  created_at      timestamptz not null default now(),
  -- A receipt is imported once, however many times we sync.
  unique (user_id, provider, external_id)
);

create table if not exists public.sale_items (
  id                 uuid primary key default gen_random_uuid(),
  sale_id            uuid not null references public.sales (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  line_index         integer not null,         -- position on the receipt, so a re-sync updates the same line
  external_item_id   text,
  variant_id         text,
  item_name          text not null,
  variant_name       text,
  quantity           numeric(12, 3) not null,  -- 3 decimals for items sold by weight
  price              numeric(12, 2) not null default 0,
  gross_total_money  numeric(12, 2) not null default 0,
  total_money        numeric(12, 2) not null default 0,
  cost               numeric(14, 4),           -- cost per unit from Loyverse, when set there
  cost_total         numeric(14, 4),
  unique (sale_id, line_index)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists sales_user_date_idx on public.sales (user_id, receipt_date desc);
create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists sale_items_user_item_idx on public.sale_items (user_id, external_item_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.pos_connections enable row level security;
alter table public.sales           enable row level security;
alter table public.sale_items      enable row level security;

-- pos_connections holds the encrypted token: no policy at all, and no table access for signed-in
-- users either. Only the secret key (server routes) can read or write it.
revoke all on public.pos_connections from anon, authenticated;

-- Sales are read by the owner and their team. There are no insert/update/delete policies:
-- only the sync route (secret key) writes them.
drop policy if exists "Business sales" on public.sales;
create policy "Business sales" on public.sales
  for select to authenticated
  using (user_id = (select public.current_business_id()));

drop policy if exists "Business sale items" on public.sale_items;
create policy "Business sale items" on public.sale_items
  for select to authenticated
  using (user_id = (select public.current_business_id()));

-- ---------------------------------------------------------------------------
-- Connection status for the browser (no token)
-- ---------------------------------------------------------------------------

-- Connected or not, the shop name and the last sync, for the signed-in user's business.
-- security definer so it can read pos_connections, but it only ever returns these three safe columns.
create or replace function public.pos_connection_status()
returns table (provider text, merchant_name text, last_synced_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select pc.provider, pc.merchant_name, pc.last_synced_at
    from public.pos_connections pc
   where pc.user_id = public.current_business_id()
$$;

revoke all on function public.pos_connection_status() from public, anon;
grant execute on function public.pos_connection_status() to authenticated;
