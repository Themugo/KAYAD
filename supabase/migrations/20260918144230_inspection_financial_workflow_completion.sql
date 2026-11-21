-- KAYAD Inspection Financial Workflow Completion
--
-- Makes inspection payment, settlement generation and settlement payout use
-- the canonical ledger as the source of truth. Operational inspection
-- transactions remain an audit/projection layer and are linked to settlements.

BEGIN;

-- Payment references must be unique for completed inspection payments so a
-- provider callback cannot create a second financial posting.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_payment_reference_unique
  ON public.inspection_transactions(reference)
  WHERE transaction_type = 'inspection_payment'
    AND reference IS NOT NULL;

-- -------------------------------------------------------------------------
-- Inspection payment: idempotent + atomic + server-derived amount.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_process_inspection_payment_atomic(
  p_booking_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.inspection_bookings%ROWTYPE;
  v_provider public.inspection_providers%ROWTYPE;
  v_existing public.inspection_transactions%ROWTYPE;
  v_gross NUMERIC;
  v_rate NUMERIC;
  v_commission NUMERIC;
  v_provider_amount NUMERIC;
BEGIN
  IF p_booking_id IS NULL THEN RAISE EXCEPTION 'Booking id is required'; END IF;
  IF NULLIF(trim(COALESCE(p_payment_reference,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Payment reference is required';
  END IF;

  SELECT * INTO v_booking
  FROM public.inspection_bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  IF v_booking.payment_status = 'fully_paid' THEN
    IF v_booking.payment_reference = p_payment_reference THEN
      RETURN jsonb_build_object(
        'bookingId', p_booking_id,
        'grossAmount', ROUND(v_booking.total_price::NUMERIC,2),
        'paymentStatus', 'fully_paid',
        'idempotent', true
      );
    END IF;

    SELECT * INTO v_existing
    FROM public.inspection_transactions
    WHERE booking_id = p_booking_id
      AND transaction_type = 'inspection_payment'
      AND reference = p_payment_reference
      AND status = 'completed'
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'bookingId', p_booking_id,
        'grossAmount', ROUND(v_booking.total_price::NUMERIC,2),
        'paymentStatus', 'fully_paid',
        'idempotent', true
      );
    END IF;

    RAISE EXCEPTION 'Booking already paid with a different payment reference';
  END IF;

  SELECT * INTO v_existing
  FROM public.inspection_transactions
  WHERE transaction_type = 'inspection_payment'
    AND reference = p_payment_reference
  LIMIT 1
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.booking_id = p_booking_id AND v_existing.status = 'completed' THEN
      RETURN jsonb_build_object(
        'bookingId', p_booking_id,
        'grossAmount', v_existing.amount,
        'paymentStatus', 'fully_paid',
        'idempotent', true
      );
    END IF;
    RAISE EXCEPTION 'Payment reference already belongs to another transaction';
  END IF;

  SELECT * INTO v_provider
  FROM public.inspection_providers
  WHERE id = v_booking.provider_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection provider not found'; END IF;

  v_gross := ROUND(v_booking.total_price::NUMERIC, 2);
  v_rate := COALESCE(v_provider.commission_rate, 15);
  v_commission := ROUND(v_gross * v_rate / 100, 2);
  v_provider_amount := ROUND(v_gross - v_commission, 2);

  IF v_gross <= 0 OR v_commission < 0 OR v_provider_amount < 0 THEN
    RAISE EXCEPTION 'Invalid inspection payment allocation';
  END IF;

  PERFORM public.kayad_post_ledger_entry_atomic(
    p_payment_reference || ':provider', p_user_id, v_provider_amount,
    COALESCE(v_booking.currency,'KES'), 'inspection_payment',
    'inspection_provider', 'Inspection provider payable',
    jsonb_build_object('booking_id',p_booking_id,'event','inspection_payment_provider'),
    '1000', '5100'
  );

  IF v_commission > 0 THEN
    PERFORM public.kayad_post_ledger_entry_atomic(
      p_payment_reference || ':commission', p_user_id, v_commission,
      COALESCE(v_booking.currency,'KES'), 'inspection_commission',
      'platform', 'Inspection commission',
      jsonb_build_object('booking_id',p_booking_id,'event','inspection_commission'),
      '1000', '4000'
    );
  END IF;

  UPDATE public.inspection_bookings
  SET payment_status='fully_paid',
      payment_method=p_payment_method,
      payment_reference=p_payment_reference,
      paid_at=now(),
      updated_at=now()
  WHERE id=p_booking_id;

  INSERT INTO public.inspection_transactions(
    provider_id, booking_id, transaction_type, amount, currency, status,
    description, reference, created_at
  ) VALUES (
    v_booking.provider_id, p_booking_id, 'inspection_payment', v_gross,
    COALESCE(v_booking.currency,'KES'), 'completed', 'Inspection payment',
    p_payment_reference, now()
  );

  INSERT INTO public.inspection_transactions(
    provider_id, booking_id, transaction_type, amount, currency, status,
    description, reference, created_at
  ) VALUES (
    v_booking.provider_id, p_booking_id, 'commission', -v_commission,
    COALESCE(v_booking.currency,'KES'), 'completed', 'KAYAD inspection commission',
    'COMM-' || v_booking.booking_reference, now()
  );

  RETURN jsonb_build_object(
    'bookingId',p_booking_id,
    'grossAmount',v_gross,
    'commissionAmount',v_commission,
    'commissionRate',v_rate,
    'taxAmount',0,
    'netAmount',v_provider_amount,
    'paymentStatus','fully_paid',
    'idempotent',false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_process_inspection_payment_atomic(UUID,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_process_inspection_payment_atomic(UUID,TEXT,TEXT,UUID) TO service_role;

-- -------------------------------------------------------------------------
-- Settlement generation: only closed inspections with reports are eligible,
-- and the provider lock + unique period constraint make the operation
-- idempotent under concurrent retries.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_generate_inspection_settlement_atomic(
  p_provider_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider public.inspection_providers%ROWTYPE;
  v_existing public.inspection_settlements%ROWTYPE;
  v_settlement_id UUID;
  v_reference TEXT;
  v_rate NUMERIC;
  v_gross NUMERIC;
  v_commission NUMERIC;
  v_net NUMERIC;
  v_count INTEGER;
  v_booking_ids UUID[];
  v_breakdown JSONB;
BEGIN
  IF p_provider_id IS NULL OR p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'Provider and settlement period are required';
  END IF;
  IF p_period_end < p_period_start THEN RAISE EXCEPTION 'Invalid settlement period'; END IF;

  SELECT * INTO v_provider FROM public.inspection_providers WHERE id=p_provider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider not found'; END IF;

  SELECT * INTO v_existing
  FROM public.inspection_settlements
  WHERE provider_id=p_provider_id
    AND period_start=p_period_start
    AND period_end=p_period_end
    AND status IN ('pending','processing','paid')
  LIMIT 1
  FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('settlement',to_jsonb(v_existing),'idempotent',true);
  END IF;

  SELECT
    COALESCE(SUM(b.total_price),0),
    COUNT(*)::INTEGER,
    ARRAY_AGG(b.id ORDER BY b.paid_at),
    jsonb_agg(jsonb_build_object(
      'bookingId',b.id,
      'reference',b.booking_reference,
      'amount',ROUND(b.total_price::NUMERIC,2),
      'paidAt',b.paid_at
    ) ORDER BY b.paid_at)
  INTO v_gross, v_count, v_booking_ids, v_breakdown
  FROM public.inspection_bookings b
  WHERE b.provider_id=p_provider_id
    AND b.status='closed'
    AND b.payment_status='fully_paid'
    AND b.paid_at >= p_period_start::TIMESTAMPTZ
    AND b.paid_at < (p_period_end + 1)::TIMESTAMPTZ
    AND EXISTS (SELECT 1 FROM public.inspection_reports r WHERE r.booking_id=b.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.inspection_transactions t
      WHERE t.booking_id=b.id
        AND t.transaction_type='inspection_payment'
        AND t.settlement_id IS NOT NULL
    );

  IF v_count = 0 THEN RAISE EXCEPTION 'No eligible closed paid inspections in this period'; END IF;

  v_rate := COALESCE(v_provider.commission_rate,15);
  v_commission := ROUND(v_gross * v_rate / 100,2);
  v_net := ROUND(v_gross - v_commission,2);
  v_reference := 'KAYAD-SET-' || to_char(p_period_start,'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::TEXT,'-',''),1,8));

  INSERT INTO public.inspection_settlements(
    provider_id, settlement_reference, period_start, period_end,
    gross_amount, commission_amount, tax_amount, net_amount, currency,
    status, bookings_count, breakdown, created_at
  ) VALUES (
    p_provider_id, v_reference, p_period_start, p_period_end,
    v_gross, v_commission, 0, v_net, 'KES', 'pending', v_count,
    v_breakdown, now()
  ) RETURNING id INTO v_settlement_id;

  UPDATE public.inspection_transactions
  SET settlement_id=v_settlement_id
  WHERE booking_id = ANY(v_booking_ids)
    AND transaction_type IN ('inspection_payment','commission')
    AND settlement_id IS NULL;

  RETURN jsonb_build_object(
    'settlement', (SELECT to_jsonb(s) FROM public.inspection_settlements s WHERE s.id=v_settlement_id),
    'idempotent',false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_generate_inspection_settlement_atomic(UUID,DATE,DATE,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_generate_inspection_settlement_atomic(UUID,DATE,DATE,UUID) TO service_role;

-- -------------------------------------------------------------------------
-- Settlement payout: only settlements containing closed, reported inspections
-- can be paid, and the canonical ledger posting is atomic with status change.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(
  p_settlement_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settlement public.inspection_settlements%ROWTYPE;
  v_missing INTEGER;
  v_count INTEGER;
BEGIN
  IF NULLIF(trim(COALESCE(p_payment_reference,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Settlement payment reference is required';
  END IF;

  SELECT * INTO v_settlement
  FROM public.inspection_settlements
  WHERE id=p_settlement_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found'; END IF;

  IF v_settlement.status='paid' THEN
    IF v_settlement.payment_reference = p_payment_reference THEN
      RETURN jsonb_build_object('settlementId',p_settlement_id,'status','paid','idempotent',true,'paidAt',v_settlement.paid_at);
    END IF;
    RAISE EXCEPTION 'Settlement already paid with a different payment reference';
  END IF;
  IF v_settlement.status <> 'pending' THEN RAISE EXCEPTION 'Settlement cannot be paid from %',v_settlement.status; END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.inspection_transactions
  WHERE settlement_id=p_settlement_id AND transaction_type='inspection_payment';
  IF v_count=0 THEN RAISE EXCEPTION 'Settlement has no linked inspection payments'; END IF;

  SELECT COUNT(*)::INTEGER INTO v_missing
  FROM public.inspection_transactions t
  LEFT JOIN public.inspection_bookings b ON b.id=t.booking_id
  LEFT JOIN public.inspection_reports r ON r.booking_id=t.booking_id
  WHERE t.settlement_id=p_settlement_id
    AND t.transaction_type='inspection_payment'
    AND (b.id IS NULL OR b.status <> 'closed' OR b.payment_status <> 'fully_paid' OR r.id IS NULL);
  IF v_missing > 0 THEN RAISE EXCEPTION 'Settlement contains % inspection(s) that are not closed and reported',v_missing; END IF;

  PERFORM public.kayad_post_ledger_entry_atomic(
    'inspection-payout:'||p_settlement_id::TEXT, p_user_id, v_settlement.net_amount,
    COALESCE(v_settlement.currency,'KES'), 'inspection_payout', 'inspection_provider',
    'Inspection provider payout',
    jsonb_build_object('settlement_id',p_settlement_id,'provider_id',v_settlement.provider_id),
    '5100','1200'
  );

  UPDATE public.inspection_settlements
  SET status='paid', payment_method=p_payment_method,
      payment_reference=p_payment_reference, paid_at=now(), processed_at=now()
  WHERE id=p_settlement_id;

  UPDATE public.inspection_transactions SET status='completed' WHERE settlement_id=p_settlement_id;

  INSERT INTO public.inspection_transactions(
    provider_id, settlement_id, transaction_type, amount, currency, status,
    description, reference, created_at
  ) VALUES (
    v_settlement.provider_id,p_settlement_id,'payout',v_settlement.net_amount,
    COALESCE(v_settlement.currency,'KES'),'completed','Inspection provider payout',
    p_payment_reference,now()
  );

  RETURN jsonb_build_object('settlementId',p_settlement_id,'status','paid','idempotent',false,'paidAt',now());
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) TO service_role;

COMMIT;
