CREATE OR REPLACE FUNCTION public.kayad_process_inspection_refund_atomic(p_booking_id uuid, p_amount numeric, p_reason text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_booking public.inspection_bookings%rowtype; v_provider public.inspection_providers%rowtype; v_refund public.inspection_refunds%rowtype;
v_refunded numeric; v_rate numeric; v_provider_amount numeric; v_commission_amount numeric; v_status text;
begin
 select * into v_booking from public.inspection_bookings where id=p_booking_id for update;
 if not found then raise exception 'Booking not found'; end if;
 if v_booking.payment_status not in ('fully_paid','deposit_paid','partial_refund') then raise exception 'Booking has no settled payment to refund'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Refund amount must be greater than zero'; end if;
 select coalesce(sum(amount),0) into v_refunded from public.inspection_refunds where booking_id=p_booking_id and status in ('pending','approved','processing','completed');
 if v_refunded+p_amount>v_booking.total_price then raise exception 'Refund amount exceeds remaining refundable balance'; end if;
 select * into v_provider from public.inspection_providers where id=v_booking.provider_id for update;
 if not found then raise exception 'Inspection provider not found'; end if;
 v_rate:=greatest(coalesce(v_provider.commission_rate,15),0);
 v_provider_amount:=round(p_amount*(1-v_rate/100),2);
 v_commission_amount:=round(p_amount-v_provider_amount,2);
 insert into public.inspection_refunds(booking_id,requested_by,approved_by,amount,currency,reason,status,requested_at,approved_at,created_at,updated_at,ledger_reference)
 values(p_booking_id,p_user_id,p_user_id,p_amount,coalesce(v_booking.currency,'KES'),coalesce(p_reason,'Inspection refund'),'approved',now(),now(),now(),now(),'INS-REF-'||gen_random_uuid()::text)
 returning * into v_refund;
 if v_provider_amount>0 then
   perform public.kayad_post_ledger_entry_atomic(v_refund.ledger_reference||':provider',p_user_id,v_provider_amount,coalesce(v_booking.currency,'KES'),'inspection_refund','customer','Inspection provider refund',jsonb_build_object('refund_id',v_refund.id,'booking_id',p_booking_id),'5100','1000');
 end if;
 if v_commission_amount>0 then
   perform public.kayad_post_ledger_entry_atomic(v_refund.ledger_reference||':commission',p_user_id,v_commission_amount,coalesce(v_booking.currency,'KES'),'inspection_commission_refund','customer','Inspection commission refund',jsonb_build_object('refund_id',v_refund.id,'booking_id',p_booking_id),'4000','1000');
 end if;
 v_status:=case when v_refunded+p_amount>=v_booking.total_price then 'refunded' else 'partial_refund' end;
 update public.inspection_refunds set status='completed',processed_at=now(),updated_at=now() where id=v_refund.id;
 update public.inspection_bookings set payment_status=v_status,updated_at=now() where id=p_booking_id;
 insert into public.inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,refund_id,description,reference,created_at)
 values(v_booking.provider_id,p_booking_id,'refund',-p_amount,coalesce(v_booking.currency,'KES'),'completed',v_refund.id,v_refund.reason,v_refund.ledger_reference,now());
 return jsonb_build_object('bookingId',p_booking_id,'refundId',v_refund.id,'refundAmount',p_amount,'commissionRefunded',v_commission_amount,'providerAmountReversed',v_provider_amount,'status','completed');
end; $function$

