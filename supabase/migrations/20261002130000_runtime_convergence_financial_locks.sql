-- KAYAD Runtime & Production Convergence
-- Concurrency hardening for financial idempotency and deterministic ledger locking.

CREATE OR REPLACE FUNCTION public.kayad_post_ledger_entry_atomic(
  p_external_reference TEXT,
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_source TEXT,
  p_destination TEXT,
  p_description TEXT,
  p_metadata JSONB,
  p_debit_account_code TEXT,
  p_credit_account_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.ledger_entries%ROWTYPE;
  v_debit public.ledger_accounts%ROWTYPE;
  v_credit public.ledger_accounts%ROWTYPE;
  v_entry public.ledger_entries%ROWTYPE;
  v_amount NUMERIC := ROUND(p_amount, 2);
BEGIN
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Ledger amount must be greater than zero';
  END IF;
  IF NULLIF(trim(p_external_reference), '') IS NULL THEN
    RAISE EXCEPTION 'Ledger external reference is required';
  END IF;
  IF NULLIF(trim(p_source), '') IS NULL THEN
    RAISE EXCEPTION 'Ledger source is required';
  END IF;
  IF p_debit_account_code = p_credit_account_code THEN
    RAISE EXCEPTION 'Ledger debit and credit accounts must differ';
  END IF;

  -- INSERT ... ON CONFLICT closes the check-then-insert race that a plain
  -- SELECT ... FOR UPDATE cannot prevent when the idempotency row does not
  -- exist yet. The unique (external_reference, source) index is authoritative.
  INSERT INTO public.ledger_entries (
    transaction_id, external_reference, user_id, amount, currency,
    source, destination, status, description, entries, metadata
  )
  SELECT
    concat('LGR-', extract(epoch from clock_timestamp())::BIGINT, '-', substr(gen_random_uuid()::TEXT, 1, 8)),
    p_external_reference, p_user_id, v_amount, COALESCE(p_currency, 'KES'),
    p_source, p_destination, 'completed', p_description,
    jsonb_build_array(
      jsonb_build_object('account', debit.id, 'debit', v_amount, 'credit', 0),
      jsonb_build_object('account', credit.id, 'debit', 0, 'credit', v_amount)
    ),
    COALESCE(p_metadata, '{}'::jsonb)
  FROM public.ledger_accounts debit
  CROSS JOIN public.ledger_accounts credit
  WHERE debit.code = p_debit_account_code
    AND credit.code = p_credit_account_code
  ON CONFLICT (external_reference, source) DO NOTHING
  RETURNING * INTO v_entry;

  IF FOUND THEN
    -- Lock accounts in deterministic code order to prevent cross-account
    -- deadlocks when concurrent transactions post opposite directions.
    IF p_debit_account_code < p_credit_account_code THEN
      SELECT * INTO v_debit FROM public.ledger_accounts WHERE code = p_debit_account_code FOR UPDATE;
      SELECT * INTO v_credit FROM public.ledger_accounts WHERE code = p_credit_account_code FOR UPDATE;
    ELSE
      SELECT * INTO v_credit FROM public.ledger_accounts WHERE code = p_credit_account_code FOR UPDATE;
      SELECT * INTO v_debit FROM public.ledger_accounts WHERE code = p_debit_account_code FOR UPDATE;
    END IF;

    IF NOT FOUND OR v_debit.id IS NULL OR v_credit.id IS NULL THEN
      RAISE EXCEPTION 'Ledger account not found';
    END IF;

    UPDATE public.ledger_accounts
       SET balance = balance + v_amount, updated_at = now()
     WHERE id = v_debit.id;

    UPDATE public.ledger_accounts
       SET balance = balance - v_amount, updated_at = now()
     WHERE id = v_credit.id;
  ELSE
    SELECT * INTO v_existing
      FROM public.ledger_entries
     WHERE external_reference = p_external_reference
       AND source = p_source
     LIMIT 1;
    IF FOUND THEN
      RETURN to_jsonb(v_existing) || jsonb_build_object('idempotent', true);
    END IF;

    RAISE EXCEPTION 'Unable to create ledger entry: debit or credit account not found';
  END IF;

  RETURN to_jsonb(v_entry) || jsonb_build_object('idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_post_ledger_entry_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_post_ledger_entry_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.kayad_post_ledger_entry_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
IS 'Canonical idempotent ledger posting. Unique event identity is enforced by (external_reference, source), with deterministic account locking.';
