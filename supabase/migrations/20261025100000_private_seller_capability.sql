-- Phase 13E (C1): private-seller capability as a personal-account capability.
-- One row per existing users.id. Additive only: no existing table, column, constraint, trigger or policy is altered.
-- Authoritative source for private-selling eligibility of PERSONAL accounts. It is independent of users.status (buyer account
-- state) and of the dealer tables (dealers, dealer_verifications, dealer_teams), which it never references or modifies.
CREATE TABLE IF NOT EXISTS public.private_seller_capabilities (
  user_id        uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended','revoked')),
  contact_phone  text,
  intended_use   text,
  source         text NOT NULL DEFAULT 'application' CHECK (source IN ('application','legacy_backfill')),
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  review_reason  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psc_status_submitted ON public.private_seller_capabilities (status, submitted_at DESC);
-- RLS on with NO policies: only the backend service role can read or write. A user can never update their own approval state.
ALTER TABLE public.private_seller_capabilities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.private_seller_capabilities FROM anon, authenticated;
COMMENT ON TABLE public.private_seller_capabilities IS 'Phase 13E: private-selling capability of a personal account. Independent of users.status and of dealer tables.';

-- Deterministic, idempotent backfill for EXISTING role=individual_seller accounts only. Their approval source today is users.status;
-- it is copied as-is (approved/pending/rejected/suspended; anything else -> pending). Re-running changes nothing (ON CONFLICT DO NOTHING).
-- No account is merged, converted, re-roled or re-owned; no dealer row is read or written.
INSERT INTO public.private_seller_capabilities (user_id, status, source)
SELECT u.id,
       CASE u.status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'suspended' THEN 'suspended' ELSE 'pending' END,
       'legacy_backfill'
FROM public.users u
WHERE u.role = 'individual_seller'
ON CONFLICT (user_id) DO NOTHING;
