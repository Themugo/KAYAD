-- READ-ONLY FIN-LEDGER-1 dry run.
-- Execute in the authorized target environment before the signed-balance
-- migration/rebuild window. This query performs no writes.
-- Compare stored_balance with signed_balance and normal_balance. Review every
-- difference and investigate reversals before authorizing a rebuild.

WITH account_journal AS (
  SELECT
    account.id AS account_id,
    account.code,
    account.name,
    account.type,
    COALESCE(account.balance, 0)::numeric AS stored_balance,
    COALESCE(SUM(
      COALESCE((line->>'debit')::numeric, 0)
      - COALESCE((line->>'credit')::numeric, 0)
    ), 0)::numeric AS signed_balance,
    COALESCE(SUM(
      CASE
        WHEN account.type IN ('asset', 'expense')
          THEN COALESCE((line->>'debit')::numeric, 0) - COALESCE((line->>'credit')::numeric, 0)
        ELSE COALESCE((line->>'credit')::numeric, 0) - COALESCE((line->>'debit')::numeric, 0)
      END
    ), 0)::numeric AS normal_balance
  FROM public.ledger_accounts AS account
  LEFT JOIN public.ledger_entries AS entry ON TRUE
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(entry.entries, '[]'::jsonb)) AS line
    ON (line->>'account')::uuid = account.id
  GROUP BY account.id, account.code, account.name, account.type, account.balance
)
SELECT
  account_id,
  code,
  name,
  type,
  stored_balance,
  signed_balance,
  normal_balance,
  ROUND(stored_balance - signed_balance, 2) AS stored_minus_signed,
  ROUND(stored_balance - normal_balance, 2) AS stored_minus_normal,
  ROUND(signed_balance - normal_balance, 2) AS convention_delta
FROM account_journal
ORDER BY code;
