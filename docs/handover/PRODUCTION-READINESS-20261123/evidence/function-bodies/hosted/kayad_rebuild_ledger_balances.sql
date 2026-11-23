CREATE OR REPLACE FUNCTION public.kayad_rebuild_ledger_balances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE ledger_accounts SET balance = 0, updated_at = now();
  UPDATE ledger_accounts a
     SET balance = x.balance,
         updated_at = now()
    FROM (
      SELECT la.id,
             COALESCE(SUM(
               CASE
                 WHEN la.type IN ('asset','expense')
                   THEN COALESCE((line->>'debit')::NUMERIC,0) - COALESCE((line->>'credit')::NUMERIC,0)
                 ELSE COALESCE((line->>'credit')::NUMERIC,0) - COALESCE((line->>'debit')::NUMERIC,0)
               END
             ),0) AS balance
        FROM ledger_accounts la
        LEFT JOIN ledger_entries le ON true
        LEFT JOIN LATERAL jsonb_array_elements(le.entries) line ON (line->>'account')::UUID = la.id
       GROUP BY la.id
    ) x
   WHERE a.id = x.id;
END;
$function$

