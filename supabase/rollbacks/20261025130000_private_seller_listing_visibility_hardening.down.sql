-- Rollback of 20261025130000_private_seller_listing_visibility_hardening.sql.
-- Removes the backstop trigger, the outcome column, and restores the Phase 13E trigger function body. Listing rows,
-- ownership and the events table (created by 20261025113000) are untouched.
DROP TRIGGER IF EXISTS trg_cars_private_seller_visibility_enforce ON public.cars;
DROP FUNCTION IF EXISTS public.enforce_private_seller_listing_visibility();
ALTER TABLE public.private_seller_listing_visibility_events DROP CONSTRAINT IF EXISTS private_seller_listing_visibility_events_outcome_check;
ALTER TABLE public.private_seller_listing_visibility_events DROP COLUMN IF EXISTS restore_outcome;
CREATE OR REPLACE FUNCTION public.apply_private_seller_listing_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('suspended', 'revoked') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.private_seller_listing_visibility_events (car_id, seller_user_id, previous_status, suspension_status)
    SELECT c.id, c.dealer_id, c.status, NEW.status FROM public.cars c
    WHERE c.dealer_id = NEW.user_id AND c.status = 'available' AND c.approved = true AND c.deleted_at IS NULL
    ON CONFLICT (car_id) WHERE restored_at IS NULL DO NOTHING;
    UPDATE public.cars c SET status = 'hidden', updated_at = now()
     WHERE c.dealer_id = NEW.user_id AND c.status = 'available' AND c.approved = true AND c.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM public.private_seller_listing_visibility_events e WHERE e.car_id = c.id AND e.seller_user_id = NEW.user_id AND e.restored_at IS NULL);
  ELSIF NEW.status = 'approved' AND OLD.status IN ('suspended', 'revoked') THEN
    UPDATE public.cars c SET status = e.previous_status, updated_at = now()
      FROM public.private_seller_listing_visibility_events e
     WHERE e.car_id = c.id AND e.seller_user_id = NEW.user_id AND c.dealer_id = NEW.user_id AND c.status = 'hidden' AND e.restored_at IS NULL;
    UPDATE public.private_seller_listing_visibility_events SET restored_at = now() WHERE seller_user_id = NEW.user_id AND restored_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
