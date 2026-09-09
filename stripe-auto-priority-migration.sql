-- Mama Anthem: Automatic Stripe Verification for Priority Support
-- Run this once in Supabase SQL Editor.
-- This upgrades the working donation-based priority system.

alter table public.bot_priority_requests
  add column if not exists stripe_checkout_session_id text;

alter table public.bot_priority_requests
  add column if not exists stripe_payment_intent_id text;

alter table public.bot_priority_requests
  add column if not exists stripe_payment_status text;

alter table public.bot_priority_requests
  add column if not exists stripe_amount_total_cad numeric(10,2);

alter table public.bot_priority_requests
  add column if not exists refunded_amount_cad numeric(10,2);

create unique index if not exists
  bot_priority_requests_stripe_checkout_session_id_key
on public.bot_priority_requests (stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create index if not exists
  bot_priority_requests_stripe_payment_intent_id_idx
on public.bot_priority_requests (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

alter table public.bot_priority_requests
drop constraint if exists bot_priority_requests_donation_status_check;

alter table public.bot_priority_requests
add constraint bot_priority_requests_donation_status_check
check (
  donation_status in (
    'Awaiting Donation',
    'Received',
    'Partially Refunded',
    'Refunded'
  )
);

-- Recreate the timestamp helper so partial refunds do not incorrectly
-- stamp refunded_at as a full refund.
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
