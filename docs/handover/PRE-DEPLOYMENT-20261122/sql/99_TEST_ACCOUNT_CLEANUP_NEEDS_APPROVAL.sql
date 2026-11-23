-- HOSTED WRITE - needs separate approval. Removes ONLY the acceptance-test account(s) created during production acceptance.
-- Replace the placeholder with the exact test mailbox address you own. The guard aborts unless exactly the expected number of rows match.
-- Cascades (hosted FK rules, read 2026-11-22): user_auth, dealers, profiles, refresh_tokens = CASCADE; communication_deliveries.user_id = SET NULL
-- (delivery rows are kept for audit with the user link cleared); cars/leads = NO ACTION (a test account must own none, or the delete is refused).
BEGIN;
DO $g$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.users WHERE email = lower('REPLACE_WITH_TEST_MAILBOX@your-domain.example');
  IF n <> 1 THEN RAISE EXCEPTION 'Expected exactly 1 test account, found %', n; END IF;
  IF EXISTS (SELECT 1 FROM public.cars c JOIN public.users u ON u.id IN (c.dealer_id, c.deleted_by, c.highest_bidder_id) WHERE u.email = lower('REPLACE_WITH_TEST_MAILBOX@your-domain.example'))
     OR EXISTS (SELECT 1 FROM public.leads l JOIN public.users u ON u.id IN (l.buyer, l.dealer) WHERE u.email = lower('REPLACE_WITH_TEST_MAILBOX@your-domain.example')) THEN
    RAISE EXCEPTION 'Test account owns listings or leads; do not delete';
  END IF;
END $g$;
DELETE FROM public.users WHERE email = lower('REPLACE_WITH_TEST_MAILBOX@your-domain.example');
-- check the "DELETE 1" result, then:
COMMIT;
