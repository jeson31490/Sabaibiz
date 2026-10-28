-- SabaiBiz: payroll. The owner keeps a list of staff with their monthly salary and prints payslips.
-- Run in the Supabase SQL Editor. Safe to run more than once. Owner only: no manager or employee can read it.

create table if not exists public.payroll_staff (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,  -- the business = its owner
  name         text not null check (char_length(name) between 1 and 120),
  role_title   text,
  base_salary  numeric(12, 2) not null check (base_salary >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists payroll_staff_user_idx on public.payroll_staff (user_id);

alter table public.payroll_staff enable row level security;

drop policy if exists "owner reads payroll" on public.payroll_staff;
drop policy if exists "owner writes payroll" on public.payroll_staff;
create policy "owner reads payroll" on public.payroll_staff for select using (user_id = auth.uid());
create policy "owner writes payroll" on public.payroll_staff for all using (user_id = auth.uid()) with check (user_id = auth.uid());
