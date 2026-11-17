-- Personal listing lifecycle: owner-only hide/publish/mark-sold transitions.
-- Uses existing cars.status values and adds only an append-only lifecycle audit table.
-- All checks and the listing write run under one row lock so auction/payment flows serialize with seller actions.
CREATE TABLE IF NOT EXISTS public.personal_listing_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  seller_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('personal_seller','moderator','system')),
  action text NOT NULL CHECK (action IN ('seller_hide','seller_publish','seller_mark_sold','moderation_hide','moderation_approve')),
  previous_status text NOT NULL CHECK (previous_status IN ('available','hidden','pending','draft','sold','reserved')),
  next_status text NOT NULL CHECK (next_status IN ('available','hidden','pending','draft','sold','reserved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_personal_listing_lifecycle_owner
  ON public.personal_listing_lifecycle_events (seller_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_listing_lifecycle_car
  ON public.personal_listing_lifecycle_events (car_id, created_at DESC);
ALTER TABLE public.personal_listing_lifecycle_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.personal_listing_lifecycle_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.kayad_personal_listing_lifecycle_atomic(
  p_car_id uuid,
  p_owner_id uuid,
  p_action text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car public.cars%ROWTYPE;
  v_bid_count bigint := 0;
  v_active_escrow boolean := false;
  v_active_outcome boolean := false;
  v_capability_status text;
  v_last_lifecycle_action text;
  v_next_status text;
BEGIN
  IF p_action NOT IN ('hide','publish','mark_sold') THEN
    RAISE EXCEPTION 'INVALID_LISTING_ACTION' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_car FROM public.cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND OR v_car.dealer_id IS DISTINCT FROM p_owner_id THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_car.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'LISTING_REMOVED' USING ERRCODE = 'P0001';
  END IF;
  IF v_car.status IN ('sold','reserved','rejected') OR COALESCE(v_car.sold,false) THEN
    RAISE EXCEPTION 'LISTING_STATE_LOCKED' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_bid_count FROM public.bids WHERE car_id = p_car_id;
  IF COALESCE(v_car.bids_count,0) > 0 OR v_car.highest_bidder_id IS NOT NULL OR v_bid_count > 0
     OR COALESCE(v_car.auction_status,'none') IN ('live','ended') THEN
    RAISE EXCEPTION 'AUCTION_OR_BID_LOCK' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.escrows e
    WHERE e.car = p_car_id AND e.status IN ('pending','funded','vehicle_confirmed','delivered','disputed')
  ) INTO v_active_escrow;
  SELECT EXISTS (
    SELECT 1 FROM public.purchase_outcomes o
    WHERE o.car_id = p_car_id AND o.status IN ('payment_received','ready_for_collection','collected','transfer_pending','disputed')
  ) INTO v_active_outcome;
  IF v_active_escrow OR v_active_outcome THEN
    RAISE EXCEPTION 'TRANSACTION_LOCK' USING ERRCODE = 'P0001';
  END IF;

  IF p_action = 'hide' THEN
    IF v_car.status <> 'available' THEN
      RAISE EXCEPTION 'LISTING_NOT_PUBLISHED' USING ERRCODE = 'P0001';
    END IF;
    v_next_status := 'hidden';
  ELSIF p_action = 'publish' THEN
    IF v_car.status <> 'hidden' OR COALESCE(v_car.approved,false) IS NOT TRUE THEN
      RAISE EXCEPTION 'LISTING_NOT_ELIGIBLE_TO_PUBLISH' USING ERRCODE = 'P0001';
    END IF;
    -- Never undo an account suspension or a moderator hide. Only the most recent
    -- seller-originated hide action is reversible from the personal dashboard.
    IF EXISTS (SELECT 1 FROM public.private_seller_listing_visibility_events e WHERE e.car_id=p_car_id AND e.restored_at IS NULL) THEN
      RAISE EXCEPTION 'LISTING_POLICY_HIDDEN' USING ERRCODE = 'P0001';
    END IF;
    SELECT action INTO v_last_lifecycle_action FROM public.personal_listing_lifecycle_events
      WHERE car_id=p_car_id ORDER BY created_at DESC, id DESC LIMIT 1;
    IF v_last_lifecycle_action IS DISTINCT FROM 'seller_hide' THEN
      RAISE EXCEPTION 'LISTING_NOT_SELLER_HIDDEN' USING ERRCODE = 'P0001';
    END IF;
    SELECT status INTO v_capability_status FROM public.private_seller_capabilities WHERE user_id=p_owner_id;
    IF v_capability_status IN ('suspended','revoked') THEN
      RAISE EXCEPTION 'SELLER_CAPABILITY_BLOCKED' USING ERRCODE = 'P0001';
    END IF;
    v_next_status := 'available';
  ELSE
    IF v_car.status NOT IN ('available','hidden') THEN
      RAISE EXCEPTION 'LISTING_NOT_ELIGIBLE_TO_MARK_SOLD' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.private_seller_listing_visibility_events e WHERE e.car_id=p_car_id AND e.restored_at IS NULL) THEN
      RAISE EXCEPTION 'LISTING_POLICY_HIDDEN' USING ERRCODE = 'P0001';
    END IF;
    IF v_car.status = 'hidden' THEN
      SELECT action INTO v_last_lifecycle_action FROM public.personal_listing_lifecycle_events
        WHERE car_id=p_car_id ORDER BY created_at DESC, id DESC LIMIT 1;
      IF v_last_lifecycle_action IS DISTINCT FROM 'seller_hide' THEN
        RAISE EXCEPTION 'LISTING_NOT_SELLER_HIDDEN' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    v_next_status := 'sold';
  END IF;

  UPDATE public.cars
     SET status = v_next_status,
         sold = (p_action = 'mark_sold'),
         updated_at = now()
   WHERE id = p_car_id;

  INSERT INTO public.personal_listing_lifecycle_events
    (car_id, seller_user_id, actor_user_id, actor_type, action, previous_status, next_status)
  VALUES (
    p_car_id, p_owner_id, p_owner_id, 'personal_seller',
    CASE p_action WHEN 'hide' THEN 'seller_hide' WHEN 'publish' THEN 'seller_publish' ELSE 'seller_mark_sold' END,
    v_car.status, v_next_status
  );

  RETURN jsonb_build_object('id',p_car_id,'previousStatus',v_car.status,'status',v_next_status,'action',p_action);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_personal_listing_lifecycle_atomic(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_personal_listing_lifecycle_atomic(uuid,uuid,text) TO service_role;
