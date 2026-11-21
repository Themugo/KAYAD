-- Marketplace purchase lifecycle convergence.
-- Reuses canonical payments, escrows, ledger, dispute and ownership authorities.
-- This migration adds only the missing purchase outcome/fulfilment coordination layer.

CREATE TABLE IF NOT EXISTS public.purchase_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  buyer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  seller_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  escrow_id UUID REFERENCES public.escrows(id) ON DELETE SET NULL,
  settlement_mode TEXT NOT NULL CHECK (settlement_mode IN ('direct','escrow')),
  status TEXT NOT NULL CHECK (status IN ('payment_received','refund_pending','refunded','ready_for_collection','collected','transfer_pending','completed','disputed','cancelled','failed')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_receipt TEXT,
  collection_status TEXT NOT NULL DEFAULT 'pending' CHECK (collection_status IN ('pending','ready','scheduled','collected','failed','blocked')),
  transfer_status TEXT NOT NULL DEFAULT 'pending' CHECK (transfer_status IN ('pending','initiated','completed','failed','blocked')),
  ownership_vehicle_id UUID,
  collection_reference TEXT,
  transfer_reference TEXT,
  failure_reason TEXT,
  dispute_reference UUID,
  refund_reference UUID,
  completed_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_outcomes_payment_uidx ON public.purchase_outcomes(payment_id);
CREATE INDEX IF NOT EXISTS purchase_outcomes_buyer_idx ON public.purchase_outcomes(buyer_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS purchase_outcomes_seller_idx ON public.purchase_outcomes(seller_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS purchase_outcomes_car_idx ON public.purchase_outcomes(car_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS purchase_outcomes_status_idx ON public.purchase_outcomes(status, updated_at DESC);

-- Only one pending Marketplace purchase may exist for a vehicle at a time.
-- This closes the buyer-vs-buyer acquisition race before provider callbacks.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_marketplace_purchase_per_car
  ON public.payments(car_id)
  WHERE type = 'purchase' AND status = 'pending' AND car_id IS NOT NULL;

ALTER TABLE public.purchase_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_outcomes_select_party ON public.purchase_outcomes;
CREATE POLICY purchase_outcomes_select_party ON public.purchase_outcomes
  FOR SELECT TO authenticated
  USING (
    buyer_user_id = auth.uid()
    OR seller_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(COALESCE(u.role,'')) IN ('admin','super_admin','superadmin','staff')
    )
  );

CREATE OR REPLACE FUNCTION public.kayad_settle_purchase_payment_atomic(
  p_payment_id UUID,
  p_receipt TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_car cars%ROWTYPE;
  v_escrow escrows%ROWTYPE;
  v_outcome purchase_outcomes%ROWTYPE;
  v_seller UUID;
  v_commission NUMERIC;
  v_seller_amount NUMERIC;
  v_rate NUMERIC := 0.05;
  v_verified BOOLEAN := true;
  v_mode TEXT;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'purchase' THEN RAISE EXCEPTION 'Payment is not a purchase payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_payment.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not found for purchase payment'; END IF;
  v_seller := v_car.dealer_id;
  IF v_seller IS NULL THEN v_seller := v_payment.user_id; END IF;

  IF EXISTS (SELECT 1 FROM dealers d WHERE d."user" = v_seller) THEN
    SELECT (d.approved AND NOT COALESCE(d.is_suspended, false)) INTO v_verified
      FROM dealers d WHERE d."user" = v_seller;
    IF NOT v_verified AND EXISTS (
      SELECT 1 FROM dealer_verifications dv
       WHERE dv."user" = v_seller AND dv.verification_status = 'approved'
    ) THEN v_verified := true; END IF;
  END IF;

  -- The purchase must still point at an available Marketplace listing.
  -- If the listing became unavailable after STK initiation, do not let the
  -- callback convert it into a second sale; queue the existing refund flow.
  IF COALESCE(v_car.status,'') <> 'available' OR COALESCE(v_car.auction_status,'') IN ('active','live','closing') THEN
    INSERT INTO refunds (payment_id, amount, reason, status, initiated_by)
    SELECT v_payment.id, v_payment.amount, 'Vehicle became unavailable before purchase settlement', 'pending', v_payment.user_id
    WHERE NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id=v_payment.id AND r.status IN ('pending','processing','completed'));
    UPDATE payments SET status='success', mpesa_receipt=p_receipt, paid_at=now(), processed=true, updated_at=now() WHERE id=v_payment.id;
    INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status,failure_reason)
    VALUES (v_payment.car_id,v_payment.user_id,v_seller,v_payment.id,'escrow','refund_pending',v_payment.amount,p_receipt,'blocked','blocked','Vehicle became unavailable before purchase settlement')
    ON CONFLICT (payment_id) DO UPDATE SET status='refund_pending', failure_reason=EXCLUDED.failure_reason, updated_at=now();
    RETURN jsonb_build_object('payment_id',v_payment.id,'refund_required',true,'unavailable',true);
  END IF;

  UPDATE payments
     SET status='success', mpesa_receipt=p_receipt, paid_at=now(), processed=true, updated_at=now()
   WHERE id=v_payment.id;

  IF NOT v_verified THEN
    INSERT INTO refunds (payment_id, amount, reason, status, initiated_by)
    SELECT v_payment.id, v_payment.amount, 'Seller verification required after payment', 'pending', v_payment.user_id
    WHERE NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id=v_payment.id AND r.status IN ('pending','processing','completed'));
    INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status,failure_reason)
    VALUES (v_payment.car_id,v_payment.user_id,v_seller,v_payment.id,'escrow','refund_pending',v_payment.amount,p_receipt,'blocked','blocked','Seller verification required after payment')
    ON CONFLICT (payment_id) DO UPDATE SET status='refund_pending', failure_reason=EXCLUDED.failure_reason, payment_receipt=COALESCE(purchase_outcomes.payment_receipt,EXCLUDED.payment_receipt), updated_at=now();
    RETURN jsonb_build_object('payment_id',v_payment.id,'refund_required',true,'seller_id',v_seller);
  END IF;

  SELECT * INTO v_outcome FROM purchase_outcomes WHERE payment_id=v_payment.id FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('payment_id',v_payment.id,'escrow_id',v_outcome.escrow_id,'funded',v_outcome.settlement_mode='escrow','settlement_mode',v_outcome.settlement_mode,'outcome_id',v_outcome.id,'idempotent',true);
  END IF;

  v_mode := CASE WHEN COALESCE(v_car.escrow_enabled,false) THEN 'escrow' ELSE 'direct' END;

  IF v_mode='direct' THEN
    UPDATE cars SET sold=true,status='sold',"isPaid"=true,payment_status='paid',updated_at=now() WHERE id=v_car.id;
    INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status)
    VALUES (v_car.id,v_payment.user_id,v_seller,v_payment.id,'direct','payment_received',v_payment.amount,p_receipt,'ready','pending')
    RETURNING * INTO v_outcome;
    RETURN jsonb_build_object('payment_id',v_payment.id,'outcome_id',v_outcome.id,'settlement_mode','direct','funded',false,'idempotent',false);
  END IF;

  BEGIN
    SELECT COALESCE(dealer_commission,5)/100.0 INTO v_rate FROM platform_config LIMIT 1;
  EXCEPTION WHEN undefined_column THEN v_rate:=0.05;
  END;
  v_commission:=ROUND(v_payment.amount*v_rate);
  v_seller_amount:=v_payment.amount-v_commission;

  SELECT * INTO v_escrow FROM escrows WHERE payment=v_payment.id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO escrows (car,buyer,seller,payment,amount,commission,"sellerAmount",status,"fundedAt","autoReleaseEligibleAt",timeline,history)
    VALUES (v_car.id,v_payment.user_id,v_seller,v_payment.id,v_payment.amount,v_commission,v_seller_amount,'funded',now(),now()+interval '3 days',
      jsonb_build_object('depositReceived',true,'depositReceivedAt',now()),
      jsonb_build_array(jsonb_build_object('action','Escrow created and funded','at',now())))
    RETURNING * INTO v_escrow;
  END IF;

  INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,escrow_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status)
  VALUES (v_car.id,v_payment.user_id,v_seller,v_payment.id,v_escrow.id,'escrow','payment_received',v_payment.amount,p_receipt,'ready','pending')
  RETURNING * INTO v_outcome;

  RETURN jsonb_build_object('payment_id',v_payment.id,'escrow_id',v_escrow.id,'outcome_id',v_outcome.id,'funded',true,'settlement_mode','escrow','commission',v_commission,'seller_amount',v_seller_amount,'idempotent',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.kayad_transition_purchase_outcome_atomic(
  p_outcome_id UUID,
  p_next_status TEXT,
  p_collection_status TEXT DEFAULT NULL,
  p_transfer_status TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_ownership_vehicle_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v purchase_outcomes%ROWTYPE; v_allowed BOOLEAN := false;
BEGIN
  SELECT * INTO v FROM purchase_outcomes WHERE id=p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase outcome not found'; END IF;
  v_allowed := CASE
    WHEN v.status='payment_received' AND p_next_status IN ('ready_for_collection','collected','disputed','failed') THEN true
    WHEN v.status='ready_for_collection' AND p_next_status IN ('collected','disputed','failed') THEN true
    WHEN v.status='collected' AND p_next_status IN ('transfer_pending','disputed','failed') THEN true
    WHEN v.status='transfer_pending' AND p_next_status IN ('completed','disputed','failed') THEN true
    WHEN v.status='completed' AND p_next_status='completed' THEN true
    WHEN v.status='refund_pending' AND p_next_status IN ('refunded','failed') THEN true
    WHEN v.status='refunded' AND p_next_status='refunded' THEN true
    WHEN v.status='disputed' AND p_next_status IN ('ready_for_collection','collected','refunded','failed') THEN true
    ELSE false END;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Invalid purchase outcome transition % -> %', v.status, p_next_status; END IF;

  UPDATE purchase_outcomes SET
    status=p_next_status,
    collection_status=COALESCE(p_collection_status,collection_status),
    transfer_status=COALESCE(p_transfer_status,transfer_status),
    collection_reference=CASE WHEN p_collection_status='collected' THEN COALESCE(p_reference,collection_reference) ELSE collection_reference END,
    transfer_reference=CASE WHEN p_transfer_status='completed' OR p_next_status='completed' THEN COALESCE(p_reference,transfer_reference) ELSE transfer_reference END,
    ownership_vehicle_id=COALESCE(p_ownership_vehicle_id,ownership_vehicle_id),
    failure_reason=COALESCE(p_reason,failure_reason),
    collected_at=CASE WHEN p_collection_status='collected' AND collected_at IS NULL THEN now() ELSE collected_at END,
    transferred_at=CASE WHEN p_transfer_status='completed' AND transferred_at IS NULL THEN now() ELSE transferred_at END,
    completed_at=CASE WHEN p_next_status='completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
    updated_at=now()
  WHERE id=v.id;
  RETURN to_jsonb((SELECT x FROM purchase_outcomes x WHERE x.id=v.id));
END;
$$;

GRANT EXECUTE ON FUNCTION public.kayad_settle_purchase_payment_atomic(UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.kayad_transition_purchase_outcome_atomic(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,UUID) TO service_role;
