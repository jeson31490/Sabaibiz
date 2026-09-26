-- SabaiBiz: database schema
-- Run this first in the Supabase SQL Editor. Safe to run more than once.
-- 03_team_members.sql replaces the policies below with team-aware ones: if you re-run this file, run 03 again after it.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier_id     uuid references public.suppliers (id) on delete set null,
  invoice_number  text not null,
  invoice_date    date not null,               -- the official date on the invoice, not the scan date
  total           numeric(12, 2) not null default 0,
  status          text not null default 'pending' check (status in ('processed', 'pending', 'error')),
  image_path      text,                        -- path of the scanned image in Storage, when there is one
  created_at      timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table if not exists public.invoice_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_name  text not null,
  quantity      numeric(10, 2) not null check (quantity > 0),
  unit          text not null,
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  line_total    numeric(12, 2) generated always as (quantity * unit_price) stored
);

create table if not exists public.price_alerts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_name    text not null,
  supplier_id     uuid references public.suppliers (id) on delete set null,
  change_percent  numeric(6, 1) not null,      -- +12.2 means the price went up 12.2%
  previous_price  numeric(12, 2) not null,
  current_price   numeric(12, 2) not null,
  unit            text not null,
  period          text not null check (period in ('week', 'month')),
  severity        text not null default 'high' check (severity in ('high', 'medium')),
  is_read         boolean not null default false,
  detected_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists invoices_user_date_idx on public.invoices (user_id, invoice_date desc);
create index if not exists invoices_supplier_idx on public.invoices (supplier_id);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index if not exists invoice_items_user_product_idx on public.invoice_items (user_id, product_name);
create index if not exists price_alerts_user_detected_idx on public.price_alerts (user_id, detected_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: every user only ever sees and changes their own rows
-- ---------------------------------------------------------------------------

alter table public.suppliers     enable row level security;
alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;
alter table public.price_alerts  enable row level security;

drop policy if exists "Own suppliers" on public.suppliers;
create policy "Own suppliers" on public.suppliers
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Own invoices" on public.invoices;
create policy "Own invoices" on public.invoices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Own invoice items" on public.invoice_items;
create policy "Own invoice items" on public.invoice_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Own price alerts" on public.price_alerts;
create policy "Own price alerts" on public.price_alerts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
