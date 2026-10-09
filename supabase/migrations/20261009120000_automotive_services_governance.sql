/*
# Automotive services governance (additive, idempotent)

Evidence (see AUTOMOTIVE_SERVICES_PRODUCT_DISCOVERY.md, verified on a PostgreSQL 16
built from the repository migrations):

1. The service layer reads/writes inspection_providers columns that no migration
   defines (service_terms, total_reviews, total_completed_inspections,
   response_time_minutes, cover_image_url, verified_at). The registration RPC
   kayad_create_inspection_provider_application fails with
   `column "service_terms" ... does not exist`, and public provider search/profile
   select the missing columns. They are added here, nullable/defaulted, no data change.
2. There is no representation of WHAT a provider is approved to do. A capability
   table is added (declared -> verified -> revoked), optionally tied to one staff
   member, so a declared "hybrid" claim is never confused with a verified one.
3. Staff rows had no affiliation lifecycle. Two-sided consent columns are added;
   existing rows are backfilled to 'confirmed' to preserve current behaviour.
4. Evidence/review attribution for credentials and the alternative (no-premises)
   verification route are recorded as columns on the existing tables.

No financial table, no payment function, no RLS policy is weakened. The new table
has RLS enabled with no policy for anon/authenticated (service_role only), matching
the inspection domain's existing posture.
*/

ALTER TABLE inspection_providers
  ADD COLUMN IF NOT EXISTS service_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_completed_inspections INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_route TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

DO $$ BEGIN
  ALTER TABLE inspection_providers
    ADD CONSTRAINT chk_inspection_providers_verification_route
    CHECK (verification_route IS NULL OR verification_route IN ('premises', 'alternative'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Existing verified providers: record when, from the existing authoritative review stamp.
UPDATE inspection_providers
   SET verified_at = COALESCE(verified_at, reviewed_at)
 WHERE verification_status = 'verified' AND verified_at IS NULL;

ALTER TABLE provider_credentials
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

ALTER TABLE inspection_staff
  ADD COLUMN IF NOT EXISTS affiliation_status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS user_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliation_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliation_ended_by UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE inspection_staff
    ADD CONSTRAINT chk_inspection_staff_affiliation_status
    CHECK (affiliation_status IN ('pending', 'confirmed', 'ended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New affiliations must be requested explicitly; the column default only protects legacy rows.
ALTER TABLE inspection_staff ALTER COLUMN affiliation_status SET DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_inspection_staff_user ON inspection_staff(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_staff_provider_user_live
  ON inspection_staff(provider_id, user_id)
  WHERE user_id IS NOT NULL AND affiliation_status <> 'ended';

CREATE TABLE IF NOT EXISTS provider_service_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES inspection_staff(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  subcategory_code TEXT,
  status TEXT NOT NULL DEFAULT 'declared' CHECK (status IN ('declared', 'verified', 'revoked')),
  vehicle_makes JSONB NOT NULL DEFAULT '[]'::jsonb,
  all_makes BOOLEAN NOT NULL DEFAULT false,
  powertrains JSONB NOT NULL DEFAULT '[]'::jsonb,
  serves_roadside_location BOOLEAN NOT NULL DEFAULT false,
  evidence_credential_id UUID REFERENCES provider_credentials(id) ON DELETE SET NULL,
  declared_by UUID REFERENCES users(id) ON DELETE SET NULL,
  declared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_capability_scope
  ON provider_service_capabilities (
    provider_id,
    category_code,
    COALESCE(subcategory_code, ''),
    COALESCE(staff_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE INDEX IF NOT EXISTS idx_provider_capabilities_category
  ON provider_service_capabilities (category_code, status);

ALTER TABLE provider_service_capabilities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_service_capabilities FROM PUBLIC, anon, authenticated;
GRANT ALL ON provider_service_capabilities TO service_role;

-- Providers already ACTIVE+verified under the existing review were approved as inspection
-- providers; record that single capability from the existing authoritative stamp
-- (verified_by = their existing reviewer). Nothing else is back-filled as verified.
INSERT INTO provider_service_capabilities
  (provider_id, category_code, status, reviewed_by, reviewed_at, review_notes)
SELECT ip.id, 'pre_purchase_inspection', 'verified', ip.reviewed_by, COALESCE(ip.reviewed_at, now()),
       'Backfilled from existing ACTIVE/verified inspection-provider approval'
  FROM inspection_providers ip
 WHERE ip.status = 'active' AND ip.verification_status = 'verified'
ON CONFLICT DO NOTHING;
