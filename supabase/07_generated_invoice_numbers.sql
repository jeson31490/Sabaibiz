-- SabaiBiz: invoices without a number (market stalls, small family suppliers)
-- Run AFTER 05_scan_costs_and_duplicates.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- An invoice saved without a number gets an internal reference AUTO-YYYYMMDD-001, where the date
-- is the invoice date and the counter restarts every day, per business. The database makes it, so
-- two phones saving at the same moment never get the same reference.

alter table public.invoices
  add column if not exists is_generated_number boolean not null default false;

create or replace function public.set_generated_invoice_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prefix text;
  next_n integer;
begin
  -- A number typed or read from the invoice is always a real one.
  if new.invoice_number is not null and btrim(new.invoice_number) <> '' then
    new.is_generated_number := false;
    return new;
  end if;

  prefix := 'AUTO-' || to_char(new.invoice_date, 'YYYYMMDD') || '-';
  -- One business + day at a time, until this transaction ends.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || prefix));

  select coalesce(max(substring(i.invoice_number from length(prefix) + 1)::integer), 0) + 1
    into next_n
    from public.invoices i
   where i.user_id = new.user_id
     and i.is_generated_number
     and i.invoice_number ~ ('^' || prefix || '[0-9]+$');

  new.invoice_number := prefix || lpad(next_n::text, 3, '0');
  new.is_generated_number := true;
  return new;
end
$$;

drop trigger if exists invoices_generated_number on public.invoices;
create trigger invoices_generated_number
  before insert on public.invoices
  for each row execute function public.set_generated_invoice_number();
