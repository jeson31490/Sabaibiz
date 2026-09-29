-- SabaiBiz: total printed on each invoice line, line checks, and line discounts
-- Run AFTER 15_original_names.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- printed_line_total: the line's total as printed (after any line discount, frequent at Makro).
-- When it is higher than quantity × unit price by more than 1 ฿, the line is flagged "line_mismatch"
-- (Check line) until the owner corrects it or confirms it. When it is lower, it is a discount: the
-- real unit price is printed_line_total ÷ quantity, and that is the price used for ingredients.
-- Invoices scanned before this file have no printed line total (quantity × unit price is shown).

alter table public.invoice_items
  add column if not exists printed_line_total numeric(12, 2) check (printed_line_total >= 0);

alter table public.invoice_items drop constraint if exists invoice_items_review_reason_check;
alter table public.invoice_items
  add constraint invoice_items_review_reason_check check (review_reason in ('suspect_price', 'line_mismatch'));

-- Same view as in 11_ingredients_recipes.sql, with the discounted unit price when there is one.
create or replace view public.product_price_points
with (security_invoker = true) as
  select ii.user_id,
         ii.product_id,
         i.invoice_date                          as price_date,
         (case
            when ii.printed_line_total is not null
             and ii.printed_line_total < ii.quantity * ii.unit_price - 1
            then ii.printed_line_total / ii.quantity
            else ii.unit_price
          end) / ii.content_amount               as price_per_unit,
         ii.content_unit                         as unit,
         'invoice'::text                         as source,
         (ii.content_source = 'estimated')       as estimated
    from public.invoice_items ii
    join public.invoices i on i.id = ii.invoice_id
   where ii.product_id is not null
     and ii.content_amount is not null
     and i.status <> 'error'
  union all
  select mp.user_id,
         mp.product_id,
         mp.price_date,
         mp.price / mp.amount,
         mp.unit,
         'manual'::text,
         false
    from public.manual_prices mp;
