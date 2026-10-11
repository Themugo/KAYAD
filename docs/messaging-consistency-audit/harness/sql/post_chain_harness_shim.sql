-- HARNESS-ONLY, applied AFTER the migration chain, never shipped as a migration.
-- public.transactions is read by backend/services/paymentCallback.service.js (findOne("transactions",{checkoutRequestId}))
-- and bidSecurityService.js, but NO migration in supabase/migrations creates it (defect D-SCHEMA-1). Production may have it
-- from out-of-band DDL (UNCONFIRMED). This empty minimal table only lets the callback code path execute locally.
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id text, type text, status text, user_id uuid, amount numeric,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.transactions TO service_role;
