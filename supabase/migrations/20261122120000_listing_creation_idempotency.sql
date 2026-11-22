-- Listing creation: exactly-once by a database-owned, owner-scoped idempotency key (Phase 1, FINAL-COMPLETION).
-- Forward-only. Adds two nullable columns and a partial unique index to cars; replaces the paid-path function so that
--   * the replay lookup is scoped to the OWNER (before: any owner presenting a known key got the other owner's listing back),
--   * the same key with a DIFFERENT request payload is refused (IDEMPOTENCY_KEY_REUSED) instead of silently replaying,
--   * the reservation key is stored owner-prefixed so two owners may use the same key.
-- The free (non-subscription) path inserts into cars with the same two columns; the unique index makes a concurrent duplicate fail
-- atomically (23505) and the application then replays or refuses by comparing request_hash. Rows written before this migration keep NULL.
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS creation_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS creation_request_hash TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cars_creation_idempotency_key_chk') THEN
    ALTER TABLE public.cars ADD CONSTRAINT cars_creation_idempotency_key_chk
      CHECK (creation_idempotency_key IS NULL OR (length(creation_idempotency_key) BETWEEN 1 AND 200 AND creation_request_hash IS NOT NULL));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cars_owner_creation_key
  ON public.cars (dealer_id, creation_idempotency_key)
  WHERE creation_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kayad_cars_creation_key_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.creation_idempotency_key IS DISTINCT FROM NEW.creation_idempotency_key
     OR OLD.creation_request_hash IS DISTINCT FROM NEW.creation_request_hash THEN
    RAISE EXCEPTION 'cars.creation_idempotency_key and creation_request_hash are immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kayad_cars_creation_key_immutable ON public.cars;
CREATE TRIGGER kayad_cars_creation_key_immutable BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.kayad_cars_creation_key_immutable();

-- The 3-argument form is replaced by the 4-argument form (p_request_hash defaults to NULL: no client key, no replay).
DROP FUNCTION IF EXISTS public.kayad_create_dealer_listing_atomic(UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.kayad_create_dealer_listing_atomic(
  p_dealer_id UUID,
  p_listing JSONB,
  p_idempotency_key TEXT,
  p_request_hash TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_sub public.dealer_subscriptions%ROWTYPE;
  v_existing public.listing_entitlement_reservations%ROWTYPE;
  v_used INTEGER;
  v_limit INTEGER;
  v_car public.cars%ROWTYPE;
BEGIN
  IF p_dealer_id IS NULL OR NULLIF(trim(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Dealer listing identity is incomplete';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('dealer-listing:' || p_dealer_id::TEXT, 0));

  -- Exactly-once: the key is scoped to the OWNER (a key presented by another dealer never finds this dealer's listing). The per-dealer
  -- advisory lock above serialises concurrent attempts; the unique index uq_cars_owner_creation_key is the durable backstop.
  IF p_request_hash IS NOT NULL THEN
    SELECT * INTO v_car FROM public.cars WHERE dealer_id = p_dealer_id AND creation_idempotency_key = p_idempotency_key;
    IF FOUND THEN
      IF v_car.creation_request_hash IS DISTINCT FROM p_request_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED: this Idempotency-Key was already used for a different listing request';
      END IF;
      RETURN jsonb_build_object('listing', to_jsonb(v_car), 'idempotent', true);
    END IF;
  END IF;
  -- Reservations written before this migration (raw key, no payload hash): same owner and key is still a replay.
  SELECT * INTO v_existing
  FROM public.listing_entitlement_reservations
  WHERE dealer_id = p_dealer_id AND idempotency_key IN (p_idempotency_key, p_dealer_id::TEXT || ':' || p_idempotency_key)
  FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO v_car FROM public.cars WHERE id = v_existing.listing_id;
    RETURN jsonb_build_object('listing', to_jsonb(v_car), 'idempotent', true);
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = p_dealer_id FOR UPDATE;
  IF NOT FOUND OR v_user.role <> 'dealer' THEN
    RAISE EXCEPTION 'Dealer not found';
  END IF;
  IF COALESCE(v_user.listings_locked, false) THEN
    RAISE EXCEPTION 'Dealer listings are currently locked';
  END IF;

  SELECT * INTO v_sub
  FROM public.dealer_subscriptions
  WHERE dealer = p_dealer_id
    AND status IN ('active','cancelled')
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active dealer subscription is required to list vehicles';
  END IF;

  v_limit := COALESCE(v_sub.listing_max, 0);
  SELECT count(*)::INTEGER INTO v_used
  FROM public.cars
  WHERE dealer_id = p_dealer_id
    AND deleted_at IS NULL
    AND status IN ('available','pending');

  IF v_limit > 0 AND v_used >= v_limit THEN
    RAISE EXCEPTION 'Dealer listing entitlement exhausted';
  END IF;

  INSERT INTO public.cars (
    dealer_id, title, slug, brand, model, year, price, mileage, fuel,
    transmission, body_type, color, engine, drive_type, condition,
    description, features, images, location_city, vin, chassis_number,
    registration_number, status, views, approved, inspection_status,
    is_verified_dealer, is_promoted, auction_status, auction_end,
    current_bid, bids_count, highest_bidder_id, allow_bid, allow_buy,
    created_at, updated_at, deleted_at, cover_image, trust_score,
    escrow_enabled, price_history, starting_bid, reserve_price,
    reserve_mode, promotion_expires_at, dealer_phone, ntsa_verified,
    duty_status, logbook_verified, sold, "isPaid",
    creation_idempotency_key, creation_request_hash
  ) VALUES (
    p_dealer_id,
    NULLIF(p_listing->>'title',''), p_listing->>'slug',
    NULLIF(p_listing->>'brand',''), NULLIF(p_listing->>'model',''),
    NULLIF(p_listing->>'year','')::INTEGER, NULLIF(p_listing->>'price','')::NUMERIC,
    NULLIF(p_listing->>'mileage','')::INTEGER, p_listing->>'fuel',
    p_listing->>'transmission', p_listing->>'body_type', p_listing->>'color',
    p_listing->>'engine', p_listing->>'drive_type', p_listing->>'condition',
    p_listing->>'description',
    CASE WHEN jsonb_typeof(COALESCE(p_listing->'features','[]'::jsonb))='array' THEN ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_listing->'features','[]'::jsonb))) ELSE '{}'::text[] END,
    COALESCE(p_listing->'images','[]'::jsonb), p_listing->>'location_city',
    p_listing->>'vin', p_listing->>'chassis_number', p_listing->>'registration_number',
    COALESCE(NULLIF(p_listing->>'status',''),'pending'),
    COALESCE(NULLIF(p_listing->>'views','')::INTEGER,0),
    COALESCE((p_listing->>'approved')::BOOLEAN,true),
    COALESCE(NULLIF(p_listing->>'inspection_status',''),'pending'),
    COALESCE((p_listing->>'is_verified_dealer')::BOOLEAN,true),
    COALESCE((p_listing->>'is_promoted')::BOOLEAN,false),
    COALESCE(NULLIF(p_listing->>'auction_status',''),'none'),
    NULLIF(p_listing->>'auction_end','')::TIMESTAMPTZ,
    COALESCE(NULLIF(p_listing->>'current_bid','')::NUMERIC,0),
    COALESCE(NULLIF(p_listing->>'bids_count','')::INTEGER,0),
    NULLIF(p_listing->>'highest_bidder_id','')::UUID,
    COALESCE((p_listing->>'allow_bid')::BOOLEAN,false),
    COALESCE((p_listing->>'allow_buy')::BOOLEAN,true),
    now(), now(), NULL,
    COALESCE(NULLIF(p_listing->>'cover_image','')::INTEGER,0),
    COALESCE(NULLIF(p_listing->>'trust_score','')::NUMERIC,0),
    COALESCE((p_listing->>'escrow_enabled')::BOOLEAN,false),
    COALESCE(p_listing->'price_history','[]'::jsonb),
    NULLIF(p_listing->>'starting_bid','')::NUMERIC,
    NULLIF(p_listing->>'reserve_price','')::NUMERIC,
    p_listing->>'reserve_mode',
    NULLIF(p_listing->>'promotion_expires_at','')::TIMESTAMPTZ,
    p_listing->>'dealer_phone',
    COALESCE((p_listing->>'ntsa_verified')::BOOLEAN,false),
    p_listing->>'duty_status',
    COALESCE((p_listing->>'logbook_verified')::BOOLEAN,false),
    false, false,
    CASE WHEN p_request_hash IS NULL THEN NULL ELSE p_idempotency_key END, p_request_hash
  ) RETURNING * INTO v_car;

  INSERT INTO public.listing_entitlement_reservations(dealer_id, listing_id, idempotency_key)
  VALUES (p_dealer_id, v_car.id, p_dealer_id::TEXT || ':' || p_idempotency_key);

  UPDATE public.users
     SET listing_count = COALESCE(listing_count,0) + 1,
         first_vehicle_used = true,
         updated_at = now()
   WHERE id = p_dealer_id;

  RETURN jsonb_build_object('listing', to_jsonb(v_car), 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_create_dealer_listing_atomic(UUID, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_create_dealer_listing_atomic(UUID, JSONB, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
