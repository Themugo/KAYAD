-- Dealer listing lifecycle (DA-01/02/03) and permanent per-dealer listing numbers (DA-07).
-- Forward-only and additive. Idempotent (IF NOT EXISTS / CREATE OR REPLACE / guarded backfill).
-- NOT applied to any hosted database by this change; the owner applies migrations through the normal release process.
-- Rollback notes are in docs/handover/DEALER-IMPLEMENTATION-20261121/DEALER-DATABASE-MIGRATION-REVIEW.md.

-- ---------------------------------------------------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------------------------------------------------
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS listing_number integer;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS sold_at timestamptz;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 2. Dealer lifecycle audit / sale record (append-only)
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dealer_listing_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('dealer_owner','dealer_staff','admin','system')),
  action text NOT NULL CHECK (action IN ('dealer_hide','dealer_publish','dealer_mark_sold','admin_sold_correction')),
  previous_status text NOT NULL,
  next_status text NOT NULL,
  sale_price numeric,
  buyer_name text,
  notes text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dealer_listing_lifecycle_dealer ON public.dealer_listing_lifecycle_events (dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dealer_listing_lifecycle_car ON public.dealer_listing_lifecycle_events (car_id, created_at DESC);
ALTER TABLE public.dealer_listing_lifecycle_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dealer_listing_lifecycle_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.dealer_listing_lifecycle_events TO service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 3. Permanent per-owner listing numbers (never reused: the counter only moves forward and survives removal of a listing)
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dealer_listing_counters (
  dealer_id uuid PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_listing_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dealer_listing_counters FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dealer_listing_counters TO service_role;

-- Allocation is a single-statement upsert: the row lock taken by ON CONFLICT DO UPDATE serialises concurrent inserts per owner.
CREATE OR REPLACE FUNCTION public.kayad_cars_assign_listing_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_next integer;
BEGIN
  IF NEW.listing_number IS NULL AND NEW.dealer_id IS NOT NULL THEN
    INSERT INTO public.dealer_listing_counters AS c (dealer_id, last_number) VALUES (NEW.dealer_id, 1)
    ON CONFLICT (dealer_id) DO UPDATE SET last_number = c.last_number + 1, updated_at = now()
    RETURNING last_number INTO v_next;
    NEW.listing_number := v_next;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_cars_assign_listing_number ON public.cars;
CREATE TRIGGER trg_cars_assign_listing_number BEFORE INSERT ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.kayad_cars_assign_listing_number();

-- The number is permanent: it can be set once (backfill) and never changed or cleared afterwards.
CREATE OR REPLACE FUNCTION public.kayad_cars_listing_number_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.listing_number IS NOT NULL AND NEW.listing_number IS DISTINCT FROM OLD.listing_number THEN
    RAISE EXCEPTION 'LISTING_NUMBER_IMMUTABLE' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.listing_number IS NOT NULL AND NEW.dealer_id IS DISTINCT FROM OLD.dealer_id THEN
    -- A number belongs to the owner that was issued it; moving a listing to another owner would collide or reuse numbers.
    RAISE EXCEPTION 'LISTING_NUMBER_IMMUTABLE' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_cars_listing_number_immutable ON public.cars;
CREATE TRIGGER trg_cars_listing_number_immutable BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.kayad_cars_listing_number_immutable();

-- Backfill (idempotent): only listings without a number, oldest first (created_at, id), continuing after the owner's counter.
-- Removed (soft-deleted) listings are numbered too so that their numbers are never handed out again.
DO $$
BEGIN
  LOCK TABLE public.cars IN SHARE ROW EXCLUSIVE MODE;
  WITH base AS (
    SELECT dealer_id, COALESCE(max(listing_number), 0) AS mx FROM public.cars WHERE dealer_id IS NOT NULL GROUP BY dealer_id
  ), ranked AS (
    SELECT c.id, c.dealer_id,
           b.mx + row_number() OVER (PARTITION BY c.dealer_id ORDER BY c.created_at, c.id) AS n
    FROM public.cars c JOIN base b ON b.dealer_id = c.dealer_id
    WHERE c.listing_number IS NULL AND c.dealer_id IS NOT NULL
  )
  UPDATE public.cars c SET listing_number = r.n FROM ranked r WHERE c.id = r.id;

  INSERT INTO public.dealer_listing_counters AS k (dealer_id, last_number)
  SELECT dealer_id, max(listing_number) FROM public.cars WHERE dealer_id IS NOT NULL AND listing_number IS NOT NULL GROUP BY dealer_id
  ON CONFLICT (dealer_id) DO UPDATE SET last_number = GREATEST(k.last_number, EXCLUDED.last_number), updated_at = now();
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cars_owner_listing_number ON public.cars (dealer_id, listing_number) WHERE listing_number IS NOT NULL;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 4. Sold listings are read-only at the database level (backstop under the service layer). Admin corrections go through
--    kayad_admin_correct_sold_listing(), which audits and sets a transaction-local bypass.
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_cars_sold_read_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (OLD.status = 'sold' OR COALESCE(OLD.sold, false)) AND COALESCE(current_setting('kayad.sold_correction', true), '') <> 'on' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.sold IS DISTINCT FROM OLD.sold
       OR NEW.title IS DISTINCT FROM OLD.title OR NEW.price IS DISTINCT FROM OLD.price
       OR NEW.description IS DISTINCT FROM OLD.description OR NEW.images IS DISTINCT FROM OLD.images
       OR NEW.cover_image IS DISTINCT FROM OLD.cover_image OR NEW.features IS DISTINCT FROM OLD.features
       OR NEW.brand IS DISTINCT FROM OLD.brand OR NEW.model IS DISTINCT FROM OLD.model OR NEW.year IS DISTINCT FROM OLD.year
       OR NEW.mileage IS DISTINCT FROM OLD.mileage OR NEW.vin IS DISTINCT FROM OLD.vin
       OR NEW.dealer_id IS DISTINCT FROM OLD.dealer_id OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
       OR NEW.sold_at IS DISTINCT FROM OLD.sold_at THEN
      RAISE EXCEPTION 'LISTING_SOLD_READ_ONLY' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_cars_sold_read_only ON public.cars;
CREATE TRIGGER trg_cars_sold_read_only BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.kayad_cars_sold_read_only();

-- ---------------------------------------------------------------------------------------------------------------------------
-- 5. Atomic dealer lifecycle: same invariants as the personal lifecycle, scoped to the dealer business (staff act on the
--    business id; p_actor_id is the real person for the audit row).
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_dealer_listing_lifecycle_atomic(
  p_car_id uuid,
  p_dealer_id uuid,
  p_action text,
  p_actor_id uuid DEFAULT NULL,
  p_sale jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_car public.cars%ROWTYPE;
  v_owner_role text;
  v_next text;
  v_price numeric;
  v_buyer text;
  v_notes text;
  v_actor uuid := COALESCE(p_actor_id, p_dealer_id);
BEGIN
  IF p_action NOT IN ('hide','publish','mark_sold') THEN
    RAISE EXCEPTION 'INVALID_LISTING_ACTION' USING ERRCODE = '22023';
  END IF;
  SELECT role INTO v_owner_role FROM public.users WHERE id = p_dealer_id;
  IF v_owner_role IS NULL OR v_owner_role <> 'dealer' THEN
    RAISE EXCEPTION 'DEALER_ACCOUNT_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_car FROM public.cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND OR v_car.dealer_id IS DISTINCT FROM p_dealer_id THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_car.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'LISTING_REMOVED' USING ERRCODE = 'P0001'; END IF;
  IF v_car.status = 'sold' OR COALESCE(v_car.sold, false) THEN RAISE EXCEPTION 'ALREADY_SOLD' USING ERRCODE = 'P0001'; END IF;
  IF v_car.status IN ('reserved','rejected') THEN RAISE EXCEPTION 'LISTING_STATE_LOCKED' USING ERRCODE = 'P0001'; END IF;

  IF COALESCE(v_car.bids_count,0) > 0 OR v_car.highest_bidder_id IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.bids b WHERE b.car_id = p_car_id)
     OR COALESCE(v_car.auction_status,'none') IN ('live','ended') THEN
    RAISE EXCEPTION 'AUCTION_OR_BID_LOCK' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.escrows e WHERE e.car = p_car_id AND e.status IN ('pending','funded','vehicle_confirmed','delivered','disputed'))
     OR EXISTS (SELECT 1 FROM public.purchase_outcomes o WHERE o.car_id = p_car_id AND o.status IN ('payment_received','refund_pending','ready_for_collection','collected','transfer_pending','disputed')) THEN
    RAISE EXCEPTION 'TRANSACTION_LOCK' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.marketplace_offer_settlements s WHERE s.vehicle_id = p_car_id AND s.status IN ('awaiting_payment','paid')) THEN
    RAISE EXCEPTION 'OFFER_SETTLEMENT_LOCK' USING ERRCODE = 'P0001';
  END IF;

  IF p_action = 'hide' THEN
    IF v_car.status <> 'available' THEN RAISE EXCEPTION 'LISTING_NOT_PUBLISHED' USING ERRCODE = 'P0001'; END IF;
    v_next := 'hidden';
  ELSIF p_action = 'publish' THEN
    IF v_car.status NOT IN ('hidden','draft') THEN RAISE EXCEPTION 'LISTING_NOT_ELIGIBLE_TO_PUBLISH' USING ERRCODE = 'P0001'; END IF;
    v_next := 'available';
  ELSE
    IF v_car.status NOT IN ('available','hidden','draft','pending') THEN RAISE EXCEPTION 'LISTING_NOT_ELIGIBLE_TO_MARK_SOLD' USING ERRCODE = 'P0001'; END IF;
    v_next := 'sold';
    v_price := NULLIF(p_sale->>'salePrice','')::numeric;
    IF v_price IS NULL OR v_price <= 0 THEN v_price := v_car.price; END IF;
    v_buyer := NULLIF(left(p_sale->>'buyerName', 200), '');
    v_notes := NULLIF(left(p_sale->>'notes', 500), '');
  END IF;

  UPDATE public.cars
     SET status = v_next, sold = (p_action = 'mark_sold'),
         sold_at = CASE WHEN p_action = 'mark_sold' THEN now() ELSE sold_at END,
         updated_at = now()
   WHERE id = p_car_id;

  INSERT INTO public.dealer_listing_lifecycle_events
    (car_id, dealer_id, actor_user_id, actor_type, action, previous_status, next_status, sale_price, buyer_name, notes)
  VALUES (p_car_id, p_dealer_id, v_actor,
          CASE WHEN v_actor = p_dealer_id THEN 'dealer_owner' ELSE 'dealer_staff' END,
          CASE p_action WHEN 'hide' THEN 'dealer_hide' WHEN 'publish' THEN 'dealer_publish' ELSE 'dealer_mark_sold' END,
          v_car.status, v_next, v_price, v_buyer, v_notes);

  RETURN jsonb_build_object('id', p_car_id, 'previousStatus', v_car.status, 'status', v_next, 'action', p_action,
                            'salePrice', v_price, 'buyerName', v_buyer, 'notes', v_notes, 'listingNumber', v_car.listing_number);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_dealer_listing_lifecycle_atomic(uuid,uuid,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_dealer_listing_lifecycle_atomic(uuid,uuid,text,uuid,jsonb) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 6. Authorised, audited correction of a sold listing (admin only; the reason is mandatory).
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_admin_correct_sold_listing(p_car_id uuid, p_admin_id uuid, p_reason text, p_target_status text DEFAULT 'hidden')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_car public.cars%ROWTYPE; v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_admin_id;
  IF v_role IS NULL OR v_role NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = '22023'; END IF;
  IF p_target_status NOT IN ('hidden','available') THEN RAISE EXCEPTION 'INVALID_TARGET_STATUS' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LISTING_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF NOT (v_car.status = 'sold' OR COALESCE(v_car.sold,false)) THEN RAISE EXCEPTION 'LISTING_NOT_SOLD' USING ERRCODE = 'P0001'; END IF;
  PERFORM set_config('kayad.sold_correction', 'on', true);
  UPDATE public.cars SET status = p_target_status, sold = false, sold_at = NULL, updated_at = now() WHERE id = p_car_id;
  PERFORM set_config('kayad.sold_correction', 'off', true);
  INSERT INTO public.dealer_listing_lifecycle_events (car_id, dealer_id, actor_user_id, actor_type, action, previous_status, next_status, reason)
  VALUES (p_car_id, v_car.dealer_id, p_admin_id, 'admin', 'admin_sold_correction', v_car.status, p_target_status, btrim(p_reason));
  RETURN jsonb_build_object('id', p_car_id, 'previousStatus', v_car.status, 'status', p_target_status);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_admin_correct_sold_listing(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_admin_correct_sold_listing(uuid,uuid,text,text) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 7. Race guard: funding an escrow or opening an offer settlement takes a shared lock on the listing row, so it serialises with
--    the lifecycle function's FOR UPDATE, and it refuses to open a transaction on an already-sold listing.
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_listing_manually_sold(p_car_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_personal boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.cars c WHERE c.id = p_car_id AND c.sold_at IS NOT NULL) THEN RETURN true; END IF;
  -- The personal lifecycle table may not exist in every environment (older schemas): treat that as "not manually sold".
  IF to_regclass('public.personal_listing_lifecycle_events') IS NOT NULL THEN
    EXECUTE $q$SELECT EXISTS (SELECT 1 FROM public.personal_listing_lifecycle_events e
                  WHERE e.car_id = $1 AND e.action = 'seller_mark_sold'
                    AND e.created_at >= COALESCE((SELECT max(x.created_at) FROM public.personal_listing_lifecycle_events x
                                                   WHERE x.car_id = $1 AND x.action IN ('seller_publish','seller_hide')), '-infinity'::timestamptz))$q$
      INTO v_personal USING p_car_id;
  END IF;
  RETURN v_personal;
END; $$;

CREATE OR REPLACE FUNCTION public.kayad_escrow_listing_sale_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF NEW.car IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IN ('pending','funded','vehicle_confirmed','delivered','disputed')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status AND OLD.status NOT IN ('pending','funded','vehicle_confirmed','delivered','disputed')) THEN
    SELECT status INTO v_status FROM public.cars WHERE id = NEW.car FOR SHARE;
    -- Only a sale COMPLETED BY THE OWNER through a lifecycle action blocks a new transaction. A payment-driven sale (the purchase flow marks
    -- the car sold and then records escrow / settlement state) is not a manual sale and must keep working.
    IF v_status = 'sold' AND public.kayad_listing_manually_sold(NEW.car) THEN RAISE EXCEPTION 'LISTING_ALREADY_SOLD' USING ERRCODE = 'P0001'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_escrow_listing_sale_guard ON public.escrows;
CREATE TRIGGER trg_escrow_listing_sale_guard BEFORE INSERT OR UPDATE OF status ON public.escrows
  FOR EACH ROW EXECUTE FUNCTION public.kayad_escrow_listing_sale_guard();

CREATE OR REPLACE FUNCTION public.kayad_settlement_listing_sale_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  -- Opening a settlement is the guarded event; moving an existing one to paid/cancelled/expired is the normal payment lifecycle.
  IF NEW.status = 'awaiting_payment' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT status INTO v_status FROM public.cars WHERE id = NEW.vehicle_id FOR SHARE;
    IF v_status = 'sold' AND public.kayad_listing_manually_sold(NEW.vehicle_id) THEN RAISE EXCEPTION 'LISTING_ALREADY_SOLD' USING ERRCODE = 'P0001'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DO $$
BEGIN
  -- marketplace_offer_settlements arrives with the offer-settlement migrations; where it is not deployed yet there is nothing to guard.
  IF to_regclass('public.marketplace_offer_settlements') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_settlement_listing_sale_guard ON public.marketplace_offer_settlements;
    CREATE TRIGGER trg_settlement_listing_sale_guard BEFORE INSERT OR UPDATE OF status ON public.marketplace_offer_settlements
      FOR EACH ROW EXECUTE FUNCTION public.kayad_settlement_listing_sale_guard();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
