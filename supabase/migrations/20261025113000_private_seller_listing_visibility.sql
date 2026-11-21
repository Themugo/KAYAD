-- Phase 13E completion: preserve live listing records while hiding public listings
-- when private-seller capability is suspended or revoked. Restore only listings
-- this policy hid, and only if they are still hidden and still owned by the user.
-- This migration is additive and MUST be applied only after explicit environment approval.

CREATE TABLE IF NOT EXISTS public.private_seller_listing_visibility_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  seller_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  previous_status text NOT NULL CHECK (previous_status IN ('available')),
  suspension_status text NOT NULL CHECK (suspension_status IN ('suspended','revoked')),
  hidden_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_private_seller_listing_visibility_open
  ON public.private_seller_listing_visibility_events (car_id)
  WHERE restored_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_private_seller_listing_visibility_owner_open
  ON public.private_seller_listing_visibility_events (seller_user_id, hidden_at DESC)
  WHERE restored_at IS NULL;

ALTER TABLE public.private_seller_listing_visibility_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.private_seller_listing_visibility_events FROM anon, authenticated;
COMMENT ON TABLE public.private_seller_listing_visibility_events IS
  'Audit trail for listings hidden by private-seller suspension/revocation. Original car rows and ownership are retained.';

CREATE OR REPLACE FUNCTION public.apply_private_seller_listing_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('suspended', 'revoked')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Record only currently public, approved listings. Never change sold, reserved,
    -- pending, draft, manually hidden, or unapproved listings.
    INSERT INTO public.private_seller_listing_visibility_events
      (car_id, seller_user_id, previous_status, suspension_status)
    SELECT c.id, c.dealer_id, c.status, NEW.status
    FROM public.cars c
    WHERE c.dealer_id = NEW.user_id
      AND c.status = 'available'
      AND c.approved = true
      AND c.deleted_at IS NULL
    ON CONFLICT (car_id) WHERE restored_at IS NULL DO NOTHING;

    UPDATE public.cars c
       SET status = 'hidden', updated_at = now()
     WHERE c.dealer_id = NEW.user_id
       AND c.status = 'available'
       AND c.approved = true
       AND c.deleted_at IS NULL
       AND EXISTS (
         SELECT 1
         FROM public.private_seller_listing_visibility_events e
         WHERE e.car_id = c.id
           AND e.seller_user_id = NEW.user_id
           AND e.restored_at IS NULL
       );
  ELSIF NEW.status = 'approved'
        AND OLD.status IN ('suspended', 'revoked') THEN
    -- Restore only listings hidden by this policy that remain hidden and retain
    -- the same owner. If an administrator changed a listing to sold/reserved/etc,
    -- that current state is preserved.
    UPDATE public.cars c
       SET status = e.previous_status, updated_at = now()
      FROM public.private_seller_listing_visibility_events e
     WHERE e.car_id = c.id
       AND e.seller_user_id = NEW.user_id
       AND c.dealer_id = NEW.user_id
       AND c.status = 'hidden'
       AND e.restored_at IS NULL;

    UPDATE public.private_seller_listing_visibility_events
       SET restored_at = now()
     WHERE seller_user_id = NEW.user_id
       AND restored_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_seller_listing_visibility ON public.private_seller_capabilities;
CREATE TRIGGER trg_private_seller_listing_visibility
AFTER UPDATE OF status ON public.private_seller_capabilities
FOR EACH ROW
EXECUTE FUNCTION public.apply_private_seller_listing_visibility();

-- One-time reconciliation for accounts already suspended/revoked when this migration
-- is first applied. This remains transactionally tied to the migration and is
-- idempotent because open visibility events have a partial unique index.
INSERT INTO public.private_seller_listing_visibility_events
  (car_id, seller_user_id, previous_status, suspension_status)
SELECT c.id, c.dealer_id, c.status, psc.status
FROM public.cars c
JOIN public.private_seller_capabilities psc ON psc.user_id = c.dealer_id
WHERE psc.status IN ('suspended', 'revoked')
  AND c.status = 'available'
  AND c.approved = true
  AND c.deleted_at IS NULL
ON CONFLICT (car_id) WHERE restored_at IS NULL DO NOTHING;

UPDATE public.cars c
   SET status = 'hidden', updated_at = now()
 WHERE c.status = 'available'
   AND c.approved = true
   AND c.deleted_at IS NULL
   AND EXISTS (
     SELECT 1 FROM public.private_seller_listing_visibility_events e
     JOIN public.private_seller_capabilities psc ON psc.user_id = e.seller_user_id
     WHERE e.car_id = c.id
       AND e.seller_user_id = c.dealer_id
       AND e.restored_at IS NULL
       AND psc.status IN ('suspended', 'revoked')
   );
