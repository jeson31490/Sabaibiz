-- SabaiBiz: cost of each invoice scan, and duplicate invoices per supplier
-- Run AFTER 03_team_members.sql, in the Supabase SQL Editor. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Invoice scans: one row per Claude reading, with the tokens it used
-- ---------------------------------------------------------------------------

-- Every reading is recorded, also when the invoice is read again or never saved, so the
-- average cost per page includes everything that was paid for.
create table if not exists public.invoice_scans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default public.current_business_id() references auth.users (id) on delete cascade,
  scanned_by     uuid default auth.uid() references auth.users (id) on delete set null,
  model          text not null,
  pages          integer not null check (pages > 0),
  input_tokens   integer not null check (input_tokens >= 0),
  output_tokens  integer not null check (output_tokens >= 0),
  succeeded      boolean not null,               -- false when Claude couldn't read the invoice
  created_at     timestamptz not null default now()
);

create index if not exists invoice_scans_user_created_idx on public.invoice_scans (user_id, created_at desc);

-- The reading an invoice was saved from (null for invoices typed in or saved before this file).
alter table public.invoices
  add column if not exists scan_id uuid references public.invoice_scans (id) on delete set null;

alter table public.invoice_scans enable row level security;

-- Recorded by /api/scan-invoice as the signed-in user; readable by the business. No update or delete.
drop policy if exists "Business records scans" on public.invoice_scans;
create policy "Business records scans" on public.invoice_scans
  for insert to authenticated
  with check (user_id = (select public.current_business_id()) and scanned_by = (select auth.uid()));

drop policy if exists "Business sees scans" on public.invoice_scans;
create policy "Business sees scans" on public.invoice_scans
  for select to authenticated
  using (user_id = (select public.current_business_id()));

-- ---------------------------------------------------------------------------
-- Duplicate invoices: the same number is only a duplicate for the same supplier
-- ---------------------------------------------------------------------------

-- Was unique (user_id, invoice_number): two suppliers both printing "0001" blocked each other.
alter table public.invoices drop constraint if exists invoices_user_id_invoice_number_key;
alter table public.invoices drop constraint if exists invoices_user_supplier_number_key;
alter table public.invoices
  add constraint invoices_user_supplier_number_key unique (user_id, supplier_id, invoice_number);
