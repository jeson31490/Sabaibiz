-- SabaiBiz: product categories, and invoice lines that need the owner's review
-- Run AFTER 11_ingredients_recipes.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- Every product bought gets a category (proposed by the AI at scan time, editable by the owner).
-- Only "food" and "resale" products can be used in recipes; every category still counts in the
-- dashboard's costs. A product with no category, or a line with a doubtful price, needs review.

alter table public.products
  add column if not exists category text
  check (category in ('food', 'resale', 'packaging', 'equipment', 'cleaning'));

comment on column public.products.category is
  'food: Food & ingredients · resale: Drinks for resale · packaging: Packaging & consumables · '
  'equipment: Kitchen equipment · cleaning: Cleaning & other · null: not understood, needs review';

-- Replaced by the category (food and resale are the ingredients).
alter table public.products drop column if exists is_ingredient;

-- Why a line needs the owner's review, until they correct it (null = fine).
--   suspect_price: the price looks misread (e.g. 36 ฿ for 5 kg of rice)
-- Also needing review, without a reason here: a line whose size is unknown (content_amount null),
-- and any line of a product with no category.
alter table public.invoice_items
  add column if not exists review_reason text check (review_reason in ('suspect_price'));

create index if not exists invoice_items_review_idx on public.invoice_items (user_id) where review_reason is not null;
