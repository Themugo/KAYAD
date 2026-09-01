-- KAYAD Phase 11: remove historical demo identities and demo listings from
-- production visibility without altering the immutable historical migrations.
-- This migration is intentionally idempotent.

UPDATE public.cars
SET status = 'hidden',
    deleted_at = COALESCE(deleted_at, now()),
    updated_at = now()
WHERE dealer_id IN (
  SELECT id FROM public.users
  WHERE lower(email) IN (
    'dealer@kayad.space',
    'seller@kayad.space',
    'buyer@kayad.space'
  )
);

UPDATE public.cars
SET status = 'hidden',
    deleted_at = COALESCE(deleted_at, now()),
    updated_at = now()
WHERE lower(COALESCE(title, '')) LIKE '%demo%'
  AND deleted_at IS NULL;

UPDATE public.users
SET status = 'suspended',
    deleted_at = COALESCE(deleted_at, now()),
    updated_at = now()
WHERE lower(email) IN (
  'dealer@kayad.space',
  'seller@kayad.space',
  'buyer@kayad.space'
);
