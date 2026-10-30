-- SabaiBiz: the Free plan must always cost nothing to host
-- Run in the Supabase SQL Editor. Safe to run more than once.
--
-- Invoice photos are never stored (they are read and thrown away), so the only things a Free account can pile up
-- are database rows and one profile photo. This puts a hard ceiling on both, enforced by the database itself
-- (an API call from outside the app is stopped too):
--   * Free plan (a business with no row in business_plans counts as Free): a maximum number of rows per table.
--   * Every plan: a maximum size per row, so nobody can park a huge text in a note or a name.
--   * Profile photos: 1 MB, JPG / PNG / WebP.
-- Paid plans keep no row-count limit (they pay for their hosting).

create or replace function public.enforce_row_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap     text    := tg_argv[0];   -- Free-plan row limit for this table; 'none' = no limit
  label   text    := tg_argv[1];   -- what to call the rows in the message
  plan_id text;
  n       bigint;
begin
  -- Whatever the plan: one row is never allowed to be big.
  if pg_column_size(new) > 16384 then
    raise exception 'This entry is too large.' using errcode = '54000';
  end if;

  if tg_op = 'INSERT' and cap <> 'none' then
    select bp.plan into plan_id from public.business_plans bp where bp.user_id = new.user_id;
    if coalesce(plan_id, 'free') = 'free' then
      execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
        into n using new.user_id;
      if n >= cap::bigint then
        raise exception 'Free plan limit reached (% %). Upgrade to keep adding.', cap, label
          using errcode = '53400';
      end if;
    end if;
  end if;
  return new;
end
$$;

revoke all on function public.enforce_row_limits() from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('invoices',           '120',  'invoices'),
      ('invoice_items',      '2000', 'invoice lines'),
      ('suppliers',          '40',   'suppliers'),
      ('products',           '400',  'products'),
      ('manual_prices',      '800',  'prices'),
      ('recipes',            '40',   'recipes'),
      ('recipe_ingredients', '400',  'recipe lines'),
      ('daily_sales',        '400',  'days of sales'),
      ('payroll_staff',      '5',    'payroll people'),
      ('absences',           '100',  'absences'),
      ('time_entries',       '400',  'shifts'),
      -- Loyverse receipts are a paid feature: nothing is imported on Free.
      ('sales',              '0',    'receipts'),
      ('sale_items',         '0',    'receipt lines')
    ) as v(tbl, cap, label)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop trigger if exists row_limits on public.%I', t.tbl);
      execute format(
        'create trigger row_limits before insert or update on public.%I
           for each row execute function public.enforce_row_limits(%L, %L)',
        t.tbl, t.cap, t.label);
    end if;
  end loop;
end
$$;

-- Profile photos: 1 MB, a few image types (the bucket was created by hand; this only changes its limits).
update storage.buckets
   set file_size_limit = 1048576,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'avatars';
