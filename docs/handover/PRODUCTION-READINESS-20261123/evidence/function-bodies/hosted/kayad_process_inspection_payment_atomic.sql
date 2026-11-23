CREATE OR REPLACE FUNCTION public.kayad_process_inspection_payment_atomic(p_booking_id uuid, p_payment_method text, p_payment_reference text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare b public.inspection_bookings%rowtype; p public.inspection_providers%rowtype; e public.inspection_transactions%rowtype;
gross numeric; rate numeric; commission numeric; provider_amount numeric;
begin
 if nullif(trim(coalesce(p_payment_reference,'')),'') is null then raise exception 'Payment reference is required'; end if;
 select * into b from public.inspection_bookings where id=p_booking_id for update;
 if not found then raise exception 'Booking not found'; end if;
 if b.payment_status='fully_paid' then
   if b.payment_reference=p_payment_reference then return jsonb_build_object('bookingId',b.id,'paymentStatus','fully_paid','idempotent',true); end if;
   raise exception 'Booking already paid with a different payment reference';
 end if;
 select * into e from public.inspection_transactions where transaction_type='inspection_payment' and reference=p_payment_reference limit 1 for update;
 if found then raise exception 'Payment reference already belongs to another transaction'; end if;
 select * into p from public.inspection_providers where id=b.provider_id for update;
 if not found or p.verification_status<>'verified' or p.lifecycle_stage not in ('VERIFIED','ACTIVE') then raise exception 'Inspection provider is not verified/active'; end if;
 gross:=greatest(round(coalesce(b.total_price,0)::numeric,2),2500);
 rate:=greatest(coalesce(p.commission_rate,0),0);
 commission:=round(gross*rate/100,2);
 provider_amount:=round(gross-commission,2);
 if p.settlement_mode='platform_collect' then
   perform public.kayad_post_ledger_entry_atomic(p_payment_reference||':provider',p_user_id,provider_amount,coalesce(b.currency,'KES'),'inspection_payment','inspection_provider','Inspection provider payable',jsonb_build_object('booking_id',b.id,'event','inspection_payment_provider'),'1000','5100');
   if commission>0 then perform public.kayad_post_ledger_entry_atomic(p_payment_reference||':commission',p_user_id,commission,coalesce(b.currency,'KES'),'inspection_commission','platform','Inspection commission',jsonb_build_object('booking_id',b.id,'event','inspection_commission'),'1000','4000'); end if;
 else
   insert into public.financial_workflow_events(workflow,aggregate_id,event_key,event_type,amount,currency,ledger_reference,metadata,created_at)
   values('inspection',b.id,p_payment_reference||':direct_provider','inspection_direct_provider_payment',gross,coalesce(b.currency,'KES'),p_payment_reference,
          jsonb_build_object('providerId',p.id,'grossAmount',gross,'commissionAmount',commission,'providerAmount',provider_amount,'settlementMode',p.settlement_mode),now());
 end if;
 update public.inspection_bookings set payment_status='fully_paid',payment_method=p_payment_method,payment_reference=p_payment_reference,paid_at=now(),total_price=gross,updated_at=now() where id=b.id;
 insert into public.inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,description,reference,created_at)
 values(p.id,b.id,'inspection_payment',gross,coalesce(b.currency,'KES'),'completed',case when p.settlement_mode='direct_provider' then 'Direct provider inspection payment recorded' else 'Inspection payment' end,p_payment_reference,now());
 insert into public.inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,description,reference,created_at)
 values(p.id,b.id,'commission',-commission,coalesce(b.currency,'KES'),'completed','KAYAD inspection commission','COMM-'||b.booking_reference,now());
 return jsonb_build_object('bookingId',b.id,'grossAmount',gross,'commissionAmount',commission,'netAmount',provider_amount,'paymentStatus','fully_paid','settlementMode',p.settlement_mode,'idempotent',false);
end; $function$

