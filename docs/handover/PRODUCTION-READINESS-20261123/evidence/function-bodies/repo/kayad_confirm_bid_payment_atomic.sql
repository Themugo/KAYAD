CREATE OR REPLACE FUNCTION public.kayad_confirm_bid_payment_atomic(p_checkout_request_id text, p_receipt text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment payments%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_payment
  FROM payments
  WHERE checkout_request_id = p_checkout_request_id AND type = 'bid'
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    SELECT kayad_settle_bid_payment_atomic(v_payment.id, p_receipt) INTO v_result;
    RETURN v_result || jsonb_build_object('already_paid', COALESCE((v_result->>'confirmation_fee') IS NOT NULL, false));
  END IF;

  -- Compatibility for legacy foundations that used the bids table directly.
  RETURN jsonb_build_object('bid_id', NULL, 'applied_to_market', false, 'legacy_payment_missing', true);
END;
$function$

