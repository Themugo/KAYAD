-- Atomic auction winner re-award.
-- Claims a previously-losing bid and reassigns the outcome in one transaction.
-- All checks are repeated under row locks; caller-side checks are advisory only.

CREATE OR REPLACE FUNCTION public.kayad_reaward_auction_outcome_atomic(
  p_outcome_id UUID,
  p_candidate_bid_id UUID,
  p_actor_id UUID,
  p_expected_previous_winner_id UUID,
  p_payment_due_at TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_outcome public.auction_outcomes%ROWTYPE;
  v_bid public.bids%ROWTYPE;
  v_registration public.auction_registrations%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_commitment NUMERIC := 0;
  v_due NUMERIC := 0;
  v_next_status TEXT;
BEGIN
  SELECT * INTO v_outcome
    FROM public.auction_outcomes
   WHERE id = p_outcome_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;

  IF v_outcome.status <> 'reaward_pending'
     OR v_outcome.reaward_enabled IS DISTINCT FROM TRUE
     OR v_outcome.winner_user_id IS DISTINCT FROM p_expected_previous_winner_id THEN
    RAISE EXCEPTION 'Auction is not awaiting re-award or winner has changed';
  END IF;

  IF v_outcome.organizer_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Only the auction organizer may re-award this outcome';
  END IF;

  SELECT * INTO v_bid
    FROM public.bids
   WHERE id = p_candidate_bid_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate bid not found'; END IF;
  IF v_bid.car_id IS DISTINCT FROM v_outcome.car_id
     OR v_bid.status <> 'lost'
     OR v_bid.user_id IS NULL
     OR v_bid.user_id = p_expected_previous_winner_id THEN
    RAISE EXCEPTION 'Candidate bid is no longer eligible for re-award';
  END IF;

  SELECT * INTO v_registration
    FROM public.auction_registrations
   WHERE auction_id = v_outcome.car_id
     AND bidder_id = v_bid.user_id
   FOR UPDATE;
  IF NOT FOUND
     OR v_registration.status <> 'active'
     OR v_registration.eligibility_status <> 'eligible'
     OR v_registration.commitment_status NOT IN ('not_required','satisfied') THEN
    RAISE EXCEPTION 'Candidate bidder is not currently authorized';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_bid.user_id FOR UPDATE;
  IF NOT FOUND OR v_user.status IN ('suspended','rejected') THEN
    RAISE EXCEPTION 'Candidate bidder account is not active';
  END IF;

  -- Only a commitment hold already applied to this exact outcome may reduce
  -- the payment balance. A hold previously moved to refund_pending/refunded
  -- is never reused as credit for a re-awarded winner.
  SELECT COALESCE(amount, 0) INTO v_commitment
    FROM public.auction_security_holds
   WHERE auction_id = v_outcome.car_id
     AND bidder_id = v_bid.user_id
     AND hold_type = 'commitment'
     AND status = 'applied'
     AND applied_outcome_id = v_outcome.id
   ORDER BY updated_at DESC
   LIMIT 1
   FOR UPDATE;

  v_commitment := LEAST(COALESCE(v_commitment, 0), GREATEST(COALESCE(v_bid.amount, 0), 0));
  v_due := GREATEST(COALESCE(v_bid.amount, 0) - v_commitment, 0);
  v_next_status := CASE WHEN v_outcome.settlement_mode = 'escrow'
                        THEN 'escrow_pending_funding' ELSE 'payment_due' END;

  UPDATE public.bids SET status = 'won'
   WHERE id = v_bid.id AND status = 'lost';
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate bid was concurrently claimed'; END IF;

  UPDATE public.auction_outcomes
     SET status = v_next_status,
         winner_user_id = v_bid.user_id,
         winning_bid_id = v_bid.id,
         winning_amount = v_bid.amount,
         payment_status = 'pending',
         payment_id = NULL,
         payment_receipt = NULL,
         commitment_applied_amount = v_commitment,
         payment_due_amount = v_due,
         security_reconciliation_status = 'pending',
         security_reconciled_at = NULL,
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

  RETURN jsonb_build_object('outcome', (SELECT to_jsonb(o) FROM public.auction_outcomes o WHERE o.id = v_outcome.id),
                            'candidate_bid_id', v_bid.id,
                            'winner_user_id', v_bid.user_id,
                            'payment_due_amount', v_due,
                            'commitment_applied_amount', v_commitment);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_reaward_auction_outcome_atomic(UUID,UUID,UUID,UUID,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_reaward_auction_outcome_atomic(UUID,UUID,UUID,UUID,TIMESTAMPTZ) TO service_role;
COMMENT ON FUNCTION public.kayad_reaward_auction_outcome_atomic IS
'Atomically claims an eligible losing bid and reassigns an auction outcome under row locks; never reuses refunded or pending-refund security holds as payment credit.';
