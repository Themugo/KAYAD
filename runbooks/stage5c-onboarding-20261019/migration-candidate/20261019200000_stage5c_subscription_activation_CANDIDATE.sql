-- STAGE 5C CANDIDATE — NOT APPLIED to any shared/hosted database. Rehearsed on disposable PG only.
-- Defect: ON CONFLICT (payment_id) cannot infer the PARTIAL unique index dealer_subscriptions_payment_uq (WHERE payment_id IS NOT NULL);
-- PostgreSQL raises 'no unique or exclusion constraint matching the ON CONFLICT specification', so every paid-subscription activation fails.
-- Fix: add the matching index predicate. Data impact: none (function body only). Rollback: 20261019200000_stage5c_subscription_activation_ROLLBACK_CANDIDATE.sql
CREATE OR REPLACE FUNCTION public.kayad_activate_dealer_subscription_atomic(p_payment_id uuid, p_dealer uuid, p_plan_id text, p_plan_name text, p_amount numeric, p_currency text, p_listing_max integer, p_features jsonb, p_duration_days integer, p_snapshot_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expires timestamptz;
  v_sub dealer_subscriptions%ROWTYPE;
BEGIN
  IF p_payment_id IS NULL OR p_dealer IS NULL OR p_plan_id IS NULL THEN RAISE EXCEPTION 'Missing subscription activation identity'; END IF;
  IF p_amount < 0 OR p_listing_max < 0 OR p_duration_days < 1 THEN RAISE EXCEPTION 'Invalid subscription activation values'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));
  v_expires := now() + make_interval(days => p_duration_days);

  -- A dealer can have only one current entitlement. Switching plans is an
  -- immediate commercial change, so retire the previous active entitlement
  -- before creating the new one. Historical rows remain auditable.
  UPDATE dealer_subscriptions
  SET status = 'cancelled', updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('supersededByPaymentId', p_payment_id)
  WHERE dealer = p_dealer
    AND status = 'active';

  INSERT INTO dealer_subscriptions(dealer,payment_id,plan_id,plan_name,amount,currency,listing_max,features,starts_at,expires_at,status,metadata)
  VALUES(p_dealer,p_payment_id,p_plan_id,p_plan_name,p_amount,COALESCE(NULLIF(p_currency,''),'KES'),p_listing_max,COALESCE(p_features,'[]'::jsonb),now(),v_expires,'active',jsonb_build_object('planSnapshotHash',p_snapshot_hash))
  ON CONFLICT (payment_id) WHERE payment_id IS NOT NULL DO UPDATE SET updated_at=now()
  RETURNING * INTO v_sub;

  UPDATE users SET dealer_package=p_plan_id, package_listing_max=p_listing_max, package_expires_at=v_expires,
    package_auto_renew=false, subscription_status='active', package_features=COALESCE(p_features,'[]'::jsonb), updated_at=now()
  WHERE id=p_dealer;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dealer not found'; END IF;

  RETURN jsonb_build_object('id',v_sub.id,'dealer',v_sub.dealer,'planId',v_sub.plan_id,'expiresAt',v_sub.expires_at,'status',v_sub.status);
END; $function$;
