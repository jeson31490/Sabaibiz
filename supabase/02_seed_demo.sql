-- SabaiBiz: demo data for demo@sabaibiz.com
-- Run AFTER 01_schema.sql. The demo user must already exist:
--   Supabase dashboard > Authentication > Users > Add user (tick "Auto Confirm User"),
--   or sign up at /signup and confirm the email.
-- Safe to run again: it wipes the demo account's invoices, suppliers and alerts first.
-- Dates are relative to today, so the data always covers the last ~3 months.

-- Linear interpolation of a price over time. anchors = [[days_ago, price], ...], oldest first.
create or replace function pg_temp.price_at(anchors jsonb, d numeric)
returns numeric language plpgsql immutable as $$
declare
  n int := jsonb_array_length(anchors);
  i int;
  a_d numeric; a_p numeric; b_d numeric; b_p numeric;
begin
  if d >= (anchors -> 0 ->> 0)::numeric then
    return (anchors -> 0 ->> 1)::numeric;
  end if;
  for i in 0 .. n - 2 loop
    a_d := (anchors -> i ->> 0)::numeric;
    a_p := (anchors -> i ->> 1)::numeric;
    b_d := (anchors -> (i + 1) ->> 0)::numeric;
    b_p := (anchors -> (i + 1) ->> 1)::numeric;
    if d <= a_d and d >= b_d then
      return a_p + (b_p - a_p) * (a_d - d) / (a_d - b_d);
    end if;
  end loop;
  return (anchors -> (n - 1) ->> 1)::numeric;
end
$$;

do $seed$
declare
  demo_id  uuid;
  inv_id   uuid;
  sup_id   uuid;
  sup      jsonb;
  prod     text;
  pdef     jsonb;
  k        int;
  d        int;
  inv_no   text;
  qty      numeric;
  price    numeric;
  noise    numeric;
  st       text;

  -- Price history per product: [[days ago, price in baht], ...], oldest first.
  -- Chicken jumps ~12% over the last 8 days; tiger shrimp climbs ~8% over the last month.
  products jsonb := $j$
  {
    "Chicken breast":   {"unit": "kg",   "qmin": 8,  "qmax": 20,  "anchors": [[90,118],[60,121],[30,126],[8,131],[0,147]]},
    "Pork belly":       {"unit": "kg",   "qmin": 6,  "qmax": 15,  "anchors": [[90,188],[60,190],[30,192],[0,193]]},
    "Tiger shrimp":     {"unit": "kg",   "qmin": 3,  "qmax": 10,  "anchors": [[90,420],[60,440],[30,470],[0,508]]},
    "Cooking oil":      {"unit": "litre","qmin": 10, "qmax": 30,  "anchors": [[90,52],[60,54],[30,58],[0,61]]},
    "Jasmine rice":     {"unit": "kg",   "qmin": 25, "qmax": 100, "anchors": [[90,34],[0,36]]},
    "Mixed vegetables": {"unit": "kg",   "qmin": 10, "qmax": 30,  "anchors": [[90,32],[60,30],[30,34],[0,35]]},
    "Fresh lime":       {"unit": "kg",   "qmin": 3,  "qmax": 8,   "anchors": [[90,55],[60,70],[30,85],[0,60]]},
    "Eggs (tray of 30)":{"unit": "tray", "qmin": 4,  "qmax": 12,  "anchors": [[90,118],[0,126]]},
    "Coconut milk":     {"unit": "litre","qmin": 5,  "qmax": 15,  "anchors": [[90,62],[0,64]]},
    "Squid":            {"unit": "kg",   "qmin": 3,  "qmax": 8,   "anchors": [[90,210],[60,225],[30,215],[0,220]]},
    "Sea bass":         {"unit": "kg",   "qmin": 4,  "qmax": 10,  "anchors": [[90,290],[0,305]]}
  }
  $j$::jsonb;

  -- Suppliers, their price level relative to the catalogue above, and what they sell.
  sup_defs jsonb := $j$
  [
    {"name": "Makro Samui",          "mult": 1.03, "products": ["Chicken breast","Pork belly","Cooking oil","Jasmine rice","Eggs (tray of 30)"]},
    {"name": "Lotus's Samui",        "mult": 0.99, "products": ["Cooking oil","Jasmine rice","Mixed vegetables","Coconut milk","Eggs (tray of 30)"]},
    {"name": "Chaweng Fresh Market", "mult": 1.00, "products": ["Chicken breast","Mixed vegetables","Fresh lime","Pork belly"]},
    {"name": "Samui Seafood Co.",    "mult": 1.00, "products": ["Tiger shrimp","Squid","Sea bass"]},
    {"name": "Lamai Meat Supply",    "mult": 0.98, "products": ["Pork belly","Chicken breast"]}
  ]
  $j$::jsonb;
begin
  select id into demo_id from auth.users where email = 'demo@sabaibiz.com';
  if demo_id is null then
    raise exception 'User demo@sabaibiz.com does not exist yet. Create it first (Authentication > Users > Add user), then run this script again.';
  end if;

  -- Start clean so the script can be re-run (invoice_items go with their invoices).
  delete from public.price_alerts where user_id = demo_id;
  delete from public.invoices     where user_id = demo_id;
  delete from public.suppliers    where user_id = demo_id;

  for sup in select value from jsonb_array_elements(sup_defs) loop
    insert into public.suppliers (user_id, name) values (demo_id, sup ->> 'name');
  end loop;

  -- 36 invoices, one every ~2.5 days, from today back to 89 days ago.
  for k in 0 .. 35 loop
    d   := round(k * 2.55)::int;
    sup := sup_defs -> (k % 5);
    inv_no := 'INV-' || lpad((1100 + 36 - k)::text, 4, '0');
    st := case when k in (0, 1) then 'pending' when k = 9 then 'error' else 'processed' end;

    select id into sup_id from public.suppliers where user_id = demo_id and name = sup ->> 'name';

    insert into public.invoices (user_id, supplier_id, invoice_number, invoice_date, total, status)
    values (demo_id, sup_id, inv_no, current_date - d, 0, st)
    returning id into inv_id;

    for prod in select jsonb_array_elements_text(sup -> 'products') loop
      pdef := products -> prod;
      qty  := (pdef ->> 'qmin')::int
              + abs(hashtext(inv_no || prod)) % ((pdef ->> 'qmax')::int - (pdef ->> 'qmin')::int + 1);
      -- Small +/-1.5% day-to-day wobble, none in the last 8 days so the recent jumps stay clean.
      noise := case when d > 8 then 1 + ((abs(hashtext(prod || d::text)) % 31) - 15) / 1000.0 else 1 end;
      price := pg_temp.price_at(pdef -> 'anchors', d) * (sup ->> 'mult')::numeric * noise;
      price := case when price >= 100 then round(price) else round(price, 1) end;

      insert into public.invoice_items (invoice_id, user_id, product_name, quantity, unit, unit_price)
      values (inv_id, demo_id, prod, qty, pdef ->> 'unit', price);
    end loop;

    update public.invoices
       set total = (select coalesce(sum(line_total), 0) from public.invoice_items where invoice_id = inv_id)
     where id = inv_id;
  end loop;

  -- Price alerts shown on the dashboard.
  insert into public.price_alerts
    (user_id, product_name, supplier_id, change_percent, previous_price, current_price, unit, period, severity, detected_at)
  values
    (demo_id, 'Chicken breast',
      (select id from public.suppliers where user_id = demo_id and name = 'Chaweng Fresh Market'),
      12.2, 131, 147, 'kg', 'week', 'high', now() - interval '1 day'),
    (demo_id, 'Tiger shrimp',
      (select id from public.suppliers where user_id = demo_id and name = 'Samui Seafood Co.'),
       8.1, 470, 508, 'kg', 'month', 'high', now() - interval '2 days'),
    (demo_id, 'Cooking oil',
      (select id from public.suppliers where user_id = demo_id and name = 'Makro Samui'),
       5.2, 58, 61, 'litre', 'month', 'medium', now() - interval '3 days');

  raise notice 'Demo data created for % (user id %).', 'demo@sabaibiz.com', demo_id;
end
$seed$;

-- Quick check: run this afterwards to see what was created.
select
  (select count(*) from public.suppliers     where user_id = u.id) as suppliers,
  (select count(*) from public.invoices      where user_id = u.id) as invoices,
  (select count(*) from public.invoice_items where user_id = u.id) as invoice_items,
  (select count(*) from public.price_alerts  where user_id = u.id) as price_alerts,
  (select min(invoice_date) from public.invoices where user_id = u.id) as first_invoice,
  (select max(invoice_date) from public.invoices where user_id = u.id) as last_invoice
from auth.users u
where u.email = 'demo@sabaibiz.com';
