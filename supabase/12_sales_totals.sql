-- SabaiBiz: sales totals for the dashboard period selector
-- Run AFTER 04_pos_loyverse.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- Adds up the business's sales between two moments in the database (a month is thousands of
-- receipts, more than one API request returns). Refunds are stored negative, so they are deducted.
-- security invoker: Row Level Security applies, a user only ever sees their own business.

create or replace function public.sales_totals(p_from timestamptz, p_to timestamptz)
returns table (revenue numeric, tickets bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(s.total_money), 0)                        as revenue,
         count(*) filter (where s.receipt_type = 'SALE')        as tickets
    from public.sales s
   where s.user_id = public.current_business_id()
     and s.receipt_date >= p_from
     and s.receipt_date <  p_to
$$;

revoke all on function public.sales_totals(timestamptz, timestamptz) from public, anon;
grant execute on function public.sales_totals(timestamptz, timestamptz) to authenticated;
