-- Mama Anthem: Donation-Based Upcoming Bot Priority Requests
-- Run this once in Supabase SQL Editor.
-- Safe to run whether or not the earlier priority-request table already exists.
-- Assumes your existing private.is_admin() helper and public.set_updated_at() function exist.

create table if not exists public.bot_priority_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text unique not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_name text not null,
  contact text not null,

  bot_identifier text not null,
  source_reference text,
  note text,

  donation_amount_cad numeric(10,2),
  donation_method text,
  donation_status text not null default 'Awaiting Donation',

  status text not null default 'Pending',
  internal_notes text,

  donation_received_at timestamptz,
  refunded_at timestamptz,
  accepted_at timestamptz,
  applied_at timestamptz
);

-- Migration support if the earlier non-donation version was already created.
alter table public.bot_priority_requests
  add column if not exists donation_amount_cad numeric(10,2);

alter table public.bot_priority_requests
  add column if not exists donation_method text;

alter table public.bot_priority_requests
  add column if not exists donation_status text not null default 'Awaiting Donation';

alter table public.bot_priority_requests
  add column if not exists donation_received_at timestamptz;

alter table public.bot_priority_requests
  add column if not exists refunded_at timestamptz;

alter table public.bot_priority_requests
  add column if not exists accepted_at timestamptz;

alter table public.bot_priority_requests
  add column if not exists applied_at timestamptz;

alter table public.bot_priority_requests
drop constraint if exists bot_priority_requests_status_check;

alter table public.bot_priority_requests
add constraint bot_priority_requests_status_check
check (status in (
  'Pending',
  'Accepted',
  'Applied',
  'Declined',
  'Cancelled'
));

alter table public.bot_priority_requests
drop constraint if exists bot_priority_requests_donation_amount_check;

alter table public.bot_priority_requests
add constraint bot_priority_requests_donation_amount_check
check (
  donation_amount_cad is null
  or donation_amount_cad > 0
);

alter table public.bot_priority_requests
drop constraint if exists bot_priority_requests_donation_method_check;

alter table public.bot_priority_requests
add constraint bot_priority_requests_donation_method_check
check (
  donation_method is null
  or donation_method in ('Stripe', 'PayPal')
);

alter table public.bot_priority_requests
drop constraint if exists bot_priority_requests_donation_status_check;

alter table public.bot_priority_requests
add constraint bot_priority_requests_donation_status_check
check (
  donation_status in (
    'Awaiting Donation',
    'Received',
    'Refunded'
  )
);

drop trigger if exists bot_priority_requests_set_updated_at
on public.bot_priority_requests;

create trigger bot_priority_requests_set_updated_at
before update on public.bot_priority_requests
for each row
execute function public.set_updated_at();

create or replace function public.set_priority_request_dates()
returns trigger
language plpgsql
as $$
begin
  if new.donation_status = 'Received'
     and old.donation_status is distinct from new.donation_status
     and new.donation_received_at is null then
    new.donation_received_at = now();
  end if;

  if new.donation_status = 'Refunded'
     and old.donation_status is distinct from new.donation_status
     and new.refunded_at is null then
    new.refunded_at = now();
  end if;

  if new.status = 'Accepted'
     and old.status is distinct from new.status
     and new.accepted_at is null then
    new.accepted_at = now();
  end if;

  if new.status = 'Applied'
     and old.status is distinct from new.status
     and new.applied_at is null then
    new.applied_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists bot_priority_requests_status_dates
on public.bot_priority_requests;

create trigger bot_priority_requests_status_dates
before update on public.bot_priority_requests
for each row
execute function public.set_priority_request_dates();

alter table public.bot_priority_requests enable row level security;

revoke all on table public.bot_priority_requests from anon, authenticated;

grant select, insert, update, delete
on table public.bot_priority_requests
to authenticated;

drop policy if exists "Admins can read bot priority requests"
on public.bot_priority_requests;

create policy "Admins can read bot priority requests"
on public.bot_priority_requests
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins can insert bot priority requests"
on public.bot_priority_requests;

create policy "Admins can insert bot priority requests"
on public.bot_priority_requests
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "Admins can update bot priority requests"
on public.bot_priority_requests;

create policy "Admins can update bot priority requests"
on public.bot_priority_requests
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Admins can delete bot priority requests"
on public.bot_priority_requests;

create policy "Admins can delete bot priority requests"
on public.bot_priority_requests
for delete
to authenticated
using ((select private.is_admin()));
