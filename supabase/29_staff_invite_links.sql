-- SabaiBiz: invitation links for staff without an e-mail address (phone number + 6-digit code).
-- Run AFTER 03/18. In the Supabase SQL Editor. Safe to run more than once.
--
-- The owner never creates the account: they share a one-time link (WhatsApp, LINE, QR code...). The employee opens it,
-- enters their phone number and picks a code. Only the server (service role) can create/consume links.

create table if not exists public.team_invite_links (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.team_members (id) on delete cascade,
  token_hash  text not null unique,            -- sha256 of the token; the token itself is never stored
  label       text not null check (char_length(label) between 1 and 60),  -- the name the owner gave this person
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists team_invite_links_member_idx on public.team_invite_links (member_id);

alter table public.team_invite_links enable row level security;

-- Owners may read the labels of their own people (to show names). No insert/update/delete policy: server only.
drop policy if exists "Owner sees own invite labels" on public.team_invite_links;
create policy "Owner sees own invite labels" on public.team_invite_links
  for select to authenticated
  using (exists (select 1 from public.team_members m where m.id = member_id and m.user_id = (select auth.uid())));

revoke all on public.team_invite_links from anon;
