\pset tuples_only on
\pset format unaligned
select 'FN', p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE')
 from pg_proc p cross join (select rolname from pg_roles where rolname in ('anon','authenticated','service_role')) r
 where p.proname like 'kayad%support%' order by 2,3;
select 'COLPRIV messages/resolution_notes/legacy/assigned', r.rolname, c.col, has_column_privilege(r.rolname,'support_tickets',c.col,'SELECT')
 from (select rolname from pg_roles where rolname in ('anon','authenticated')) r cross join (values ('messages'),('resolution_notes'),('legacy_resolution_notes'),('assigned_to'),('sla'),('subject'),('satisfaction_comment')) c(col);
select 'TABLEPRIV', r.rolname, has_table_privilege(r.rolname,'support_tickets','SELECT'), has_table_privilege(r.rolname,'support_tickets','INSERT'), has_table_privilege(r.rolname,'support_tickets','UPDATE'), has_table_privilege(r.rolname,'support_tickets','DELETE')
 from pg_roles r where rolname in ('anon','authenticated','service_role');
select 'VIEWS/MATVIEWS referencing support_tickets', count(*) from pg_depend d join pg_rewrite w on w.oid=d.objid join pg_class c on c.oid=w.ev_class where d.refobjid='support_tickets'::regclass and c.relkind in ('v','m');
select 'OTHER FUNCS reading support_tickets.messages', proname from pg_proc where prosrc ilike '%support_tickets%' and proname not like 'kayad_support_%' and pronamespace='public'::regnamespace;
select 'policies', policyname, cmd, roles from pg_policies where tablename='support_tickets';
select 'rls', relrowsecurity from pg_class where relname='support_tickets';
select 'is_staff_user: agent / admin / customer', kayad_support_is_staff_user('dddddddd-dddd-4ddd-8ddd-dddddddddddd'), kayad_support_is_staff_user('ffffffff-ffff-4fff-8fff-ffffffffffff'), kayad_support_is_staff_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select 'create invalid category', 1;
select kayad_support_create_case('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bogus','medium','s','d','{}','k9','{}');
select kayad_support_create_case('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium',repeat('x',201),'d','{}','k10','{}');
select 'create ok', (kayad_support_create_case('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium','s','d','{}','k11','{}'))->>'ticket_number';
