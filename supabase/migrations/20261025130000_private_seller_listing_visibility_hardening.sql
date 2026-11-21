-- Phase 13F hardening of the Phase 13E private-seller listing-visibility policy. Additive; apply only after explicit
-- environment approval. Replaces the 13E trigger function and adds one backstop trigger. No row is deleted or re-owned.
--
-- 1. Dealer/staff isolation: the visibility policy only ever touches listings owned by PERSONAL accounts
--    (users.role IN ('user','individual_seller')). A capability row left behind by an account that later became a dealer
--    can never hide dealer-owned inventory.
-- 2. Restoration eligibility: only listings that are still hidden, still owned by the seller, NOT soft-deleted and still
--    admin-approved are restored. Every open event is closed with an explicit outcome instead of silently.
-- 3. Backstop: a listing that becomes public ('available' + approved + not deleted) while its owner is suspended/revoked
--    (e.g. an admin approving a pending listing, or a write racing the suspension) is hidden and tracked immediately.
--    The capability row is read with FOR SHARE, so a concurrent suspension waits for the writer and then hides the row.

ALTER TABLE public.private_seller_listing_visibility_events
  ADD COLUMN IF NOT EXISTS restore_outcome text;
ALTER TABLE public.private_seller_listing_visibility_events
  DROP CONSTRAINT IF EXISTS private_seller_listing_visibility_events_outcome_check;
ALTER TABLE public.private_seller_listing_visibility_events
  ADD CONSTRAINT private_seller_listing_visibility_events_outcome_check
  CHECK (restore_outcome IS NULL OR restore_outcome IN ('restored', 'skipped_ineligible'));

CREATE OR REPLACE FUNCTION public.apply_private_seller_listing_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Personal accounts only: never hide or restore dealer / staff owned inventory.
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.role IN ('user', 'individual_seller')) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('suspended', 'revoked') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.private_seller_listing_visibility_events
      (car_id, seller_user_id, previous_status, suspension_status)
    SELECT c.id, c.dealer_id, c.status, NEW.status
    FROM public.cars c
    WHERE c.dealer_id = NEW.user_id
      AND c.status = 'available'
      AND c.approved = true
      AND c.deleted_at IS NULL
    ON CONFLICT (car_id) WHERE restored_at IS NULL DO NOTHING;

    -- suspended -> revoked keeps the existing open events; record the stronger state.
    UPDATE public.private_seller_listing_visibility_events
       SET suspension_status = NEW.status
     WHERE seller_user_id = NEW.user_id AND restored_at IS NULL AND suspension_status IS DISTINCT FROM NEW.status;

    UPDATE public.cars c
       SET status = 'hidden', updated_at = now()
     WHERE c.dealer_id = NEW.user_id
       AND c.status = 'available'
       AND c.approved = true
       AND c.deleted_at IS NULL
       AND EXISTS (
         SELECT 1 FROM public.private_seller_listing_visibility_events e
         WHERE e.car_id = c.id AND e.seller_user_id = NEW.user_id AND e.restored_at IS NULL
       );
  ELSIF NEW.status = 'approved' AND OLD.status IN ('suspended', 'revoked') THEN
    WITH restored AS (
      UPDATE public.cars c
         SET status = e.previous_status, updated_at = now()
        FROM public.private_seller_listing_visibility_events e
       WHERE e.car_id = c.id
         AND e.seller_user_id = NEW.user_id
         AND e.restored_at IS NULL
         AND c.dealer_id = NEW.user_id
         AND c.status = 'hidden'
         AND c.deleted_at IS NULL
         AND c.approved = true
      RETURNING e.id
    )
    UPDATE public.private_seller_listing_visibility_events e
       SET restored_at = now(),
           restore_outcome = CASE WHEN e.id IN (SELECT id FROM restored) THEN 'restored' ELSE 'skipped_ineligible' END
     WHERE e.seller_user_id = NEW.user_id AND e.restored_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_private_seller_listing_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.dealer_id IS NULL OR NEW.status IS DISTINCT FROM 'available' OR NEW.approved IS NOT TRUE OR NEW.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;
  SELECT psc.status INTO v_status
    FROM public.private_seller_capabilities psc
    JOIN public.users u ON u.id = psc.user_id AND u.role IN ('user', 'individual_seller')
   WHERE psc.user_id = NEW.dealer_id
     FOR SHARE OF psc;
  IF v_status IN ('suspended', 'revoked') THEN
    INSERT INTO public.private_seller_listing_visibility_events
      (car_id, seller_user_id, previous_status, suspension_status)
    VALUES (NEW.id, NEW.dealer_id, 'available', v_status)
    ON CONFLICT (car_id) WHERE restored_at IS NULL DO NOTHING;
    UPDATE public.cars SET status = 'hidden', updated_at = now() WHERE id = NEW.id AND status = 'available';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cars_private_seller_visibility_enforce ON public.cars;
CREATE TRIGGER trg_cars_private_seller_visibility_enforce
AFTER INSERT OR UPDATE OF status, approved, dealer_id, deleted_at ON public.cars
FOR EACH ROW
WHEN (NEW.status = 'available')
EXECUTE FUNCTION public.enforce_private_seller_listing_visibility();

REVOKE ALL ON FUNCTION public.apply_private_seller_listing_visibility() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_private_seller_listing_visibility() FROM PUBLIC, anon, authenticated;
