-- KAYAD Auction wallet, loser refunds, withdrawals and dealer-direct collection custody.
-- OWNER-RUN. Not applied by Claude. Review, then run in the Supabase SQL editor (idempotent: safe to re-run).

ALTER TABLE auction_security_holds ADD COLUMN IF NOT EXISTS custody TEXT NOT NULL DEFAULT 'kayad' CHECK (custody IN ('kayad','dealer'));
ALTER TABLE auction_security_holds ADD COLUMN IF NOT EXISTS refund_destination TEXT CHECK (refund_destination IN ('wallet','mpesa'));

CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance_after NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  auction_id UUID,
  hold_id UUID,
  withdrawal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  conversation_id TEXT,
  mpesa_receipt TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_wd_conv ON wallet_withdrawals(conversation_id);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;

-- Dealer-direct collection accounts. Credentials are stored ENCRYPTED by the application (AES-256-GCM); an admin must verify the account
-- before it can receive any commitment. Private sellers can never have one used (enforced in the application and by the gate below).
CREATE TABLE IF NOT EXISTS dealer_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('paybill','till')),
  shortcode TEXT NOT NULL CHECK (shortcode ~ '^[0-9]{5,8}$'),
  till_number TEXT CHECK (till_number IS NULL OR till_number ~ '^[0-9]{5,8}$'),
  account_label TEXT,
  credentials_enc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','disabled')),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE dealer_payment_accounts ENABLE ROW LEVEL SECURITY;

-- Loser refund: refund_pending hold -> refunded, credited to the bidder's wallet. KAYAD-held money only.
CREATE OR REPLACE FUNCTION kayad_auction_refund_to_wallet_atomic(p_hold_id UUID, p_user_id UUID, p_destination TEXT DEFAULT 'wallet')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hold auction_security_holds%ROWTYPE; v_wallet wallets%ROWTYPE; v_tx_id UUID;
BEGIN
  SELECT * INTO v_hold FROM auction_security_holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Security hold not found'; END IF;
  IF v_hold.bidder_id <> p_user_id THEN RAISE EXCEPTION 'Hold does not belong to this bidder'; END IF;
  IF COALESCE(v_hold.custody,'kayad') = 'dealer' THEN RAISE EXCEPTION 'This commitment was paid to the dealer directly; the dealer refunds it'; END IF;
  IF v_hold.status = 'refunded' THEN
    SELECT balance INTO v_wallet.balance FROM wallets WHERE user_id = p_user_id;
    RETURN jsonb_build_object('hold_id', v_hold.id, 'amount', v_hold.amount, 'status', 'refunded', 'idempotent', true, 'balance', COALESCE(v_wallet.balance,0));
  END IF;
  IF v_hold.status <> 'refund_pending' THEN RAISE EXCEPTION 'Hold is not awaiting refund'; END IF;
  INSERT INTO wallets(user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  UPDATE wallets SET balance = balance + v_hold.amount, updated_at = now() WHERE user_id = p_user_id RETURNING * INTO v_wallet;
  INSERT INTO wallet_transactions(user_id, direction, amount, balance_after, reason, idempotency_key, auction_id, hold_id)
  VALUES (p_user_id, 'credit', v_hold.amount, v_wallet.balance, 'auction_commitment_refund', 'refund:' || v_hold.id::text, v_hold.auction_id, v_hold.id)
  RETURNING id INTO v_tx_id;
  UPDATE auction_security_holds SET status = 'refunded', refund_destination = COALESCE(p_destination,'wallet'),
         external_refund_reference = 'wallet:' || v_tx_id::text, updated_at = now() WHERE id = v_hold.id;
  -- The money stays a customer liability (2100 Refund Payable); only its form changes, so no cash ledger entry is needed here.
  RETURN jsonb_build_object('hold_id', v_hold.id, 'amount', v_hold.amount, 'status', 'refunded', 'idempotent', false, 'balance', v_wallet.balance);
END; $$;

-- Withdrawal request: debit the wallet first, create the request. Fails if balance is short.
CREATE OR REPLACE FUNCTION kayad_wallet_request_withdrawal_atomic(p_user_id UUID, p_amount NUMERIC, p_phone TEXT, p_idempotency_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_wallet wallets%ROWTYPE; v_wd wallet_withdrawals%ROWTYPE; v_amount NUMERIC := ROUND(p_amount, 0);
BEGIN
  IF v_amount IS NULL OR v_amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is KES 10'; END IF;
  SELECT * INTO v_wd FROM wallet_withdrawals WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN to_jsonb(v_wd) || jsonb_build_object('idempotent', true); END IF;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO wallet_withdrawals(user_id, amount, phone, idempotency_key) VALUES (p_user_id, v_amount, p_phone, p_idempotency_key) RETURNING * INTO v_wd;
  UPDATE wallets SET balance = balance - v_amount, updated_at = now() WHERE user_id = p_user_id RETURNING * INTO v_wallet;
  INSERT INTO wallet_transactions(user_id, direction, amount, balance_after, reason, idempotency_key, withdrawal_id)
  VALUES (p_user_id, 'debit', v_amount, v_wallet.balance, 'withdrawal_to_mpesa', 'withdraw:' || v_wd.id::text, v_wd.id);
  RETURN to_jsonb(v_wd) || jsonb_build_object('idempotent', false, 'balance', v_wallet.balance);
END; $$;

-- Provider result: success marks paid and posts the cash-out ledger entry; failure returns the money to the wallet. Replay-safe.
CREATE OR REPLACE FUNCTION kayad_wallet_withdrawal_result_atomic(p_withdrawal_id UUID, p_status TEXT, p_conversation_id TEXT, p_receipt TEXT, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_wd wallet_withdrawals%ROWTYPE; v_wallet wallets%ROWTYPE;
BEGIN
  IF p_status NOT IN ('processing','paid','failed') THEN RAISE EXCEPTION 'Invalid withdrawal status'; END IF;
  SELECT * INTO v_wd FROM wallet_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_wd.status IN ('paid','failed') THEN RETURN to_jsonb(v_wd) || jsonb_build_object('idempotent', true); END IF;
  IF p_status = 'processing' THEN
    UPDATE wallet_withdrawals SET status='processing', conversation_id=COALESCE(p_conversation_id, conversation_id), updated_at=now() WHERE id=v_wd.id RETURNING * INTO v_wd;
  ELSIF p_status = 'paid' THEN
    UPDATE wallet_withdrawals SET status='paid', conversation_id=COALESCE(p_conversation_id, conversation_id), mpesa_receipt=p_receipt, updated_at=now() WHERE id=v_wd.id RETURNING * INTO v_wd;
    PERFORM kayad_post_ledger_entry_atomic('wallet-withdrawal:' || v_wd.id::text, v_wd.user_id, v_wd.amount, 'KES', 'wallet_withdrawal', 'customer',
      'Wallet withdrawal paid to M-Pesa', jsonb_build_object('withdrawal_id', v_wd.id, 'receipt', p_receipt), '2100', '1000');
  ELSE
    UPDATE wallet_withdrawals SET status='failed', conversation_id=COALESCE(p_conversation_id, conversation_id), failure_reason=p_reason, updated_at=now() WHERE id=v_wd.id RETURNING * INTO v_wd;
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_wd.user_id FOR UPDATE;
    UPDATE wallets SET balance = balance + v_wd.amount, updated_at = now() WHERE user_id = v_wd.user_id RETURNING * INTO v_wallet;
    INSERT INTO wallet_transactions(user_id, direction, amount, balance_after, reason, idempotency_key, withdrawal_id)
    VALUES (v_wd.user_id, 'credit', v_wd.amount, v_wallet.balance, 'withdrawal_failed_reversal', 'withdraw-reversal:' || v_wd.id::text, v_wd.id);
  END IF;
  RETURN to_jsonb(v_wd) || jsonb_build_object('idempotent', false);
END; $$;

REVOKE ALL ON FUNCTION kayad_auction_refund_to_wallet_atomic(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_wallet_request_withdrawal_atomic(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_wallet_withdrawal_result_atomic(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_auction_refund_to_wallet_atomic(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_wallet_request_withdrawal_atomic(UUID, NUMERIC, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_wallet_withdrawal_result_atomic(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Re-created from 20261007180000 with ONE change: dealer-custody holds skip KAYAD ledger postings (KAYAD never received that cash).
CREATE OR REPLACE FUNCTION kayad_settle_auction_security_hold_atomic(
  p_checkout_request_id TEXT,
  p_success BOOLEAN,
  p_receipt TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold auction_security_holds%ROWTYPE;
  v_registration auction_registrations%ROWTYPE;
  v_ledger JSONB;
  v_policy JSONB := '{}'::jsonb;
  v_status TEXT;
BEGIN
  SELECT * INTO v_hold
  FROM auction_security_holds
  WHERE checkout_request_id = p_checkout_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction security hold not found';
  END IF;

  IF v_hold.status IN ('held','applied','refund_pending','refunded','forfeited') THEN
    RETURN jsonb_build_object(
      'hold_id', v_hold.id,
      'auction_id', v_hold.auction_id,
      'bidder_id', v_hold.bidder_id,
      'hold_type', v_hold.hold_type,
      'amount', v_hold.amount,
      'status', v_hold.status,
      'already_settled', true,
      'receipt', v_hold.mpesa_receipt
    );
  END IF;

  IF NOT p_success THEN
    UPDATE auction_security_holds
       SET status = 'failed',
           mpesa_receipt = NULL,
           updated_at = now()
     WHERE id = v_hold.id;

    IF v_hold.registration_id IS NOT NULL AND v_hold.hold_type = 'commitment' THEN
      UPDATE auction_registrations
         SET commitment_status = 'failed',
             status = 'pending_commitment',
             updated_at = now()
       WHERE id = v_hold.registration_id;
    END IF;

    RETURN jsonb_build_object('hold_id', v_hold.id, 'status', 'failed', 'already_settled', false);
  END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_policy
  FROM auction_platform_policies WHERE id = 1;

  v_status := 'held';
  UPDATE auction_security_holds
     SET status = v_status,
         mpesa_receipt = p_receipt,
         ledger_reference = COALESCE(ledger_reference, 'auction-security:' || id::text),
         policy_snapshot = v_policy,
         updated_at = now()
   WHERE id = v_hold.id;

  -- Refundable security is a buyer liability until it is either credited,
  -- refunded or forfeited. The ledger post is idempotent on hold identity.
  -- Dealer-direct custody: the money went to the dealer's own till/paybill, never through KAYAD's cash account.
  IF COALESCE(v_hold.custody,'kayad') <> 'dealer' THEN
  SELECT kayad_post_ledger_entry_atomic(
    'auction-security:' || v_hold.id::text,
    v_hold.bidder_id,
    v_hold.amount,
    'KES',
    CASE WHEN v_hold.hold_type = 'commitment' THEN 'auction_commitment' ELSE 'auction_high_value_deposit' END,
    'buyer_security',
    CASE WHEN v_hold.hold_type = 'commitment'
      THEN 'Auction bidder commitment received'
      ELSE 'Auction high-value security deposit received' END,
    jsonb_build_object('hold_id', v_hold.id, 'auction_id', v_hold.auction_id, 'hold_type', v_hold.hold_type, 'receipt', p_receipt),
    '1000',
    '2100'
  ) INTO v_ledger;
  END IF;

  IF v_hold.hold_type = 'commitment' AND v_hold.registration_id IS NOT NULL THEN
    UPDATE auction_registrations
       SET commitment_status = 'satisfied',
           commitment_receipt = p_receipt,
           status = 'active',
           eligibility_status = 'eligible',
           activated_at = COALESCE(activated_at, now()),
           updated_at = now()
     WHERE id = v_hold.registration_id;

    INSERT INTO auction_registration_events(registration_id, event_type, actor_id, metadata)
    VALUES(v_hold.registration_id, 'commitment_confirmed', v_hold.bidder_id,
      jsonb_build_object('holdId', v_hold.id, 'receipt', p_receipt, 'ledgerReference', 'auction-security:' || v_hold.id::text));
  END IF;

  RETURN jsonb_build_object(
    'hold_id', v_hold.id,
    'auction_id', v_hold.auction_id,
    'bidder_id', v_hold.bidder_id,
    'hold_type', v_hold.hold_type,
    'amount', v_hold.amount,
    'status', 'held',
    'already_settled', false,
    'ledger', v_ledger
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_settle_auction_security_hold_atomic(TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_settle_auction_security_hold_atomic(TEXT, BOOLEAN, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION kayad_reconcile_auction_security_holds_atomic(
  p_auction_id UUID,
  p_outcome_id UUID,
  p_winner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold auction_security_holds%ROWTYPE;
  v_outcome auction_outcomes%ROWTYPE;
  v_refund_count INTEGER := 0;
  v_applied_count INTEGER := 0;
BEGIN
  SELECT * INTO v_outcome FROM auction_outcomes WHERE id = p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;
  IF v_outcome.car_id <> p_auction_id THEN RAISE EXCEPTION 'Auction outcome does not belong to auction'; END IF;

  FOR v_hold IN
    SELECT * FROM auction_security_holds
    WHERE auction_id = p_auction_id AND status = 'held'
    FOR UPDATE
  LOOP
    IF p_winner_user_id IS NOT NULL AND v_hold.bidder_id = p_winner_user_id AND v_hold.hold_type = 'commitment' THEN
      UPDATE auction_security_holds
         SET status = 'applied',
             applied_outcome_id = p_outcome_id,
             applied_amount = v_hold.amount,
             updated_at = now()
       WHERE id = v_hold.id;

      -- Move the held commitment liability into the same seller/escrow
      -- payable that will receive the winner's remaining settlement.
      IF COALESCE(v_hold.custody,'kayad') <> 'dealer' THEN
      PERFORM kayad_post_ledger_entry_atomic(
        'auction-commitment-apply:' || v_hold.id::text,
        v_hold.bidder_id,
        v_hold.amount,
        'KES',
        'auction_commitment_applied',
        CASE WHEN v_outcome.settlement_mode = 'escrow' THEN 'escrow_payable' ELSE 'seller_payable' END,
        'Auction bidder commitment credited toward winning settlement',
        jsonb_build_object('hold_id', v_hold.id, 'outcome_id', p_outcome_id),
        '2100',
        CASE WHEN v_outcome.settlement_mode = 'escrow' THEN '2000' ELSE '5000' END
      );
      END IF;
      v_applied_count := v_applied_count + 1;
    ELSE
      UPDATE auction_security_holds
         SET status = 'refund_pending',
             applied_outcome_id = p_outcome_id,
             updated_at = now()
       WHERE id = v_hold.id;
      v_refund_count := v_refund_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'auction_id', p_auction_id,
    'outcome_id', p_outcome_id,
    'applied_count', v_applied_count,
    'refund_pending_count', v_refund_count
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_reconcile_auction_security_holds_atomic(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_reconcile_auction_security_holds_atomic(UUID, UUID, UUID) TO service_role;
