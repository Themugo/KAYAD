-- KAYAD inspection-provider identity integrity
-- Forward-only hardening for the canonical inspector domain.
-- Prevents duplicate provider identities and guarantees the public inspector
-- marketplace can resolve one active provider per approved identity.

CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_providers_user_canonical
  ON public.inspection_providers(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inspection_providers_active_verified
  ON public.inspection_providers(status, verification_status, average_rating DESC, reviews_count DESC);
