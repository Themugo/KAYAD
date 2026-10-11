-- KAYAD FIN-LEDGER-1: converge balance rebuilding on the signed convention.
-- Convention: every journal line contributes debit - credit to the account
-- balance. This matches the current repository posting/reversal RPCs and the
-- application's trial-balance reporting. Do not invoke this function as part
-- of migration replay: operators must first run the read-only dry-run diff,
-- pause financial posting in the approved change window, then rebuild once.

CREATE OR REPLACE FUNCTION public.kayad_rebuild_ledger_balances()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Prevent two operators from running competing rebuilds at the same time.
  PERFORM pg_advisory_xact_lock(hashtext('kayad-ledger-balance-rebuild'));

  UPDATE public.ledger_accounts AS account
     SET balance = derived.signed_balance,
         updated_at = now()
    FROM (
      SELECT
        la.id,
        COALESCE(SUM(
          COALESCE((line->>'debit')::NUMERIC, 0)
          - COALESCE((line->>'credit')::NUMERIC, 0)
        ), 0) AS signed_balance
      FROM public.ledger_accounts AS la
      LEFT JOIN public.ledger_entries AS entry ON TRUE
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(entry.entries, '[]'::jsonb)) AS line
        ON (line->>'account')::UUID = la.id
      GROUP BY la.id
    ) AS derived
   WHERE account.id = derived.id;
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_rebuild_ledger_balances() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_rebuild_ledger_balances() TO service_role;

COMMENT ON FUNCTION public.kayad_rebuild_ledger_balances() IS
  'Rebuilds ledger_accounts.balance from immutable journal lines using signed debit-positive/credit-negative balances; run only after a read-only diff and during a controlled financial-write pause.';
