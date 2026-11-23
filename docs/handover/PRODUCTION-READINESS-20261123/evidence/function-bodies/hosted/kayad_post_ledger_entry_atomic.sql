CREATE OR REPLACE FUNCTION public.kayad_post_ledger_entry_atomic(p_external_reference text, p_user_id uuid, p_amount numeric, p_currency text, p_source text, p_destination text, p_description text, p_metadata jsonb, p_debit_account_code text, p_credit_account_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing ledger_entries%ROWTYPE;
  v_debit ledger_accounts%ROWTYPE;
  v_credit ledger_accounts%ROWTYPE;
  v_entry ledger_entries%ROWTYPE;
  v_amount NUMERIC := ROUND(p_amount, 2);
  v_debit_delta NUMERIC;
  v_credit_delta NUMERIC;
BEGIN
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Ledger amount must be greater than zero';
  END IF;

  SELECT * INTO v_existing
    FROM ledger_entries
   WHERE external_reference = p_external_reference
     AND source = p_source
   LIMIT 1
   FOR UPDATE;
  IF FOUND THEN
    RETURN to_jsonb(v_existing) || jsonb_build_object('idempotent', true);
  END IF;

  SELECT * INTO v_debit FROM ledger_accounts WHERE code = p_debit_account_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Debit ledger account not found: %', p_debit_account_code; END IF;
  SELECT * INTO v_credit FROM ledger_accounts WHERE code = p_credit_account_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit ledger account not found: %', p_credit_account_code; END IF;

  INSERT INTO ledger_entries (
    transaction_id, external_reference, user_id, amount, currency,
    source, destination, status, description, entries, metadata
  ) VALUES (
    concat('LGR-', extract(epoch from clock_timestamp())::BIGINT, '-', substr(gen_random_uuid()::TEXT, 1, 8)),
    p_external_reference, p_user_id, v_amount, COALESCE(p_currency, 'KES'),
    p_source, p_destination, 'completed', p_description,
    jsonb_build_array(
      jsonb_build_object('account', v_debit.id, 'debit', v_amount, 'credit', 0),
      jsonb_build_object('account', v_credit.id, 'debit', 0, 'credit', v_amount)
    ),
    COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING * INTO v_entry;

  -- Assets/expenses increase on debit; liabilities/equity/revenue increase on credit.
  v_debit_delta := CASE WHEN v_debit.type IN ('asset','expense') THEN v_amount ELSE -v_amount END;
  v_credit_delta := CASE WHEN v_credit.type IN ('asset','expense') THEN -v_amount ELSE v_amount END;

  UPDATE ledger_accounts SET balance = balance + v_debit_delta, updated_at = now() WHERE id = v_debit.id;
  UPDATE ledger_accounts SET balance = balance + v_credit_delta, updated_at = now() WHERE id = v_credit.id;

  RETURN to_jsonb(v_entry) || jsonb_build_object('idempotent', false);
END;
$function$

