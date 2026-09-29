-- SabaiBiz: merge two products (Ingredients → "Same as…")
-- Run AFTER 13_product_categories.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- "Chicken breast fillet" is the same product as "Chicken breast": its invoice lines, manual
-- prices and recipe ingredients move to the kept product, then it is deleted. All or nothing.
-- security invoker: Row Level Security applies, so only the user's own business can be touched.

create or replace function public.merge_products(p_from uuid, p_into uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  src   public.products;
  dst   public.products;
  moved integer;
begin
  if p_from = p_into then
    raise exception 'Choose two different products.';
  end if;
  select * into src from public.products where id = p_from for update;
  select * into dst from public.products where id = p_into for update;
  if src.id is null or dst.id is null or src.user_id <> dst.user_id then
    raise exception 'Product not found. Please refresh the page.';
  end if;

  update public.invoice_items      set product_id = dst.id where product_id = src.id;
  get diagnostics moved = row_count;
  update public.manual_prices      set product_id = dst.id where product_id = src.id;
  update public.recipe_ingredients set product_id = dst.id where product_id = src.id;

  -- Keep what the kept product doesn't know yet.
  update public.products
     set category  = coalesce(dst.category, src.category),
         base_unit = coalesce(dst.base_unit, src.base_unit),
         -- Once an invoice has it, it is no longer a hand-made product.
         source    = case when dst.source = 'invoice' or src.source = 'invoice' then 'invoice' else 'manual' end
   where id = dst.id;

  delete from public.products where id = src.id;
  return moved;
end
$$;

revoke all on function public.merge_products(uuid, uuid) from public, anon;
grant execute on function public.merge_products(uuid, uuid) to authenticated;
