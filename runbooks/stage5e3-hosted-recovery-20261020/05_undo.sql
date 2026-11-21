-- Partial undo (only meaningful while refresh_tokens is empty). Not a full restore of the legacy shape.
drop function if exists public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid);
alter table public.refresh_tokens add column if not exists token text;
-- communication_deliveries undo:
-- drop index if exists public.uq_communication_delivery_idempotency; drop index if exists public.uq_communication_delivery_provider_event;
-- drop index if exists public.idx_communication_delivery_source_event; alter table public.communication_deliveries drop column if exists idempotency_key;
-- alter table public.communication_deliveries drop constraint if exists communication_deliveries_status_check;
-- alter table public.communication_deliveries add constraint communication_deliveries_status_check check (status in ('queued','sending','sent','delivered','failed','bounced','read'));
