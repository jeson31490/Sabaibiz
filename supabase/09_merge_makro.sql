-- SabaiBiz: one-off clean-up, merge the 6 "Makro" suppliers of Moustache into "Makro"
-- Run ONCE, AFTER 08_supplier_tax_id.sql, in the Supabase SQL Editor.
-- All or nothing: if two merged suppliers have an invoice with the same number, it stops and
-- changes nothing.

do $$
declare
  business  uuid   := '3f3c7ef1-3a3b-4991-9716-60082ff4a2f7';
  keep      uuid   := '0485459d-258d-411f-94b8-955ac797587d';  -- "Makro"
  merged    uuid[] := array[
    '9b5f9121-1853-4918-aa51-cf8e0971bf26',  -- Makro (บริษัท ซีพี แอ็กซ์ตร้า จำกัด)
    '06b6b2d9-89b1-4c74-9e02-de084adb5971',  -- Makro (บริษัท สยาม แม็คโคร จำกัด มหาชน)
    'c12e9888-dd8b-4d7a-a002-f717a723e7d0',  -- Makro (บริษัท ซีพี แอ็กซ์ตร้า จำกัด มหาชน)
    '57800c16-8792-499f-bb2a-21b63358749c',  -- Makro (บริษัท สยาม แม็คโคร จำกัด)
    '1d734d86-19b8-480e-8791-534bf1b841f1'   -- Makro (บริษัท สยาม แม็คโคร จำกัด (มหาชน))
  ]::uuid[];
  conflicts text;
  moved     integer;
begin
  -- The kept supplier must be this business's "Makro".
  if not exists (select 1 from public.suppliers where id = keep and user_id = business and name = 'Makro') then
    raise exception 'Supplier "Makro" not found: nothing was changed.';
  end if;

  -- Same invoice number under two of the suppliers being merged: stop, nothing changed.
  select string_agg(n, ', ') into conflicts
    from (
      select lower(btrim(invoice_number)) as n
        from public.invoices
       where user_id = business and supplier_id = any (merged || keep)
       group by 1
      having count(*) > 1
    ) d;
  if conflicts is not null then
    raise exception 'Same invoice number in two Makro suppliers: %. Nothing was changed.', conflicts;
  end if;

  update public.invoices
     set supplier_id = keep
   where user_id = business and supplier_id = any (merged);
  get diagnostics moved = row_count;

  update public.price_alerts
     set supplier_id = keep
   where user_id = business and supplier_id = any (merged);

  -- The legal name read on the invoices is kept on "Makro".
  update public.suppliers
     set legal_name = coalesce(legal_name, 'บริษัท ซีพี แอ็กซ์ตร้า จำกัด (มหาชน)')
   where id = keep;

  delete from public.suppliers where user_id = business and id = any (merged);

  raise notice 'Makro merged: % invoices moved, % suppliers removed.', moved, cardinality(merged);
end
$$;

-- Check: one Makro left, with all its invoices (expected: 1 row, 10 invoices).
select s.name, count(i.id) as invoices
  from public.suppliers s
  left join public.invoices i on i.supplier_id = s.id
 where s.user_id = '3f3c7ef1-3a3b-4991-9716-60082ff4a2f7' and s.name ilike 'makro%'
 group by s.name;
