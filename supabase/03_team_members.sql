-- SabaiBiz: team members
-- Run AFTER 01_schema.sql, in the Supabase SQL Editor. Safe to run more than once.
-- Re-running 01_schema.sql resets the data policies to owner-only, so run this file again afterwards.
--
-- A "business" is its owner's user id. An invited person who accepts becomes an active member of
-- that business: they see and add the owner's invoices, suppliers and alerts, and nothing else.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.team_members (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,  -- the owner
  invited_email   text not null check (invited_email = lower(invited_email)),
  role            text not null check (role in ('manager', 'employee')),
  status          text not null default 'pending' check (status in ('pending', 'active')),
  member_user_id  uuid references auth.users (id) on delete cascade,           -- set when the invite is accepted
  invited_at      timestamptz not null default now(),
  accepted_at     timestamptz
);

-- A person can belong to one business only.
create unique index if not exists team_members_email_idx on public.team_members (invited_email);
create unique index if not exists team_members_member_idx on public.team_members (member_user_id);
create index if not exists team_members_owner_idx on public.team_members (user_id);

-- ---------------------------------------------------------------------------
-- Which business the signed-in user works in
-- ---------------------------------------------------------------------------

-- The owner's id for an active team member, otherwise the user's own id.
-- security definer so it can read team_members without going through its RLS (no policy recursion).
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select tm.user_id
       from public.team_members tm
      where tm.member_user_id = auth.uid()
        and tm.status = 'active'
      limit 1),
    auth.uid()
  )
$$;

revoke all on function public.current_business_id() from public, anon;
grant execute on function public.current_business_id() to authenticated;

-- Called by the invited person after they open the email link and set a password.
-- Links them to the business that invited their (confirmed) email address.
create or replace function public.accept_team_invite()
returns public.team_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  me     auth.users;
  invite public.team_members;
begin
  select * into me from auth.users where id = auth.uid();
  -- The invite link confirms the address; never link an unconfirmed one.
  if me.id is null or me.email_confirmed_at is null then
    return null;
  end if;

  update public.team_members
     set member_user_id = me.id,
         status         = 'active',
         accepted_at    = now()
   where invited_email = lower(me.email)
     and status = 'pending'
     and user_id <> me.id
  returning * into invite;

  return invite;  -- null when there was no pending invitation
end
$$;

revoke all on function public.accept_team_invite() from public, anon;
grant execute on function public.accept_team_invite() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: team_members
-- ---------------------------------------------------------------------------

alter table public.team_members enable row level security;

-- Owners see, invite and remove their own team. There is deliberately no UPDATE policy: only
-- accept_team_invite() may link a person, otherwise an owner could point member_user_id at anyone.
drop policy if exists "Owner manages team" on public.team_members;
drop policy if exists "Owner sees team" on public.team_members;
create policy "Owner sees team" on public.team_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- New invitations start pending and unlinked. Members can't invite
-- (for them current_business_id() is the owner's id, not their own).
drop policy if exists "Owner invites" on public.team_members;
create policy "Owner invites" on public.team_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and user_id = (select public.current_business_id())
    and status = 'pending'
    and member_user_id is null
    and accepted_at is null
  );

-- Cancelling an invitation or removing a member takes their access away immediately.
drop policy if exists "Owner removes" on public.team_members;
create policy "Owner removes" on public.team_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Members can see their own membership (their role and which business).
drop policy if exists "Member sees own membership" on public.team_members;
create policy "Member sees own membership" on public.team_members
  for select to authenticated
  using (member_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Row Level Security: business data is shared with the business's team
-- ---------------------------------------------------------------------------

-- New rows belong to the business, so an invoice scanned by a manager lands in the owner's account.
alter table public.suppliers     alter column user_id set default public.current_business_id();
alter table public.invoices      alter column user_id set default public.current_business_id();
alter table public.invoice_items alter column user_id set default public.current_business_id();
alter table public.price_alerts  alter column user_id set default public.current_business_id();

drop policy if exists "Own suppliers" on public.suppliers;
drop policy if exists "Business suppliers" on public.suppliers;
create policy "Business suppliers" on public.suppliers
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));

drop policy if exists "Own invoices" on public.invoices;
drop policy if exists "Business invoices" on public.invoices;
create policy "Business invoices" on public.invoices
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));

drop policy if exists "Own invoice items" on public.invoice_items;
drop policy if exists "Business invoice items" on public.invoice_items;
create policy "Business invoice items" on public.invoice_items
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));

drop policy if exists "Own price alerts" on public.price_alerts;
drop policy if exists "Business price alerts" on public.price_alerts;
create policy "Business price alerts" on public.price_alerts
  for all to authenticated
  using (user_id = (select public.current_business_id()))
  with check (user_id = (select public.current_business_id()));
