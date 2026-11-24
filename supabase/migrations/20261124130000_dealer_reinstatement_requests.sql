-- OD-2 (2026-11-24): dealer REINSTATEMENT is a reasoned request by Admin staff + a Super Admin decision, using the SAME table as suspension requests
-- (no second approval system). Additive and re-runnable: one new column with a safe default, one link column, widened CHECKs. No row is deleted or
-- rewritten; existing rows become request_type='suspension'. NOT authorised for hosted application. No financial object is touched.
alter table public.dealer_suspension_requests add column if not exists request_type text not null default 'suspension';
alter table public.dealer_suspension_requests drop constraint if exists dealer_suspension_requests_request_type_chk;
alter table public.dealer_suspension_requests add constraint dealer_suspension_requests_request_type_chk check (request_type in ('suspension','reinstatement'));
-- The approved suspension a reinstatement request refers to (nullable: a legacy direct suspension has no request row).
alter table public.dealer_suspension_requests add column if not exists related_request_id uuid references public.dealer_suspension_requests(id);
-- Reinstatement reasons extend the category list; suspension categories are unchanged.
alter table public.dealer_suspension_requests drop constraint if exists dealer_suspension_requests_reason_category_check;
alter table public.dealer_suspension_requests add constraint dealer_suspension_requests_reason_category_check check (reason_category in
  ('policy_violation','fraud_or_misrepresentation','compliance_or_documents','customer_harm','security','other',
   'issue_resolved','documents_verified','suspension_in_error','appeal_upheld'));
create index if not exists idx_dealer_suspension_requests_type_status on public.dealer_suspension_requests(request_type, status, created_at desc);
-- The existing partial unique index (one pending request per dealer verification) already covers BOTH types: a dealer is either approved
-- (a suspension may be requested) or suspended (a reinstatement may be requested), never both, and never two pending decisions at once.
comment on column public.dealer_suspension_requests.request_type is 'suspension | reinstatement. A pending request never changes the dealer; only an approved decision does.';
notify pgrst, 'reload schema';
