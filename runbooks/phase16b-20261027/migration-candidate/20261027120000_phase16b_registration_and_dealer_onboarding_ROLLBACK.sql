-- KAYAD Phase 16B - ROLLBACK of the candidate (also NOT APPLIED ANYWHERE). Safe ONLY while no dealer has used the new columns
-- and no row holds verification_status = 'suspended' - the guards below refuse otherwise instead of losing data.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.dealer_verifications WHERE verification_status = 'suspended') THEN
    RAISE EXCEPTION 'ROLLBACK REFUSED: rows with verification_status=suspended exist';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='dealers' AND column_name='onboarding_complete')
     AND EXISTS (SELECT 1 FROM public.dealers WHERE onboarding_complete OR bio IS NOT NULL OR onboarding_completed_at IS NOT NULL OR payment_details <> '{}'::jsonb) THEN
    RAISE EXCEPTION 'ROLLBACK REFUSED: dealers rows hold data in the onboarding columns';
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ);
ALTER TABLE public.dealer_verifications DROP CONSTRAINT IF EXISTS dealer_verifications_verification_status_check;
ALTER TABLE public.dealer_verifications ADD CONSTRAINT dealer_verifications_verification_status_check CHECK (verification_status IN ('pending','approved','rejected'));
ALTER TABLE public.dealers DROP COLUMN IF EXISTS bio, DROP COLUMN IF EXISTS payment_details, DROP COLUMN IF EXISTS onboarding_complete, DROP COLUMN IF EXISTS onboarding_completed_at;
COMMIT;
