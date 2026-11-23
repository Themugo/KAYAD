CREATE OR REPLACE FUNCTION public.kayad_generate_inspection_settlement_atomic(p_provider_id uuid, p_period_start date, p_period_end date, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$

