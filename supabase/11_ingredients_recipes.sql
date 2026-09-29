-- SabaiBiz: ingredients (products you buy), recipes, and their cost
-- Run AFTER 10_merge_suppliers.sql, in the Supabase SQL Editor. Safe to run more than once.
-- Creates tables and columns only: no existing data is changed.
--
-- How a dish's cost is worked out:
--   invoice line  → price per purchase unit (e.g. 145 ฿ per "ชน" of cream cheese)
--                 ÷ content of that unit (1 ชน = 250 g)          → 0.58 ฿ per g
--   recipe        → 30 g of cream cheese per portion             → 17.40 ฿
-- The price used is the latest one paid (invoice or manual), with the trend over 30 days.

-- ---------------------------------------------------------------------------
-- Products: the business's catalogue of things it buys
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default public.current_business_id() references auth.users (id) on delete cascade,
  name           text not null,
  -- The unit recipes use for it. Null until known ("Needs conversion").
  base_unit      text check (base_unit in ('g', 'ml', 'pcs')),
  -- False for fridges, shampoo, gloves…: never offered as a recipe ingredient.
  is_ingredient  boolean not null default true,
  -- invoice: found on a scanned invoice · manual: added by hand ("Add ingredient"), priced by manual_prices
  source         text not null default 'invoice' check (source in ('invoice', 'manual')),
  created_at     timestamptz not null default now()
);
alter table public.products
  add column if not exists source text not null default 'invoice' check (source in ('invoice', 'manual'));

-- One product per name, whatever the case or spacing (as for suppliers).
create unique index if not exists products_user_name_key_idx
  on public.products (user_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

-- ---------------------------------------------------------------------------
-- Invoice lines: which product, and what one purchase unit contains
-- ---------------------------------------------------------------------------

alter table public.invoice_items
  add column if not exists product_id      uuid references public.products (id) on delete set null,
  -- One purchase unit = content_amount content_unit, e.g. 1 bottle = 400 ml, 1 carton = 7800 ml (24 × 325 ml).
  add column if not exists content_amount  numeric(14, 4) check (content_amount > 0),
  add column if not exists content_unit    text check (content_unit in ('g', 'ml', 'pcs')),
  -- standard: from the unit itself (1 kg = 1000 g) · printed: written on the invoice ("Ketchup 400ml")
  -- estimated: guessed by the AI (1 lettuce ≈ 300 g) · confirmed: checked by the owner
  -- Null content = "Needs conversion".
  add column if not exists content_source  text check (content_source in ('standard', 'printed', 'estimated', 'confirmed'));

alter table public.invoice_items drop constraint if exists invoice_items_content_complete;
alter table public.invoice_items
  add constraint invoice_items_content_complete
  check ((content_amount is null) = (content_unit is null) and (content_amount is null) = (content_source is null));

create index if not exists invoice_items_product_idx on public.invoice_items (product_id);

-- ---------------------------------------------------------------------------
-- Manual prices: market purchases without an invoice
-- ---------------------------------------------------------------------------

create table if not exists public.manual_prices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default public.current_business_id() references auth.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  -- "50 ฿ for 1000 g": price paid for amount × unit.
  price       numeric(12, 2) not null check (price >= 0),
  amount      numeric(12, 3) not null check (amount > 0),
  unit        text not null check (unit in ('g', 'ml', 'pcs')),
  price_date  date not null,
  created_at  timestamptz not null default now()
);

create index if not exists manual_prices_product_idx on public.manual_prices (product_id, price_date desc);

-- ---------------------------------------------------------------------------
-- Loyverse menu: items (with category and price) and modifiers, imported by the server
-- ---------------------------------------------------------------------------

create table if not exists public.menu_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  provider        text not null check (provider in ('loyverse')),
  external_id     text not null,                 -- Loyverse item id
  name            text not null,
  category        text,                          -- e.g. "Beers", "Thai - Food ( one dish meals )"
  price           numeric(12, 2),                -- sale price of the (first) variant, when fixed
  sold_by_weight  boolean not null default false,
  raw             jsonb not null,                -- the item as Loyverse sent it (variants, modifier_ids…)
  synced_at       timestamptz not null default now(),
  unique (user_id, provider, external_id)
);

create index if not exists menu_items_user_name_idx on public.menu_items (user_id, lower(name));

create table if not exists public.menu_modifiers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  provider     text not null check (provider in ('loyverse')),
  external_id  text not null,                    -- Loyverse modifier id
  name         text not null,                    -- e.g. "Protein"
  options      jsonb not null default '[]',      -- [{ "id", "name": "Shrimp", "price": 40 }, …]
  synced_at    timestamptz not null default now(),
  unique (user_id, provider, external_id)
);

-- Options chosen on each sold line (e.g. {"Shrimp"}), when the menu has modifiers. Empty today.
alter table public.sale_items add column if not exists modifier_options text[];

-- ---------------------------------------------------------------------------
-- Recipes: one per dish sold in Loyverse (optionally per variant), plus one per modifier option
-- ---------------------------------------------------------------------------

create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default public.current_business_id() references auth.users (id) on delete cascade,
  -- Linked by name: some dishes exist under several Loyverse ids (deleted and re-created).
  -- For kind = 'modifier', the option name (e.g. "Shrimp"): its extra cost, added to any dish sold with it.
  item_name     text not null,
  -- Null = every variant. Set when a Loyverse variant (e.g. "Chicken") has its own recipe.
  variant_name  text,
  -- dish: cooked here · resale: bought and sold as is (a beer, water) · modifier: an option's supplement
  kind          text not null default 'dish' check (kind in ('dish', 'resale', 'modifier')),
  -- The quantities below make this many portions; cost per portion = total ÷ portions.
  portions      numeric(8, 2) not null default 1 check (portions > 0),
  status        text not null default 'draft' check (status in ('draft', 'validated')),
  source        text not null default 'manual' check (source in ('manual', 'ai')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- If an earlier version of this file was run: allow 'modifier' and replace the old unique index.
alter table public.recipes drop constraint if exists recipes_kind_check;
alter table public.recipes add constraint recipes_kind_check check (kind in ('dish', 'resale', 'modifier'));
drop index if exists public.recipes_user_item_variant_idx;

-- One recipe per dish (and per variant), or per modifier option, whatever the case or spacing.
create unique index if not exists recipes_user_kind_item_variant_idx
  on public.recipes (
    user_id,
    (kind = 'modifier'),
    lower(regexp_replace(btrim(item_name), '\s+', ' ', 'g')),
    lower(regexp_replace(btrim(coalesce(variant_name, '')), '\s+', ' ', 'g'))
  );

create table if not exists public.recipe_ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  user_id     uuid not null default public.current_business_id() references auth.users (id) on delete cascade,
  position    integer not null default 0,
  -- As written in the recipe ("Burger bun"), even before it is linked to a product you buy.
  name        text not null,
  -- Null = "No price yet": linked later, by hand or when an invoice contains it.
  product_id  uuid references public.products (id) on delete set null,
  quantity    numeric(12, 3) not null check (quantity > 0),
  unit        text not null check (unit in ('g', 'ml', 'pcs'))
);

create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);
create index if not exists recipe_ingredients_product_idx on public.recipe_ingredients (product_id);

-- ---------------------------------------------------------------------------
-- Price points: every known price of a product, per base unit, newest first
-- ---------------------------------------------------------------------------

-- security_invoker: the view obeys the Row Level Security of the tables it reads.
create or replace view public.product_price_points
with (security_invoker = true) as
  select ii.user_id,
         ii.product_id,
         i.invoice_date                          as price_date,
         ii.unit_price / ii.content_amount       as price_per_unit,
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

-- ---------------------------------------------------------------------------
-- Row Level Security: the business and its team, as for invoices
-- ---------------------------------------------------------------------------

alter table public.products           enable row level security;
alter table public.manual_prices      enable row level security;
alter table public.menu_items         enable row level security;
alter table public.menu_modifiers     enable row level security;
alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists "Business products" on public.products;
create policy "Business products" on public.products
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));

drop policy if exists "Business manual prices" on public.manual_prices;
create policy "Business manual prices" on public.manual_prices
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));

-- The menu is read by the business and written only by the server (secret key), like sales.
drop policy if exists "Business menu items" on public.menu_items;
create policy "Business menu items" on public.menu_items
  for select to authenticated
  using (user_id = (select public.current_business_id()));

drop policy if exists "Business menu modifiers" on public.menu_modifiers;
create policy "Business menu modifiers" on public.menu_modifiers
  for select to authenticated
  using (user_id = (select public.current_business_id()));

drop policy if exists "Business recipes" on public.recipes;
create policy "Business recipes" on public.recipes
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));

drop policy if exists "Business recipe ingredients" on public.recipe_ingredients;
create policy "Business recipe ingredients" on public.recipe_ingredients
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));
