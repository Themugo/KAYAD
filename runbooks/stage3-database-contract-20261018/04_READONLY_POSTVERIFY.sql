-- KAYAD Stage 3 — READ-ONLY post-verification after an APPROVED apply of 02/03 (and the existing identity chain).
BEGIN TRANSACTION READ ONLY;
SELECT count(*) FILTER (WHERE column_name IN ('actor','target','target_model','admin','admin_id','user_id','metadata','old_value','new_value')) AS g1_columns_present_expect_9
FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs';
SELECT pg_get_constraintdef(oid) LIKE '%rejected%' AS g2_rejected_allowed, convalidated FROM pg_constraint
WHERE conrelid='public.cars'::regclass AND conname='cars_status_check';
SELECT has_function_privilege('anon','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','EXECUTE') AS anon_can_register_expect_false,
       has_function_privilege('authenticated','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','EXECUTE') AS auth_can_register_expect_false,
       has_function_privilege('service_role','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','EXECUTE') AS service_can_register_expect_true;
ROLLBACK;
-- Then, with the matching backend on STAGING only: governance create (expect 200 + one audit row),
-- admin kill-switch (expect 200), access-denied (expect 403, not 500), moderation reject (expect 200, status 'rejected').
