-- KAYAD inspection payment/cancellation race guard.
-- A verified M-Pesa callback must not settle a booking that was cancelled
-- while the payment callback was still in flight. This is source-only until
-- migration history is reconciled and the owner explicitly authorizes rollout.

CREATE OR REPLACE FUNCTION public.kayad_process_inspection_payment_atomic(
  p_booking_id uuid,
  p_payment_method text,
  p_payment_reference text,
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  b public.inspection_bookings%ROWTYPE;
  p public.inspection_providers%ROWTYPE;
  e public.inspection_transactions%ROWTYPE;
  gross numeric;
  rate numeric;
  commission numeric;
  provider_amount numeric;
BEGIN
  IF nullif(trim(coalesce(p_payment_reference, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payment reference is required';
  END IF;

  SELECT * INTO b
  FROM public.inspection_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF b.status IN ('cancelled', 'closed', 'no_show') THEN
    RAISE EXCEPTION 'Inspection booking is no longer payable';
  END IF;

  IF b.payment_status = 'fully_paid' THEN
    IF b.payment_reference = p_payment_reference THEN
      RETURN jsonb_build_object(
        'bookingId', b.id,
        'paymentStatus', 'fully_paid',
        'idempotent', true
      );
    END IF;
    RAISE EXCEPTION 'Booking already paid with a different payment reference';
  END IF;

  SELECT * INTO e
  FROM public.inspection_transactions
  WHERE transaction_type = 'inspection_payment'
    AND reference = p_payment_reference
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Payment reference already belongs to another transaction';
  END IF;

  SELECT * INTO p
  FROM public.inspection_providers
  WHERE id = b.provider_id
  FOR UPDATE;

  IF NOT FOUND OR p.verification_status <> 'verified'
     OR p.lifecycle_stage NOT IN ('VERIFIED', 'ACTIVE') THEN
    RAISE EXCEPTION 'Inspection provider is not verified/active';
  END IF;

  gross := greatest(round(coalesce(b.total_price, 0)::numeric, 2), 2500);
  rate := greatest(coalesce(p.commission_rate, 0), 0);
  commission := round(gross * rate / 100, 2);
  provider_amount := round(gross - commission, 2);

  IF p.settlement_mode = 'platform_collect' THEN
    PERFORM public.kayad_post_ledger_entry_atomic(
      p_payment_reference || ':provider', p_user_id, provider_amount,
      coalesce(b.currency, 'KES'), 'inspection_payment', 'inspection_provider',
      'Inspection provider payable',
      jsonb_build_object('booking_id', b.id, 'event', 'inspection_payment_provider'),
      '1000', '5100'
    );
    IF commission > 0 THEN
      PERFORM public.kayad_post_ledger_entry_atomic(
        p_payment_reference || ':commission', p_user_id, commission,
        coalesce(b.currency, 'KES'), 'inspection_commission', 'platform',
        'Inspection commission',
        jsonb_build_object('booking_id', b.id, 'event', 'inspection_commission'),
        '1000', '4000'
      );
    END IF;
  ELSE
    INSERT INTO public.financial_workflow_events(
      workflow, aggregate_id, event_key, event_type, amount, currency,
      ledger_reference, metadata, created_at
    ) VALUES (
      'inspection', b.id, p_payment_reference || ':direct_provider',
      'inspection_direct_provider_payment', gross, coalesce(b.currency, 'KES'),
      p_payment_reference,
      jsonb_build_object(
        'providerId', p.id, 'grossAmount', gross,
        'commissionAmount', commission, 'providerAmount', provider_amount,
        'settlementMode', p.settlement_mode
      ), now()
    );
  END IF;

  UPDATE public.inspection_bookings
  SET payment_status = 'fully_paid', payment_method = p_payment_method,
      payment_reference = p_payment_reference, paid_at = now(),
      total_price = gross, updated_at = now()
  WHERE id = b.id;

  INSERT INTO public.inspection_transactions(
    provider_id, booking_id, transaction_type, amount, currency, status,
    description, reference, created_at
  ) VALUES (
    p.id, b.id, 'inspection_payment', gross, coalesce(b.currency, 'KES'),
    'completed',
    CASE WHEN p.settlement_mode = 'direct_provider'
      THEN 'Direct provider inspection payment recorded'
      ELSE 'Inspection payment' END,
    p_payment_reference, now()
  );

  INSERT INTO public.inspection_transactions(
    provider_id, booking_id, transaction_type, amount, currency, status,
    description, reference, created_at
  ) VALUES (
    p.id, b.id, 'commission', -commission, coalesce(b.currency, 'KES'),
    'completed', 'KAYAD inspection commission',
    'COMM-' || b.booking_reference, now()
  );

  RETURN jsonb_build_object(
    'bookingId', b.id, 'grossAmount', gross,
    'commissionAmount', commission, 'netAmount', provider_amount,
    'paymentStatus', 'fully_paid', 'settlementMode', p.settlement_mode,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.kayad_process_inspection_payment_atomic(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_process_inspection_payment_atomic(uuid, text, text, uuid) TO service_role;
