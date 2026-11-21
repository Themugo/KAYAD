-- KAYAD: columns the hosted database is missing that listing code reads.
-- Found 2026-11-02 in the hosted Postgres log: "column users.escrow_capability_status does not exist".
-- ADDITIVE and IDEMPOTENT: only ADD COLUMN IF NOT EXISTS. No data is changed or removed. Safe to run more than once.
-- The application now also tolerates the missing column (treats it as 'none'), so listing works either way;
-- this patch makes the escrow capability feature and the click counter work properly.
-- Run in the Supabase SQL editor by the project owner.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS escrow_capability_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escrow_capability_granted_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS escrow_capability_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_capability_reason TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_escrow_capability_status_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_escrow_capability_status_check
      CHECK (escrow_capability_status IN ('none','granted','suspended','revoked'));
  END IF;
END $$;

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;

-- Verify (should return 5 rows):
-- select column_name from information_schema.columns where table_schema='public'
--   and ((table_name='users' and column_name like 'escrow_capability_%') or (table_name='cars' and column_name='clicks'));
