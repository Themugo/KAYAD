-- Dealer suspension is a reasoned REQUEST by Admin staff that a Super Admin must approve before it takes effect (2026-11-24).
-- Additive only, safe to re-run, no existing object altered, no financial object touched, no data change. NOT authorised for hosted application.
-- The effective restriction is the EXISTING mechanism (dealer_verifications.verification_status = 'suspended', dealers.is_suspended,
-- users.status); this table only records the request, who decided it, and why. Suspension history is therefore never lost: rows are never
-- deleted by the application, and the dealer/verification/staff/listing rows are not referenced with cascading deletes.
create table if not exists public.dealer_suspension_requests (
  id                uuid primary key default gen_random_uuid(),
  verification_id   uuid not null references public.dealer_verifications(id),
  dealer_user_id    uuid references public.users(id),
  requested_by      uuid not null references public.users(id),
  reason_category   text not null check (reason_category in ('policy_violation','fraud_or_misrepresentation','compliance_or_documents','customer_harm','security','other')),
  reason            text not null check (char_length(btrim(reason)) >= 10),
  evidence_reference text,
  scope             text not null default 'dealer_account' check (scope in ('dealer_account')),
  status            text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_by        uuid references public.users(id),
  decided_at        timestamptz,
  decision_reason   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- a decision is always attributed, and a rejection always carries a reason
  constraint dealer_suspension_requests_decision_chk check (
    (status = 'pending' and decided_by is null and decided_at is null)
    or (status = 'cancelled')
    or (status = 'approved' and decided_by is not null and decided_at is not null)
    or (status = 'rejected' and decided_by is not null and decided_at is not null and char_length(btrim(coalesce(decision_reason,''))) >= 3)
  ),
  -- separation of duties, enforced in the database as well as the API
  constraint dealer_suspension_requests_no_self_decision_chk check (decided_by is null or decided_by <> requested_by)
);
-- At most ONE pending request per dealer verification (duplicate-request prevention, race-safe).
create unique index if not exists uq_dealer_suspension_requests_one_pending on public.dealer_suspension_requests(verification_id) where status = 'pending';
create index if not exists idx_dealer_suspension_requests_queue on public.dealer_suspension_requests(status, created_at desc);
create index if not exists idx_dealer_suspension_requests_requester on public.dealer_suspension_requests(requested_by, created_at desc);
alter table public.dealer_suspension_requests enable row level security;
-- Reached only by the API (service role). No client policy; table grants removed as defence in depth.
revoke all on table public.dealer_suspension_requests from anon, authenticated;
comment on table public.dealer_suspension_requests is 'Admin-staff dealer suspension requests awaiting Super Admin decision. A pending request is NOT an effective suspension.';

notify pgrst, 'reload schema';
