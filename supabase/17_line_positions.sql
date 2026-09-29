-- SabaiBiz: keep invoice lines in the order printed on the paper invoice
-- Run AFTER 16_line_totals.sql, in the Supabase SQL Editor. Safe to run more than once.
--
-- line_position: 1, 2, 3… across all pages, set at scan time and when lines are edited or moved.
-- Existing invoices: lines had no creation time, so their order is recovered from the physical
-- order of the rows (ctid), which usually follows the order they were saved in, the paper order.
-- It is a best effort: a line that was edited since may come last. Fix it with ↑ ↓ in Edit.

alter table public.invoice_items add column if not exists line_position integer check (line_position > 0);

-- Only lines that don't have a position yet, so running this again never reorders anything.
update public.invoice_items ii
   set line_position = numbered.position
  from (
    select id, row_number() over (partition by invoice_id order by ctid) as position
      from public.invoice_items
     where invoice_id in (select invoice_id from public.invoice_items where line_position is null)
  ) numbered
 where ii.id = numbered.id
   and ii.line_position is null;

create index if not exists invoice_items_invoice_position_idx on public.invoice_items (invoice_id, line_position);
