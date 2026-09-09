-- Mama Anthem: Upcoming Bot Priority Requests
-- Run this once in Supabase SQL Editor.
-- Assumes your existing private.is_admin() helper and public.set_updated_at() function already exist.

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

  status text not null default 'Pending',
  internal_notes text,

  accepted_at timestamptz,
  applied_at timestamptz
);

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
