-- KAYAD auction financial and re-award integrity repairs.
-- Additive forward migration; does not rewrite historical ledger entries.
-- Apply through the normal reviewed Supabase migration process.

CREATE OR REPLACE FUNCTION public.kayad_reconcile_auction_security_holds_atomic(
  p_auction_id UUID,
  p_outcome_id UUID,
  p_winner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hold public.auction_security_holds%ROWTYPE;
  v_outcome public.auction_outcomes%ROWTYPE;
  v_policy JSONB := '{}'::jsonb;
  v_setup JSONB := '{}'::jsonb;
  v_credit_enabled BOOLEAN := TRUE;
  v_refund_non_winners BOOLEAN := TRUE;
  v_refund_count INTEGER := 0;
  v_applied_count INTEGER := 0;
  v_retained_count INTEGER := 0;
BEGIN
  SELECT * INTO v_outcome
    FROM public.auction_outcomes
   WHERE id = p_outcome_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;
  IF v_outcome.car_id IS DISTINCT FROM p_auction_id THEN
    RAISE EXCEPTION 'Auction outcome does not belong to auction';
  END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_policy
    FROM public.auction_platform_policies WHERE id = 1;
  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup
    FROM public.auction_setups WHERE car_id = p_auction_id;
  v_credit_enabled :=
    COALESCE((v_policy->>'commitmentCreditTowardWinningPayment')::boolean, TRUE)
    AND COALESCE((v_setup#>>'{commitment,creditTowardWinningPayment}')::boolean, TRUE);
  v_refund_non_winners :=
    COALESCE((v_policy->>'nonWinnerCommitmentRefundRequired')::boolean, TRUE);

  FOR v_hold IN
    SELECT * FROM public.auction_security_holds
     WHERE auction_id = p_auction_id
       AND status = 'held'
       AND applied_outcome_id IS NULL
     ORDER BY created_at, id
     FOR UPDATE
  LOOP
    IF p_winner_user_id IS NOT NULL
       AND v_hold.bidder_id = p_winner_user_id
       AND v_hold.hold_type = 'commitment'
       AND v_credit_enabled
       AND v_hold.amount <= v_outcome.winning_amount THEN
      UPDATE public.auction_security_holds
         SET status = 'applied',
             applied_outcome_id = p_outcome_id,
             applied_amount = amount,
             policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
               || jsonb_build_object('commitmentCreditEnabled', TRUE,
                                     'platformPolicyAtReconciliation', v_policy),
             updated_at = now()
       WHERE id = v_hold.id;

      IF COALESCE(v_hold.custody, 'kayad') <> 'dealer' THEN
        PERFORM public.kayad_post_ledger_entry_atomic(
          'auction-commitment-apply:' || v_hold.id::text,
          v_hold.bidder_id, v_hold.amount, 'KES',
          'auction_commitment_applied',
          CASE WHEN v_outcome.settlement_mode = 'escrow' THEN 'escrow_payable' ELSE 'seller_payable' END,
          'Auction bidder commitment credited toward winning settlement',
          jsonb_build_object('hold_id', v_hold.id, 'outcome_id', p_outcome_id),
          '2100',
          CASE WHEN v_outcome.settlement_mode = 'escrow' THEN '2000' ELSE '5000' END
        );
      END IF;
      v_applied_count := v_applied_count + 1;
    ELSIF p_winner_user_id IS NOT NULL
       AND v_hold.bidder_id = p_winner_user_id
       AND v_hold.hold_type = 'commitment' THEN
      -- Credit disabled: preserve the buyer liability for refund, never post it
      -- to seller/escrow payable.
      UPDATE public.auction_security_holds
         SET status = 'refund_pending', applied_outcome_id = p_outcome_id,
             policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
               || jsonb_build_object('commitmentCreditEnabled', FALSE,
                                     'platformPolicyAtReconciliation', v_policy),
             updated_at = now()
       WHERE id = v_hold.id;
      v_refund_count := v_refund_count + 1;
    ELSIF v_hold.hold_type <> 'commitment' OR v_refund_non_winners THEN
      -- High-value security deposits remain refundable regardless of the
      -- commitment-specific loser-refund policy.
      UPDATE public.auction_security_holds
         SET status = 'refund_pending', applied_outcome_id = p_outcome_id,
             policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
               || jsonb_build_object('nonWinnerRefundRequired', TRUE,
                                     'platformPolicyAtReconciliation', v_policy),
             updated_at = now()
       WHERE id = v_hold.id;
      v_refund_count := v_refund_count + 1;
    ELSE
      -- Policy explicitly does not require automatic loser refunds. Retain
      -- the hold as a liability and mark the outcome it was evaluated against
      -- so retries/re-awards cannot silently allocate it a second time.
      UPDATE public.auction_security_holds
         SET applied_outcome_id = p_outcome_id,
             policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
               || jsonb_build_object('nonWinnerRefundRequired', FALSE,
                                     'platformPolicyAtReconciliation', v_policy),
             updated_at = now()
       WHERE id = v_hold.id;
      v_retained_count := v_retained_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'auction_id', p_auction_id, 'outcome_id', p_outcome_id,
    'applied_count', v_applied_count,
    'refund_pending_count', v_refund_count,
    'retained_liability_count', v_retained_count,
    'commitment_credit_enabled', v_credit_enabled,
    'non_winner_refund_required', v_refund_non_winners
  );
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_reconcile_auction_security_holds_atomic(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_reconcile_auction_security_holds_atomic(UUID, UUID, UUID) TO service_role;

-- Provider confirmation records payment and liability only. Eligibility is
-- granted exclusively by the application finalizer after a fresh user check.
CREATE OR REPLACE FUNCTION public.kayad_settle_auction_security_hold_atomic(
  p_checkout_request_id TEXT,
  p_success BOOLEAN,
  p_receipt TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hold public.auction_security_holds%ROWTYPE;
  v_ledger JSONB;
  v_policy JSONB := '{}'::jsonb;
BEGIN
  SELECT * INTO v_hold
    FROM public.auction_security_holds
   WHERE checkout_request_id = p_checkout_request_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction security hold not found'; END IF;

  IF v_hold.status IN ('held','applied','refund_pending','refunded','forfeited') THEN
    RETURN jsonb_build_object('hold_id', v_hold.id, 'auction_id', v_hold.auction_id,
      'bidder_id', v_hold.bidder_id, 'hold_type', v_hold.hold_type,
      'amount', v_hold.amount, 'status', v_hold.status,
      'already_settled', TRUE, 'receipt', v_hold.mpesa_receipt);
  END IF;

  IF NOT p_success THEN
    UPDATE public.auction_security_holds
       SET status = 'failed', mpesa_receipt = NULL, updated_at = now()
     WHERE id = v_hold.id;
    IF v_hold.registration_id IS NOT NULL AND v_hold.hold_type = 'commitment' THEN
      UPDATE public.auction_registrations
         SET commitment_status = 'failed', status = 'pending_commitment',
             updated_at = now()
       WHERE id = v_hold.registration_id
         AND status NOT IN ('suspended','withdrawn','disqualified','expired');
    END IF;
    RETURN jsonb_build_object('hold_id', v_hold.id, 'status', 'failed', 'already_settled', FALSE);
  END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_policy
    FROM public.auction_platform_policies WHERE id = 1;
  UPDATE public.auction_security_holds
     SET status = 'held', mpesa_receipt = p_receipt,
         ledger_reference = COALESCE(ledger_reference, 'auction-security:' || id::text),
         policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
           || jsonb_build_object('platformPolicyAtReceipt', v_policy),
         updated_at = now()
   WHERE id = v_hold.id;

  IF COALESCE(v_hold.custody, 'kayad') <> 'dealer' THEN
    SELECT public.kayad_post_ledger_entry_atomic(
      'auction-security:' || v_hold.id::text, v_hold.bidder_id, v_hold.amount,
      'KES',
      CASE WHEN v_hold.hold_type = 'commitment' THEN 'auction_commitment' ELSE 'auction_high_value_deposit' END,
      'buyer_security',
      CASE WHEN v_hold.hold_type = 'commitment' THEN 'Auction bidder commitment received'
           ELSE 'Auction high-value security deposit received' END,
      jsonb_build_object('hold_id', v_hold.id, 'auction_id', v_hold.auction_id,
                         'hold_type', v_hold.hold_type, 'receipt', p_receipt),
      '1000', '2100'
    ) INTO v_ledger;
  END IF;

  IF v_hold.hold_type = 'commitment' AND v_hold.registration_id IS NOT NULL THEN
    UPDATE public.auction_registrations
       SET commitment_status = 'satisfied',
           commitment_receipt = p_receipt,
           status = CASE WHEN status IN ('suspended','withdrawn','disqualified','expired')
                         THEN status ELSE 'pending_eligibility' END,
           eligibility_status = CASE WHEN status IN ('suspended','withdrawn','disqualified','expired')
                                     THEN eligibility_status ELSE 'pending' END,
           updated_at = now()
     WHERE id = v_hold.registration_id;
    INSERT INTO public.auction_registration_events(registration_id, event_type, actor_id, metadata)
    VALUES (v_hold.registration_id, 'commitment_payment_confirmed_eligibility_pending',
      v_hold.bidder_id, jsonb_build_object('holdId', v_hold.id, 'receipt', p_receipt));
  END IF;

  RETURN jsonb_build_object('hold_id', v_hold.id, 'auction_id', v_hold.auction_id,
    'bidder_id', v_hold.bidder_id, 'hold_type', v_hold.hold_type,
    'amount', v_hold.amount, 'status', 'held', 'already_settled', FALSE, 'ledger', v_ledger);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_settle_auction_security_hold_atomic(TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_settle_auction_security_hold_atomic(TEXT, BOOLEAN, TEXT) TO service_role;

-- A defaulted winner's applied commitment has already moved from security
-- liability to seller/escrow payable. Forfeit it at default even when the
-- auction may be re-awarded, so it cannot be reused as a later candidate's
-- credit. Reverse that payable into forfeiture revenue; do not debit the
-- security liability a second time.
CREATE OR REPLACE FUNCTION public.kayad_forfeit_auction_winner_security_holds_atomic(
  p_outcome_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_outcome public.auction_outcomes%ROWTYPE;
  v_hold public.auction_security_holds%ROWTYPE;
  v_count INTEGER := 0;
  v_total NUMERIC := 0;
  v_debit TEXT;
BEGIN
  SELECT * INTO v_outcome FROM public.auction_outcomes
   WHERE id = p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;
  IF v_outcome.status NOT IN ('defaulted','reaward_pending') THEN
    RAISE EXCEPTION 'Security forfeiture requires a defaulted or re-award-pending auction outcome';
  END IF;

  FOR v_hold IN
    SELECT * FROM public.auction_security_holds
     WHERE applied_outcome_id = p_outcome_id
       AND bidder_id = v_outcome.winner_user_id
       AND hold_type = 'commitment'
       AND status IN ('held','applied')
     ORDER BY created_at, id
     FOR UPDATE
  LOOP
    IF v_hold.status = 'applied' THEN
      v_debit := CASE WHEN v_outcome.settlement_mode = 'escrow' THEN '2000' ELSE '5000' END;
      IF COALESCE(v_hold.custody, 'kayad') <> 'dealer' THEN
        PERFORM public.kayad_post_ledger_entry_atomic(
          'auction-security-forfeit-applied:' || v_hold.id::text,
          v_hold.bidder_id, COALESCE(v_hold.applied_amount, v_hold.amount), 'KES',
          'auction_security_forfeit', 'platform',
          'Applied auction commitment forfeited after winner default',
          jsonb_build_object('hold_id', v_hold.id, 'outcome_id', p_outcome_id, 'actor_id', p_actor_id,
                             'reversal_of', 'auction-commitment-apply:' || v_hold.id::text),
          v_debit, '4410'
        );
      END IF;
      v_total := v_total + COALESCE(v_hold.applied_amount, v_hold.amount);
    ELSE
      IF COALESCE(v_hold.custody, 'kayad') <> 'dealer' THEN
        PERFORM public.kayad_post_ledger_entry_atomic(
          'auction-security-forfeit:' || v_hold.id::text,
          v_hold.bidder_id, v_hold.amount, 'KES', 'auction_security_forfeit', 'platform',
          'Auction security forfeited after winner default',
          jsonb_build_object('hold_id', v_hold.id, 'outcome_id', p_outcome_id, 'actor_id', p_actor_id),
          '2100', '4410'
        );
      END IF;
      v_total := v_total + v_hold.amount;
    END IF;

    UPDATE public.auction_security_holds
       SET status = 'forfeited', applied_amount = COALESCE(applied_amount, amount),
           updated_at = now()
     WHERE id = v_hold.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('outcome_id', p_outcome_id, 'forfeited_count', v_count, 'forfeited_amount', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_forfeit_auction_winner_security_holds_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_forfeit_auction_winner_security_holds_atomic(UUID, UUID) TO service_role;

-- Re-award: validate the complete bidder, bid, reserve, policy and deadline
-- boundary while holding the outcome, bid, car, setup, registration and user rows.
CREATE OR REPLACE FUNCTION public.kayad_reaward_auction_outcome_atomic(
  p_outcome_id UUID,
  p_candidate_bid_id UUID,
  p_actor_id UUID,
  p_expected_previous_winner_id UUID,
  p_payment_due_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_outcome public.auction_outcomes%ROWTYPE;
  v_bid public.bids%ROWTYPE;
  v_registration public.auction_registrations%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_car public.cars%ROWTYPE;
  v_setup public.auction_setups%ROWTYPE;
  v_policy JSONB := '{}'::jsonb;
  v_credit_enabled BOOLEAN := TRUE;
  v_deadline_hours NUMERIC;
  v_min_deadline NUMERIC := 1;
  v_max_deadline NUMERIC := 168;
  v_reserve_mode TEXT;
  v_reserve_price NUMERIC := 0;
  v_user_json JSONB;
  v_commitment_hold public.auction_security_holds%ROWTYPE;
  v_commitment NUMERIC := 0;
  v_due NUMERIC := 0;
BEGIN
  IF p_payment_due_at IS NULL OR p_payment_due_at <= now() THEN
    RAISE EXCEPTION 'Re-award payment deadline must be in the future';
  END IF;

  SELECT * INTO v_outcome FROM public.auction_outcomes WHERE id = p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;
  IF v_outcome.status <> 'reaward_pending'
     OR v_outcome.reaward_enabled IS DISTINCT FROM TRUE
     OR v_outcome.winner_user_id IS DISTINCT FROM p_expected_previous_winner_id THEN
    RAISE EXCEPTION 'Auction is not awaiting re-award or winner has changed';
  END IF;
  IF v_outcome.organizer_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Only the auction organizer may re-award this outcome';
  END IF;

  SELECT * INTO v_car FROM public.cars WHERE id = v_outcome.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction vehicle not found'; END IF;
  SELECT * INTO v_setup FROM public.auction_setups WHERE car_id = v_outcome.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction setup not found'; END IF;

  SELECT * INTO v_bid FROM public.bids WHERE id = p_candidate_bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate bid not found'; END IF;
  IF v_bid.car_id IS DISTINCT FROM v_outcome.car_id
     OR v_bid.status <> 'lost'
     OR v_bid.user_id IS NULL
     OR v_bid.user_id = p_expected_previous_winner_id
     OR COALESCE(v_bid.amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Candidate bid is no longer eligible for re-award';
  END IF;

  v_reserve_mode := COALESCE(to_jsonb(v_car)->>'reserve_mode', 'none');
  v_reserve_price := COALESCE(NULLIF(to_jsonb(v_car)->>'reserve_price','')::numeric, 0);
  IF v_reserve_mode = 'hard' AND v_reserve_price > 0 AND v_bid.amount < v_reserve_price THEN
    RAISE EXCEPTION 'Candidate bid does not meet the hard reserve';
  END IF;

  SELECT * INTO v_registration FROM public.auction_registrations
   WHERE auction_id = v_outcome.car_id AND bidder_id = v_bid.user_id
   FOR UPDATE;
  IF NOT FOUND OR v_registration.status <> 'active'
     OR v_registration.eligibility_status <> 'eligible'
     OR (v_registration.commitment_required AND v_registration.commitment_status <> 'satisfied')
     OR (NOT v_registration.commitment_required AND v_registration.commitment_status NOT IN ('not_required','satisfied')) THEN
    RAISE EXCEPTION 'Candidate bidder is not currently authorized';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_bid.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate bidder account not found'; END IF;
  v_user_json := to_jsonb(v_user);
  IF COALESCE((v_user_json->>'is_banned')::boolean, FALSE)
     OR COALESCE((v_user_json->>'isBanned')::boolean, FALSE)
     OR lower(COALESCE(v_user_json->>'status','')) IN ('banned','suspended','rejected','deactivated','deleted')
     OR NULLIF(v_user_json->>'deactivated_at','') IS NOT NULL
     OR NULLIF(v_user_json->>'deleted_at','') IS NOT NULL THEN
    RAISE EXCEPTION 'Candidate bidder account is not active';
  END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_policy FROM public.auction_platform_policies WHERE id = 1;
  v_min_deadline := COALESCE(NULLIF(v_policy->>'minPaymentDeadlineHours','')::numeric, 1);
  v_max_deadline := COALESCE(NULLIF(v_policy->>'maxPaymentDeadlineHours','')::numeric, 168);
  v_deadline_hours := EXTRACT(EPOCH FROM (p_payment_due_at - now())) / 3600;
  IF v_deadline_hours < v_min_deadline OR v_deadline_hours > v_max_deadline THEN
    RAISE EXCEPTION 'Re-award payment deadline is outside the current platform policy';
  END IF;
  v_credit_enabled :=
    COALESCE((v_policy->>'commitmentCreditTowardWinningPayment')::boolean, TRUE)
    AND COALESCE((v_setup.config#>>'{commitment,creditTowardWinningPayment}')::boolean, TRUE);

  -- Only an unreimbursed commitment may be credited. A retained loser hold
  -- (refund policy disabled) can become this re-awarded winner's credit now;
  -- refund_pending/refunded holds are never eligible.
  IF v_credit_enabled THEN
    SELECT * INTO v_commitment_hold
      FROM public.auction_security_holds
     WHERE auction_id = v_outcome.car_id AND bidder_id = v_bid.user_id
       AND hold_type = 'commitment'
       AND (status = 'applied' AND applied_outcome_id = v_outcome.id
            OR status = 'held')
     ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
    IF FOUND THEN
      IF COALESCE(v_commitment_hold.amount, 0) > COALESCE(v_bid.amount, 0) THEN
        UPDATE public.auction_security_holds
           SET status = 'refund_pending', applied_outcome_id = v_outcome.id,
               policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
                 || jsonb_build_object('commitmentCreditEnabled', TRUE, 'creditRejectedReason', 'commitment_exceeds_winning_bid'),
               updated_at = now()
         WHERE id = v_commitment_hold.id;
      ELSE
        v_commitment := COALESCE(v_commitment_hold.amount, 0);
      END IF;
      IF v_commitment_hold.status = 'held' AND v_commitment > 0 THEN
        UPDATE public.auction_security_holds
           SET status = 'applied', applied_outcome_id = v_outcome.id,
               applied_amount = v_commitment,
               policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
                 || jsonb_build_object('commitmentCreditEnabled', TRUE, 'appliedOnReaward', TRUE),
               updated_at = now()
         WHERE id = v_commitment_hold.id;
        IF COALESCE(v_commitment_hold.custody, 'kayad') <> 'dealer' AND v_commitment > 0 THEN
          PERFORM public.kayad_post_ledger_entry_atomic(
            'auction-commitment-apply:' || v_commitment_hold.id::text,
            v_bid.user_id, v_commitment, 'KES',
            'auction_commitment_applied',
            CASE WHEN v_outcome.settlement_mode = 'escrow' THEN 'escrow_payable' ELSE 'seller_payable' END,
            'Auction bidder commitment credited toward re-awarded winning settlement',
            jsonb_build_object('hold_id', v_commitment_hold.id, 'outcome_id', v_outcome.id, 'reaward', TRUE),
            '2100',
            CASE WHEN v_outcome.settlement_mode = 'escrow' THEN '2000' ELSE '5000' END
          );
        END IF;
      END IF;
    END IF;
  ELSIF NOT v_credit_enabled THEN
    -- Keep a policy-retained commitment attached to this outcome as collateral,
    -- but do not treat it as payment credit.
    UPDATE public.auction_security_holds
       SET applied_outcome_id = v_outcome.id,
           policy_snapshot = COALESCE(policy_snapshot, '{}'::jsonb)
             || jsonb_build_object('commitmentCreditEnabled', FALSE, 'retainedOnReaward', TRUE),
           updated_at = now()
     WHERE auction_id = v_outcome.car_id AND bidder_id = v_bid.user_id
       AND hold_type = 'commitment' AND status = 'held';
  END IF;
  v_due := GREATEST(COALESCE(v_bid.amount, 0) - v_commitment, 0);

  UPDATE public.bids SET status = 'won' WHERE id = v_bid.id AND status = 'lost';
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate bid was concurrently claimed'; END IF;

  UPDATE public.auction_outcomes
     SET status = 'payment_due',
         winner_user_id = v_bid.user_id,
         winning_bid_id = v_bid.id,
         winning_amount = v_bid.amount,
         payment_status = 'pending',
         payment_id = NULL,
         payment_receipt = NULL,
         commitment_applied_amount = v_commitment,
         payment_due_amount = v_due,
         security_reconciliation_status = 'reconciled',
         security_reconciled_at = now(),
         payment_due_at = p_payment_due_at,
         paid_at = NULL,
         defaulted_at = NULL,
         defaulted_by = NULL,
         reaward_count = COALESCE(reaward_count, 0) + 1,
         collection_status = 'pending_payment',
         transfer_status = 'pending_payment',
         completed_at = NULL,
         updated_at = now()
   WHERE id = v_outcome.id;

  RETURN jsonb_build_object('outcome',
    (SELECT to_jsonb(o) FROM public.auction_outcomes o WHERE o.id = v_outcome.id),
    'candidate_bid_id', v_bid.id, 'winner_user_id', v_bid.user_id,
    'payment_due_amount', v_due, 'commitment_applied_amount', v_commitment);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_reaward_auction_outcome_atomic(UUID,UUID,UUID,UUID,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_reaward_auction_outcome_atomic(UUID,UUID,UUID,UUID,TIMESTAMPTZ) TO service_role;
