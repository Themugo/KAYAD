-- Phase 13E completion rollback. Restore only listings still hidden by this policy,
-- preserving sold/reserved/pending/draft/manual-hidden states and all ownership.
DO $$
BEGIN
  IF to_regclass('public.private_seller_listing_visibility_events') IS NOT NULL THEN
    UPDATE public.cars c
       SET status = e.previous_status, updated_at = now()
      FROM public.private_seller_listing_visibility_events e
     WHERE e.car_id = c.id
       AND c.dealer_id = e.seller_user_id
       AND c.status = 'hidden'
       AND e.restored_at IS NULL;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_private_seller_listing_visibility ON public.private_seller_capabilities;
DROP FUNCTION IF EXISTS public.apply_private_seller_listing_visibility();
DROP TABLE IF EXISTS public.private_seller_listing_visibility_events;
