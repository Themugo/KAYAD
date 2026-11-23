\pset format unaligned
\pset tuples_only on
\pset fieldsep '\t'
select 'COL', c.relname, a.attname, format_type(a.atttypid,a.atttypmod), a.attnotnull::int, coalesce(pg_get_expr(d.adbin,d.adrelid),''), a.attidentity::text, a.attgenerated::text
 from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
 where n.nspname='public' and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped order by 2,3;
select 'CON', c.relname, co.conname, co.contype::text, replace(pg_get_constraintdef(co.oid),E'\n',' ')
 from pg_constraint co join pg_class c on c.oid=co.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by 2,3;
select 'IDX', tablename, indexname, replace(replace(indexdef,'public.',''),E'\n',' ') from pg_indexes where schemaname='public' order by 2,3;
select 'FN', p.proname||'('||pg_get_function_identity_arguments(p.oid)||')', pg_get_function_result(p.oid), (select lanname from pg_language where oid=p.prolang), p.provolatile::text, p.prosecdef::int, coalesce(array_to_string(p.proconfig,','),''), pg_get_userbyid(p.proowner), coalesce(p.proacl::text,''), md5(regexp_replace(p.prosrc,'\s+','','g'))
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 2;
select 'TRG', c.relname, t.tgname, t.tgenabled::text, replace(pg_get_triggerdef(t.oid),E'\n',' ') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by 2,3;
select 'POL', tablename, policyname, cmd, roles::text, coalesce(qual,''), coalesce(with_check,'') from pg_policies where schemaname='public' order by 2,3;
select 'RLS', c.relname, c.relrowsecurity::int, c.relforcerowsecurity::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by 2;
select 'ACL', c.relname, coalesce(c.relacl::text,'') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','S','v') order by 2;
select 'SEQ', c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='S' order by 2;
