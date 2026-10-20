-- APPLIED 2026-10-20 by the owner (preflight: 0 rows). Additive.
alter table public.communication_deliveries add column if not exists idempotency_key text;
create unique index if not exists uq_communication_delivery_idempotency on public.communication_deliveries(provider, channel, idempotency_key) where idempotency_key is not null;
create unique index if not exists uq_communication_delivery_provider_event on public.communication_deliveries(provider, provider_event_id) where provider_event_id is not null;
create index if not exists idx_communication_delivery_source_event on public.communication_deliveries(source_event_id) where source_event_id is not null;
alter table public.communication_deliveries drop constraint if exists communication_deliveries_status_check;
alter table public.communication_deliveries add constraint communication_deliveries_status_check
  check (status in ('queued','sending','sent','delivered','failed','bounced','read','dead_letter'));
