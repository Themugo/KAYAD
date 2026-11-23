CREATE OR REPLACE FUNCTION public.kayad_rebuild_ledger_balances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$

