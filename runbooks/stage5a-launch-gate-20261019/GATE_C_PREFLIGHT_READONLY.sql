-- KAYAD STAGE 5A — GATE C PREFLIGHT. READ-ONLY (SELECT only). Safe to run on the hosted project with a read-only role.
-- It answers: "is the hosted schema compatible with the Stage 5A application?" Every row is expected to say OK after migration.
-- Do not paste results containing user data into tickets; this query returns only object names / counts.
WITH checks AS (
  SELECT 'rpc kayad_register_identity_atomic exists' AS check_name,
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='kayad_register_identity_atomic') AS ok
  UNION ALL SELECT 'rpc kayad_apply_dealer_verification_atomic exists',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='kayad_apply_dealer_verification_atomic')
  UNION ALL SELECT 'registration RPC NOT executable by anon/authenticated',
         NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, pg_roles r
                     WHERE n.nspname='public' AND p.proname='kayad_register_identity_atomic' AND r.rolname IN ('anon','authenticated')
                       AND has_function_privilege(r.oid,p.oid,'EXECUTE'))
  UNION ALL SELECT 'system_settings.key is unique/primary',
         EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid='public.system_settings'::regclass AND c.contype IN ('p','u') AND pg_get_constraintdef(c.oid) ILIKE '%(key)%')
  UNION ALL SELECT 'system_settings.updated_at exists (revision/CAS token)',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings' AND column_name='updated_at')
  UNION ALL SELECT 'RLS enabled on system_settings/users/cars/audit_logs',
         (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.system_settings'::regclass,'public.users'::regclass,'public.cars'::regclass,'public.audit_logs'::regclass))
  UNION ALL SELECT 'cars_status_check allows hidden and NOT rejected (Stage 5A supported state)',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cars_status_check' AND pg_get_constraintdef(oid) LIKE '%hidden%' AND pg_get_constraintdef(oid) NOT LIKE '%rejected%')
  UNION ALL SELECT 'users.status column exists', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='status')
  UNION ALL SELECT 'users.email_verified column exists', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email_verified')
  UNION ALL SELECT 'users.dealer_approved_at column exists', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='dealer_approved_at')
  UNION ALL SELECT 'user_auth.email_verify_token/expire exist',
         (SELECT count(*)=2 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_auth' AND column_name IN ('email_verify_token','email_verify_expire'))
  UNION ALL SELECT 'refresh_tokens session columns (session_id/family) exist (login/refresh/revocation)',
         (SELECT count(*)=2 FROM information_schema.columns WHERE table_schema='public' AND table_name='refresh_tokens' AND column_name IN ('session_id','family_id'))
  UNION ALL SELECT 'users security state columns (deactivated_at/granted_permissions/revoked_permissions/last_active) exist',
         (SELECT count(*)=4 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('deactivated_at','granted_permissions','revoked_permissions','last_active'))
  UNION ALL SELECT 'case-insensitive unique email index on users', EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='users' AND indexdef ILIKE '%lower(%email%' AND indexdef ILIKE '%unique%')
  UNION ALL SELECT 'dealers.approved column exists', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='dealers' AND column_name='approved')
  UNION ALL SELECT 'audit_logs actor/action columns exist',
         (SELECT count(*)>=2 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name IN ('action','actor_id','actor_name','actor_role'))
)
SELECT check_name, CASE WHEN ok IS TRUE THEN 'OK' ELSE 'MISSING' END AS result FROM checks ORDER BY result DESC, check_name;

-- Informational counts (no row contents):
SELECT 'users' AS t, count(*) AS n, count(*) FILTER (WHERE email_verified IS TRUE) AS verified FROM public.users;
SELECT 'onboarding_policy rows' AS t, count(*) AS n FROM public.system_settings WHERE key='onboarding_policy';
-- Migration history (run separately where the table exists):  SELECT count(*) FROM supabase_migrations.schema_migrations;
