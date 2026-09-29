-- SabaiBiz: keep each product line's name exactly as printed on the invoice (often Thai)
-- Run AFTER 13_product_categories.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- product_name is the English translation used everywhere; original_name is shown in small under
-- it, so a wrong translation ("Jasmine rice 5kg" for a pack of rice noodles) is easy to spot.
-- Invoices scanned before this file have no original name.

alter table public.invoice_items add column if not exists original_name text;
