-- SabaiBiz: supplier legal name and Thai tax ID
-- Run AFTER 06_supplier_names.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- suppliers.name stays the short trading name ("Makro"); the legal name and the 13-digit tax ID
-- are read from the invoice when printed. Two invoices with the same tax ID are the same supplier,
-- whatever name was read ("Siam Makro", "CP Axtra"…).

alter table public.suppliers add column if not exists legal_name text;
alter table public.suppliers add column if not exists tax_id text;

alter table public.suppliers drop constraint if exists suppliers_tax_id_format;
alter table public.suppliers
  add constraint suppliers_tax_id_format check (tax_id is null or tax_id ~ '^[0-9]{13}$');

-- One supplier per tax ID in a business.
create unique index if not exists suppliers_user_tax_id_idx
  on public.suppliers (user_id, tax_id)
  where tax_id is not null;
