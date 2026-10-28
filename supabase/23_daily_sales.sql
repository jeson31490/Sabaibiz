-- SabaiBiz: daily takings typed in by hand (or read from a photo of the till's end-of-day receipt)
-- Run AFTER 18_team_permissions_attendance.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- For businesses without Loyverse (or with another till). One row per business and Bangkok day.
-- The owner may enter any day; a manager only the last 7 days. Employees can't see or enter anything.
-- When a day has a manual entry AND Loyverse receipts, the manual figure replaces the Loyverse one for that day.

create table if not exists public.daily_sales (
  user_id     uuid not null default public.current_business_id() references auth.users (id) on delete cascade,
  day         date not null,
  amount      numeric(12, 2) not null check (amount >= 0 and amount < 100000000),
  tickets     integer check (tickets is null or (tickets >= 0 and tickets < 1000000)),
  note        text check (note is null or char_length(note) <= 300),
  source      text not null default 'manual' check (source in ('manual', 'photo')),
  entered_by  uuid not null default auth.uid() references auth.users (id),
  updated_at  timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_sales enable row level security;

-- Whoever saves a row is recorded as its author, whatever the client sends.
create or replace function public.daily_sales_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.entered_by := auth.uid();
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists daily_sales_stamp on public.daily_sales;
create trigger daily_sales_stamp
  before insert or update on public.daily_sales
  for each row execute function public.daily_sales_stamp();

-- Owner and managers read; the owner writes any day, a manager the last 7 days.
drop policy if exists "Managers read daily sales" on public.daily_sales;
create policy "Managers read daily sales" on public.daily_sales
  for select to authenticated
  using (user_id = (select public.current_business_id()) and (select public.is_business_manager()));

drop policy if exists "Managers add daily sales" on public.daily_sales;
create policy "Managers add daily sales" on public.daily_sales
  for insert to authenticated
  with check (
    user_id = (select public.current_business_id())
    and (select public.is_business_manager())
    and (
      (select auth.uid()) = (select public.current_business_id())
      or day >= ((now() at time zone 'Asia/Bangkok')::date - 7)
    )
  );

drop policy if exists "Managers change daily sales" on public.daily_sales;
create policy "Managers change daily sales" on public.daily_sales
  for update to authenticated
  using (
    user_id = (select public.current_business_id())
    and (select public.is_business_manager())
    and (
      (select auth.uid()) = (select public.current_business_id())
      or day >= ((now() at time zone 'Asia/Bangkok')::date - 7)
    )
  )
  with check (
    user_id = (select public.current_business_id())
    and (
      (select auth.uid()) = (select public.current_business_id())
      or day >= ((now() at time zone 'Asia/Bangkok')::date - 7)
    )
  );

drop policy if exists "Owner removes daily sales" on public.daily_sales;
create policy "Owner removes daily sales" on public.daily_sales
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Revenue of a period: Loyverse receipts, except on days that have a manual entry (which replaces them).
-- Same time window as sales_totals (p_from inclusive, p_to exclusive); a manual day counts whole when
-- any part of it falls in the window. security invoker: Row Level Security applies.
create or replace function public.period_revenue(p_from timestamptz, p_to timestamptz)
returns table (revenue numeric, tickets bigint, manual_days bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with manual as (
    select d.day, d.amount, d.tickets
      from public.daily_sales d
     where d.user_id = public.current_business_id()
       and d.day >= (p_from at time zone 'Asia/Bangkok')::date
       and d.day <= ((p_to - interval '1 second') at time zone 'Asia/Bangkok')::date
  ),
  loyverse as (
    select coalesce(sum(s.total_money), 0) as revenue,
           count(*) filter (where s.receipt_type = 'SALE') as tickets
      from public.sales s
     where s.user_id = public.current_business_id()
       and s.receipt_date >= p_from
       and s.receipt_date <  p_to
       and not exists (
         select 1 from manual m where m.day = (s.receipt_date at time zone 'Asia/Bangkok')::date
       )
  )
  select l.revenue + coalesce((select sum(m.amount) from manual m), 0),
         l.tickets + coalesce((select sum(m.tickets) from manual m), 0)::bigint,
         (select count(*) from manual)
    from loyverse l
$$;

revoke all on function public.period_revenue(timestamptz, timestamptz) from public, anon;
grant execute on function public.period_revenue(timestamptz, timestamptz) to authenticated;
