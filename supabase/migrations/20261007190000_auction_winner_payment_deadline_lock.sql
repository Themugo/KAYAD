-- P0/P1 SOURCE-LEVEL TRUST BOUNDARY SWEEP — Item 8 (concurrency extension)
-- Scenario: "winner payment + deadline"
--
-- backend/services/auctionSettlement.service.js's markAuctionPaymentReceived()
-- and defaultAuctionWinner() both read auction_outcomes by id, checked
-- status === "payment_due" in application code, and then wrote back with a
-- plain findById()/update() pair — no SELECT ... FOR UPDATE, no WHERE clause
-- tied to the previously-read status. Every other competing-writer financial
-- transition in this codebase (escrow, purchase_outcomes, dealer_payouts,
-- auction_security_holds) goes through a dedicated Postgres function that
-- locks the row first; these two did not.
--
-- Concretely: the M-Pesa payment-confirmation webhook (which calls
-- markAuctionPaymentReceived) and the payment-deadline sweep/admin action
-- (which calls defaultAuctionWinner) could both read the same
-- auction_outcomes row while it was still "payment_due" and both commit —
-- one crediting the seller payable for the winner's payment, the other
-- forfeiting the same winner's security deposit and marking the sale
-- defaulted. Both financial consequences would fire for a single real-world
-- payment event.
--
-- These two functions close that race the same way every sibling transition
-- in this codebase already does: SELECT ... FOR UPDATE on auction_outcomes
-- first, so whichever caller's transaction commits first is authoritative,
-- and the second caller (unblocked only after the first commits) observes
-- the already-changed status and fails closed instead of applying a second,
-- conflicting transition.

CREATE OR REPLACE FUNCTION public.kayad_settle_auction_winner_payment_atomic(
  p_outcome_id UUID,
  p_payment_id UUID,
  p_winner_user_id UUID,
  p_expected_amount NUMERIC,
  p_actual_amount NUMERIC,
  p_receipt TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_outcome auction_outcomes%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_outcome FROM public.auction_outcomes WHERE id = p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;

  -- Replay-safe: a retried webhook delivery for a payment already recorded
  -- against this outcome is a no-op, not an error.
  IF v_outcome.payment_status = 'paid' AND v_outcome.payment_id = p_payment_id THEN
    RETURN jsonb_build_object('id', v_outcome.id, 'status', v_outcome.status, 'idempotent', true);
  END IF;

  IF v_outcome.status <> 'payment_due' THEN
    RAISE EXCEPTION 'Auction is not awaiting winner payment (current status: %)', v_outcome.status;
  END IF;
  IF v_outcome.winner_user_id IS DISTINCT FROM p_winner_user_id THEN
    RAISE EXCEPTION 'Winner payment does not belong to the auction winner';
  END IF;
  IF ROUND(p_actual_amount, 2) <> ROUND(p_expected_amount, 2) THEN
    RAISE EXCEPTION 'Winner payment amount does not match the authoritative auction payment due';
  END IF;

  UPDATE public.auction_outcomes SET
    status = CASE WHEN settlement_mode = 'escrow' THEN 'escrow_pending_funding' ELSE 'payment_received' END,
    payment_status = 'paid',
    payment_id = p_payment_id,
    payment_receipt = p_receipt,
    paid_at = v_now,
    collection_status = 'ready_for_collection',
    transfer_status = 'pending_collection',
    updated_at = v_now
  WHERE id = v_outcome.id;

  RETURN jsonb_build_object(
    'id', v_outcome.id,
    'settlementMode', v_outcome.settlement_mode,
    'carId', v_outcome.car_id,
    'idempotent', false
  );
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_settle_auction_winner_payment_atomic(UUID,UUID,UUID,NUMERIC,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_settle_auction_winner_payment_atomic(UUID,UUID,UUID,NUMERIC,NUMERIC,TEXT) TO service_role;
COMMENT ON FUNCTION public.kayad_settle_auction_winner_payment_atomic IS 'Atomically settles a winner auction payment against auction_outcomes, row-locked so it cannot race defaultAuctionWinner''s forfeiture transition for the same outcome.';

CREATE OR REPLACE FUNCTION public.kayad_default_auction_winner_atomic(
  p_outcome_id UUID,
  p_actor_id UUID,
  p_reaward_allowed BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_outcome auction_outcomes%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_outcome FROM public.auction_outcomes WHERE id = p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;

  -- Already defaulted (by a previous call, or lost the race to a concurrent
  -- payment that landed first and moved status off payment_due) — idempotent
  -- no-op rather than a duplicate forfeiture.
  IF v_outcome.status IN ('defaulted', 'reaward_pending') THEN
    RETURN jsonb_build_object('id', v_outcome.id, 'status', v_outcome.status, 'idempotent', true);
  END IF;

  IF v_outcome.status <> 'payment_due' THEN
    RAISE EXCEPTION 'Auction is not awaiting winner payment (current status: %)', v_outcome.status;
  END IF;
  IF v_outcome.payment_due_at IS NULL OR v_outcome.payment_due_at > v_now THEN
    RAISE EXCEPTION 'Winner payment deadline has not passed';
  END IF;

  UPDATE public.auction_outcomes SET
    status = CASE WHEN p_reaward_allowed THEN 'reaward_pending' ELSE 'defaulted' END,
    payment_status = 'defaulted',
    defaulted_at = v_now,
    defaulted_by = p_actor_id,
    collection_status = 'blocked',
    transfer_status = 'blocked',
    updated_at = v_now
  WHERE id = v_outcome.id;

  RETURN jsonb_build_object(
    'id', v_outcome.id,
    'carId', v_outcome.car_id,
    'reawardAllowed', p_reaward_allowed,
    'idempotent', false
  );
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_default_auction_winner_atomic(UUID,UUID,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_default_auction_winner_atomic(UUID,UUID,BOOLEAN) TO service_role;
COMMENT ON FUNCTION public.kayad_default_auction_winner_atomic IS 'Atomically defaults an auction winner against auction_outcomes, row-locked so it cannot race markAuctionPaymentReceived''s settlement transition for the same outcome.';
