CREATE OR REPLACE FUNCTION public.kayad_mark_dealer_payout_atomic(p_payout uuid, p_status text, p_conversation_id text DEFAULT NULL::text, p_transaction_id text DEFAULT NULL::text, p_failure_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v dealer_payouts%rowtype;
  v_updated dealer_payouts%rowtype;
  v_ledger jsonb;
begin
  select * into v from dealer_payouts where id = p_payout for update;
  if not found then raise exception 'Payout not found'; end if;
  if p_status not in ('processing','paid','failed','cancelled') then raise exception 'Invalid payout status'; end if;

  if v.status = 'paid' then
    if p_status = 'paid' then
      return jsonb_build_object('payout',to_jsonb(v),'idempotent',true);
    end if;
    raise exception 'Paid payout cannot transition to %', p_status;
  end if;
  if p_status = 'paid' and v.status <> 'processing' then
    raise exception 'Only processing payouts can be marked paid';
  end if;
  if p_status = 'processing' and v.status not in ('pending','processing') then
    raise exception 'Only pending payouts can enter processing';
  end if;
  if p_status in ('failed','cancelled') and v.status not in ('pending','processing') then
    raise exception 'Only pending or processing payouts can be closed';
  end if;

  update dealer_payouts set
    status = p_status,
    conversation_id = coalesce(p_conversation_id, conversation_id),
    transaction_id = coalesce(p_transaction_id, transaction_id),
    failure_reason = case when p_status='failed' then coalesce(p_failure_reason, failure_reason) else failure_reason end,
    initiated_at = case when p_status='processing' then coalesce(initiated_at,now()) else initiated_at end,
    completed_at = case when p_status in ('paid','failed','cancelled') then coalesce(completed_at,now()) else completed_at end,
    updated_at = now()
  where id = p_payout
  returning * into v_updated;

  if p_status = 'paid' then
    select public.kayad_post_ledger_entry_atomic(
      'dealer-payout:' || v_updated.id::text,
      v_updated.dealer,
      v_updated.net_amount,
      v_updated.currency,
      'dealer_payout',
      'dealer',
      'Dealer payout settled for escrow ' || v_updated.escrow::text,
      jsonb_build_object('dealer_payout_id',v_updated.id,'escrow_id',v_updated.escrow,'provider',v_updated.provider,'transaction_id',v_updated.transaction_id),
      '5000','1000'
    ) into v_ledger;
  end if;

  return jsonb_build_object('payout',to_jsonb(v_updated),'idempotent',false,'ledger',coalesce(v_ledger,'null'::jsonb));
end;
$function$

