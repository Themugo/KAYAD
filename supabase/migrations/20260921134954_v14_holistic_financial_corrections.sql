-- V14 holistic financial corrections.
-- Final migration wins over earlier compatibility definitions.

INSERT INTO public.ledger_accounts (code, name, type, category, description)
VALUES ('5100', 'Inspection Provider Payable', 'liability', 'inspection', 'Amounts owed to inspection providers')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(
  p_settlement_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s public.inspection_settlements%ROWTYPE;
  missing INTEGER;
  cnt INTEGER;
BEGIN
  IF NULLIF(trim(COALESCE(p_payment_reference,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Settlement payment reference is required';
  END IF;
  SELECT * INTO s FROM public.inspection_settlements WHERE id=p_settlement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found'; END IF;
  IF s.status='paid' THEN
    IF s.payment_reference=p_payment_reference THEN
      RETURN jsonb_build_object('settlementId',s.id,'status','paid','idempotent',true,'paidAt',s.paid_at);
    END IF;
    RAISE EXCEPTION 'Settlement already paid with a different payment reference';
  END IF;
  IF s.status<>'pending' THEN RAISE EXCEPTION 'Settlement cannot be paid from %',s.status; END IF;

  SELECT COUNT(*) INTO cnt
  FROM public.inspection_transactions
  WHERE settlement_id=s.id AND transaction_type='inspection_payment';
  IF cnt=0 THEN RAISE EXCEPTION 'Settlement has no linked inspection payments'; END IF;

  SELECT COUNT(*) INTO missing
  FROM public.inspection_transactions t
  LEFT JOIN public.inspection_bookings b ON b.id=t.booking_id
  LEFT JOIN public.inspection_reports r ON r.booking_id=t.booking_id
  WHERE t.settlement_id=s.id
    AND t.transaction_type='inspection_payment'
    AND (b.id IS NULL OR b.status<>'closed' OR b.payment_status<>'fully_paid' OR r.id IS NULL);
  IF missing>0 THEN
    RAISE EXCEPTION 'Settlement contains % inspection(s) that are not closed and reported',missing;
  END IF;

  PERFORM public.kayad_post_ledger_entry_atomic(
    'inspection-payout:'||s.id::TEXT,
    p_user_id,
    s.net_amount,
    COALESCE(s.currency,'KES'),
    'inspection_payout',
    'inspection_provider',
    'Inspection provider payout',
    jsonb_build_object('settlement_id',s.id,'provider_id',s.provider_id),
    '5100','1000'
  );

  UPDATE public.inspection_settlements
  SET status='paid', payment_method=p_payment_method, payment_reference=p_payment_reference,
      paid_at=now(), processed_at=now()
  WHERE id=s.id;

  UPDATE public.inspection_transactions SET status='completed' WHERE settlement_id=s.id;

  INSERT INTO public.inspection_transactions(
    provider_id,settlement_id,transaction_type,amount,currency,status,description,reference,created_at
  ) VALUES (
    s.provider_id,s.id,'payout',s.net_amount,COALESCE(s.currency,'KES'),'completed',
    'Inspection provider payout',p_payment_reference,now()
  );

  RETURN jsonb_build_object('settlementId',s.id,'status','paid','idempotent',false,'paidAt',now());
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) TO service_role;
