-- READ-ONLY. Run before any change. Save the output with the change record.
-- EXPECTED on 2026-11-22 (read by KAYARD KE review): md5 = f414d98a357862f9270796a4965d6900, length 709, acl {postgres=X/postgres,service_role=X/postgres}.
-- If md5 differs, STOP: someone changed the function after this review; re-review before applying.
select current_database() as db, current_setting('server_version') as pg_version, now() as taken_at;
select p.oid::regprocedure as signature,
       pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer, p.proconfig, p.proacl::text as acl,
       md5(pg_get_functiondef(p.oid)) as def_md5, length(pg_get_functiondef(p.oid)) as def_len,
       (pg_get_functiondef(p.oid) ~ 'Other function logic|Remaining registration logic') as is_placeholder
  from pg_proc p where p.proname = 'kayad_register_identity_atomic';
select pg_get_functiondef(p.oid) as full_definition_to_keep from pg_proc p where p.proname = 'kayad_register_identity_atomic';
select (select count(*) from public.users) users, (select count(*) from public.user_auth) user_auth,
       (select count(*) from public.dealers) dealers, (select count(*) from public.profiles) profiles;
select to_regclass('public.private_seller_capabilities') as private_seller_capabilities_present;
