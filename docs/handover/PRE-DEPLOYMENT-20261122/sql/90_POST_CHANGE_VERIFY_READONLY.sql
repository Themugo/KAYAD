-- READ-ONLY. Run right after the apply. Every row of the last result set must say ok = true.
with f as (select p.* from pg_proc p where p.proname = 'kayad_register_identity_atomic'),
acl as (select a.grantee::regrole::text as grantee, a.privilege_type from f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a)
select 'one function with the expected signature' as check_name,
       (select count(*) from f) = 1 and (select oid::regprocedure::text from f) = 'kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamp with time zone)' as ok
union all select 'not a placeholder', (select not (pg_get_functiondef(oid) ~ 'Other function logic|Remaining registration logic') from f)
union all select 'creates users and user_auth rows and returns the user', (select pg_get_functiondef(oid) ilike '%INSERT INTO public.users%' and pg_get_functiondef(oid) ilike '%INSERT INTO public.user_auth%' and pg_get_functiondef(oid) ilike '%RETURN to_jsonb(v_user)%' from f)
union all select 'security definer with pinned search_path=public', (select prosecdef and proconfig = array['search_path=public'] from f)
union all select 'owner is postgres', (select pg_get_userbyid(proowner) = 'postgres' from f)
union all select 'service_role may execute', (select has_function_privilege('service_role', oid, 'EXECUTE') from f)
union all select 'anon may NOT execute', (select not has_function_privilege('anon', oid, 'EXECUTE') from f)
union all select 'authenticated may NOT execute', (select not has_function_privilege('authenticated', oid, 'EXECUTE') from f)
union all select 'PUBLIC has no execute (only postgres and service_role in the ACL)', (select count(*) = 0 from acl where grantee not in ('postgres','service_role'))
union all select 'row counts unchanged by the apply (compare with the snapshot)', true;
select grantee, privilege_type from (select a.grantee::regrole::text grantee, a.privilege_type from pg_proc p, aclexplode(p.proacl) a where p.proname='kayad_register_identity_atomic') x order by 1;
