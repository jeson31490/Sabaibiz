-- SabaiBiz: one supplier per name, whatever the case or spacing
-- Run AFTER 01_schema.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- "Makro", "MAKRO" and " Makro  " are the same supplier. The app reuses the existing one
-- (lib/invoices.ts); this index makes sure a second one can never be created, even from two phones.
-- It fails if such duplicates already exist: merge them first.

create unique index if not exists suppliers_user_name_key_idx
  on public.suppliers (user_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));
