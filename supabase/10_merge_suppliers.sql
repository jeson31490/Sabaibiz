-- SabaiBiz: merge two suppliers (Settings → Suppliers → "Merge into…")
-- Run AFTER 08_supplier_tax_id.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- Moves every invoice (and price alert) of one supplier to another, then deletes the first one.
-- Only the business owner can do it, and only with suppliers of their own business. All or nothing:
-- if both suppliers have an invoice with the same number, nothing is changed.

create or replace function public.merge_suppliers(p_from uuid, p_into uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  business  uuid := public.current_business_id();
  src       public.suppliers;
  dst       public.suppliers;
  conflicts text;
  moved     integer;
begin
  -- For a team member current_business_id() is the owner's id, not their own.
  if auth.uid() is null or business is distinct from auth.uid() then
    raise exception 'Only the business owner can merge suppliers.';
  end if;
  if p_from = p_into then
    raise exception 'Choose two different suppliers.';
  end if;

  select * into src from public.suppliers where id = p_from and user_id = business for update;
  select * into dst from public.suppliers where id = p_into and user_id = business for update;
  if src.id is null or dst.id is null then
    raise exception 'Supplier not found. Please refresh the page.';
  end if;

  select string_agg(distinct a.invoice_number, ', ') into conflicts
    from public.invoices a
    join public.invoices b
      on lower(btrim(a.invoice_number)) = lower(btrim(b.invoice_number))
   where a.user_id = business and b.user_id = business
     and a.supplier_id = src.id and b.supplier_id = dst.id;
  if conflicts is not null then
    raise exception '% and % both have invoice number %. Change one of these numbers first (Invoices → View → Edit). Nothing was merged.',
      src.name, dst.name, conflicts;
  end if;

  update public.invoices set supplier_id = dst.id where user_id = business and supplier_id = src.id;
  get diagnostics moved = row_count;
  update public.price_alerts set supplier_id = dst.id where user_id = business and supplier_id = src.id;

  delete from public.suppliers where id = src.id;

  -- Keep what we knew about the merged supplier (after the delete: tax IDs are unique).
  update public.suppliers
     set tax_id     = coalesce(dst.tax_id, src.tax_id),
         legal_name = coalesce(dst.legal_name, src.legal_name)
   where id = dst.id;

  return moved;
end
$$;

revoke all on function public.merge_suppliers(uuid, uuid) from public, anon;
grant execute on function public.merge_suppliers(uuid, uuid) to authenticated;
