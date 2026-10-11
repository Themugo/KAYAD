-- KAYAD — READ-ONLY financial / role state preflight. AGGREGATES ONLY (no names, phones, receipts or amounts per person).
-- Run inside a read-only transaction by an authorised operator BEFORE applying 20261011120000/121000 and BEFORE deploying the
-- security-payment code change:   BEGIN READ ONLY; \i PREFLIGHT_FINANCIAL_AND_ROLE_STATE.sql ; ROLLBACK;
-- Context: docs/audits/13-FINANCIAL-SCHEMA-INTEGRITY-20261011.md, docs/audits/14-PRODUCTION-READINESS-BLOCKERS-20261011.md.

-- 1. Does an out-of-band `transactions` table exist, and does it hold IN-FLIGHT security payments (pending)?
--    If present, the new code still settles them (legacy fallback); new rows are written to payments.
SELECT 'transactions_table_present' AS check, (to_regclass('public.transactions') IS NOT NULL)::text AS value
UNION ALL
SELECT 'payments_pending_security', count(*)::text FROM public.payments WHERE type IN ('bid_commitment','bid_security') AND status = 'pending'
UNION ALL
SELECT 'payments_success_security', count(*)::text FROM public.payments WHERE type IN ('bid_commitment','bid_security') AND status = 'success'
UNION ALL
-- holds that point at a checkout whose payment row does not exist in payments (would rely on the legacy table)
SELECT 'holds_without_payments_row', count(*)::text FROM public.auction_security_holds h
 WHERE h.checkout_request_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.checkout_request_id = h.checkout_request_id)
UNION ALL
-- 2. Webhooks that were recorded but never marked processed (FIN-CB-1 left successful security callbacks unprocessed)
SELECT 'mpesa_webhooks_unprocessed', count(*)::text FROM public.webhook_events WHERE event_source = 'mpesa_daraja' AND processed = false
UNION ALL
-- 3. Escrow cron DRY-RUN (FIN-1): what WOULD be auto-released if the dormant cron were switched on today.
SELECT 'escrows_delivered_older_than_3d', count(*)::text FROM public.escrows WHERE status = 'delivered' AND "deliveredAt" <= now() - interval '3 days'
UNION ALL
SELECT 'escrows_funded_or_confirmed_older_than_7d', count(*)::text FROM public.escrows WHERE status IN ('funded','vehicle_confirmed') AND "createdAt" <= now() - interval '7 days'
UNION ALL
SELECT 'escrows_warning_column', CASE
  WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='escrows' AND column_name='warningSent') THEN 'warningSent'
  WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='escrows' AND column_name='warning_sent') THEN 'warning_sent (cron is ACTIVE on this database!)'
  ELSE 'none' END
UNION ALL
-- 4. profiles.role drift (SCH-PROFILES-1): rows the 121000 migration would realign to users.role
SELECT 'profiles_role_mismatch', count(*)::text FROM public.profiles p JOIN public.users u ON u.id = p.id WHERE p.role IS DISTINCT FROM u.role
UNION ALL
SELECT 'profiles_role_admin_but_user_not_admin', count(*)::text FROM public.profiles p JOIN public.users u ON u.id = p.id
 WHERE p.role IN ('admin','superadmin') AND u.role NOT IN ('admin','superadmin')
UNION ALL
-- 5. Outbox health, if the outbox migration is applied
SELECT 'chat_outbox_stats', CASE WHEN to_regprocedure('public.kayad_chat_outbox_stats()') IS NULL THEN 'not applied'
  ELSE (SELECT public.kayad_chat_outbox_stats()::text) END;
