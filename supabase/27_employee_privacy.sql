-- SabaiBiz: employees must not read revenue, recipes or costs, even by calling the API directly
-- Run AFTER 18_team_permissions_attendance.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- Before this, every active team member (employees included) could read sales, sale_items, the menu, recipes
-- and manual prices of the business through the Supabase API, because the "Business ..." policies only check
-- "same business". The app hides those screens from employees, but the database must enforce it.
-- Restrictive policies are ANDed with the existing ones: the owner and managers keep exactly what they had,
-- an employee loses these tables (no screen of the employee menu uses them).

-- Revenue and menu: read only by the owner and managers.
drop policy if exists "Managers only" on public.sales;
create policy "Managers only" on public.sales
  as restrictive for select to authenticated
  using ((select public.is_business_manager()));

drop policy if exists "Managers only" on public.sale_items;
create policy "Managers only" on public.sale_items
  as restrictive for select to authenticated
  using ((select public.is_business_manager()));

drop policy if exists "Managers only" on public.menu_items;
create policy "Managers only" on public.menu_items
  as restrictive for select to authenticated
  using ((select public.is_business_manager()));

drop policy if exists "Managers only" on public.menu_modifiers;
create policy "Managers only" on public.menu_modifiers
  as restrictive for select to authenticated
  using ((select public.is_business_manager()));

-- Recipes (costs and margins) and manual prices: read and written only by the owner and managers.
drop policy if exists "Managers only" on public.recipes;
create policy "Managers only" on public.recipes
  as restrictive for all to authenticated
  using ((select public.is_business_manager()))
  with check ((select public.is_business_manager()));

drop policy if exists "Managers only" on public.recipe_ingredients;
create policy "Managers only" on public.recipe_ingredients
  as restrictive for all to authenticated
  using ((select public.is_business_manager()))
  with check ((select public.is_business_manager()));

drop policy if exists "Managers only" on public.manual_prices;
create policy "Managers only" on public.manual_prices
  as restrictive for all to authenticated
  using ((select public.is_business_manager()))
  with check ((select public.is_business_manager()));
