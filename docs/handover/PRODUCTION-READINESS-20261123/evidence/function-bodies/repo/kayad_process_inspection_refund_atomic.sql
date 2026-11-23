CREATE OR REPLACE FUNCTION public.kayad_process_inspection_refund_atomic(p_booking_id uuid, p_amount numeric, p_reason text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking inspection_bookings%ROWTYPE;
  v_provider inspection_providers%ROWTYPE;
  v_refund inspection_refunds%ROWTYPE;
  v_refunded NUMERIC;
  v_rate NUMERIC;
  v_provider_amount NUMERIC;
  v_commission_amount NUMERIC;
  v_status TEXT;
BEGIN
  SELECT * INTO v_booking FROM inspection_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.payment_status NOT IN ('fully_paid','deposit_paid') THEN RAISE EXCEPTION 'Booking has no settled payment to refund'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Refund amount must be greater than zero'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM inspection_refunds WHERE booking_id=p_booking_id AND status IN ('pending','approved','processing','completed');
  IF v_refunded + p_amount > v_booking.total_price THEN RAISE EXCEPTION 'Refund amount exceeds remaining refundable balance'; END IF;
  SELECT * INTO v_provider FROM inspection_providers WHERE id=v_booking.provider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection provider not found'; END IF;
  v_rate := COALESCE(v_provider.commission_rate,15);
  v_provider_amount := ROUND(p_amount * (1-v_rate/100),2);
  v_commission_amount := ROUND(p_amount-v_provider_amount,2);
  INSERT INTO inspection_refunds(booking_id,requested_by,approved_by,amount,currency,reason,status,requested_at,approved_at,created_at,updated_at,ledger_reference)
  VALUES(p_booking_id,p_user_id,p_user_id,p_amount,COALESCE(v_booking.currency,'KES'),COALESCE(p_reason,'Inspection refund'),'approved',now(),now(),now(),now(),'INS-REF-'||gen_random_uuid()::TEXT)
  RETURNING * INTO v_refund;
  IF v_provider_amount > 0 THEN PERFORM kayad_post_ledger_entry_atomic(v_refund.ledger_reference||':provider',p_user_id,v_provider_amount,COALESCE(v_booking.currency,'KES'),'inspection_refund','customer','Inspection provider refund',jsonb_build_object('refund_id',v_refund.id,'booking_id',p_booking_id),'5100','1200'); END IF;
  IF v_commission_amount > 0 THEN PERFORM kayad_post_ledger_entry_atomic(v_refund.ledger_reference||':commission',p_user_id,v_commission_amount,COALESCE(v_booking.currency,'KES'),'inspection_commission_refund','customer','Inspection commission refund',jsonb_build_object('refund_id',v_refund.id,'booking_id',p_booking_id),'4000','1200'); END IF;
  v_status := CASE WHEN v_refunded + p_amount >= v_booking.total_price THEN 'refunded' ELSE 'partial_refund' END;
  UPDATE inspection_refunds SET status='completed',processed_at=now(),updated_at=now() WHERE id=v_refund.id;
  UPDATE inspection_bookings SET payment_status=v_status,updated_at=now() WHERE id=p_booking_id;
  INSERT INTO inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,refund_id,description,reference,created_at)
  VALUES(v_booking.provider_id,p_booking_id,'refund',-p_amount,COALESCE(v_booking.currency,'KES'),'completed',v_refund.id,v_refund.reason,v_refund.ledger_reference,now());
  RETURN jsonb_build_object('bookingId',p_booking_id,'refundId',v_refund.id,'refundAmount',p_amount,'commissionRefunded',v_commission_amount,'status','completed');
END;
$function$

