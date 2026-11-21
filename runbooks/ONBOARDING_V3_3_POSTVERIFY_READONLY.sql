-- ONBOARDING SCHEMA CHAIN v3 (CANDIDATE) — STEP 3: POST-APPLY VERIFICATION (READ-ONLY). Every row below must show ok = true.
select 'fn register_identity_atomic' chk, exists(select 1 from pg_proc where proname='kayad_register_identity_atomic' and pronamespace='public'::regnamespace) ok
union all select 'fn rotate_refresh_token', exists(select 1 from pg_proc where proname='kayad_rotate_refresh_token' and pronamespace='public'::regnamespace)
union all select 'fn sync_dealer_profile_from_user', exists(select 1 from pg_proc where proname='sync_dealer_profile_from_user' and pronamespace='public'::regnamespace)
union all select 'trigger dealer sync', exists(select 1 from pg_trigger where tgname='trg_sync_dealer_profile_from_user' and not tgisinternal)
union all select 'register RPC: service_role may execute', has_function_privilege('service_role','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','execute')
union all select 'register RPC: anon CANNOT execute', not has_function_privilege('anon','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','execute')
union all select 'register RPC: authenticated CANNOT execute', not has_function_privilege('authenticated','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','execute')
union all select 'rotate RPC: service_role may execute', has_function_privilege('service_role','public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)','execute')
union all select 'rotate RPC: anon CANNOT execute', not has_function_privilege('anon','public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)','execute')
union all select 'refresh_tokens.'||c, exists(select 1 from information_schema.columns where table_schema='public' and table_name='refresh_tokens' and column_name=c)
  from unnest(array['token_hash','family_id','session_id','replaced_by','revoked_at','revoke_reason','reuse_detected_at']) c
union all select 'refresh_tokens.token REMOVED', not exists(select 1 from information_schema.columns where table_schema='public' and table_name='refresh_tokens' and column_name='token')
union all select 'index uq_refresh_tokens_token_hash', to_regclass('public.uq_refresh_tokens_token_hash') is not null
union all select 'users.'||c, exists(select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name=c)
  from unnest(array['deactivated_at','granted_permissions','revoked_permissions','last_active']) c
union all select 'index uq_users_email_normalized', to_regclass('public.uq_users_email_normalized') is not null
union all select 'dealers.'||c, exists(select 1 from information_schema.columns where table_schema='public' and table_name='dealers' and column_name=c)
  from unnest(array['bio','payment_details','onboarding_complete','onboarding_completed_at']) c
union all select 'table inspector_applications', to_regclass('public.inspector_applications') is not null
union all select 'communication_deliveries.idempotency_key', exists(select 1 from information_schema.columns where table_schema='public' and table_name='communication_deliveries' and column_name='idempotency_key')
union all select 'index uq_communication_delivery_idempotency', to_regclass('public.uq_communication_delivery_idempotency') is not null
union all select 'status CHECK allows dead_letter', exists(select 1 from pg_constraint where conname='communication_deliveries_status_check' and pg_get_constraintdef(oid) like '%dead_letter%')
union all select 'RLS on refresh_tokens', (select relrowsecurity from pg_class where oid='public.refresh_tokens'::regclass)
union all select 'RLS on communication_deliveries', (select relrowsecurity from pg_class where oid='public.communication_deliveries'::regclass)
union all select 'no dealer user without dealers row', not exists(select 1 from public.users u where u.role='dealer' and not exists(select 1 from public.dealers d where d."user"=u.id))
union all select 'no normalized-email duplicates', not exists(select 1 from public.users group by lower(btrim(email)) having count(*)>1)
union all select 'rotate RPC: authenticated CANNOT execute', not has_function_privilege('authenticated','public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)','execute')
union all select 'rotate RPC: PUBLIC has no ACL entry', not exists(select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid='public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)'::regprocedure and a.grantee=0)
union all select 'register RPC: PUBLIC has no ACL entry', not exists(select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid='public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)'::regprocedure and a.grantee=0)
union all select 'no anon/authenticated DML on refresh_tokens', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='refresh_tokens' and grantee in ('anon','authenticated') and privilege_type in ('SELECT','INSERT','UPDATE','DELETE'))
union all select 'no anon/authenticated DML on user_auth', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='user_auth' and grantee in ('anon','authenticated') and privilege_type in ('SELECT','INSERT','UPDATE','DELETE'));
-- Next (application-level, needs authorization): GET /health/deep as admin must show checks.communications.schema = schema_ready.
