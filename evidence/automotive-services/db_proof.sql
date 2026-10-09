\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
begin;
insert into users(id,name,email,role,status) values ('11111111-1111-4111-8111-111111111111','Owner','o@x.co','user','approved') on conflict do nothing;
insert into inspection_providers(id,user_id,company_name,email,lifecycle_stage) values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Proof Garage','o@x.co','UNDER_REVIEW');
select 'T1 under_review => status/verification: ' || status || '/' || verification_status from inspection_providers where id='22222222-2222-4222-8222-222222222222';
update inspection_providers set lifecycle_stage='ACTIVE' where id='22222222-2222-4222-8222-222222222222';
select 'T2 ACTIVE => ' || status || '/' || verification_status from inspection_providers where id='22222222-2222-4222-8222-222222222222';
update inspection_providers set lifecycle_stage='SUSPENDED' where id='22222222-2222-4222-8222-222222222222';
select 'T3 SUSPENDED => ' || status || '/' || verification_status from inspection_providers where id='22222222-2222-4222-8222-222222222222';
select 'T4 eligible-for-search rows after suspend: ' || count(*) from inspection_providers where status='active' and verification_status='verified' and lifecycle_stage='ACTIVE' and id='22222222-2222-4222-8222-222222222222';
-- capability constraints
insert into provider_service_capabilities(provider_id,category_code,status) values ('22222222-2222-4222-8222-222222222222','diagnostics','declared');
select 'T5 capability insert ok';
savepoint a;
insert into provider_service_capabilities(provider_id,category_code,status) values ('22222222-2222-4222-8222-222222222222','diagnostics','declared');
rollback to a;
select 'T6 duplicate rejected (error above)';
savepoint b;
insert into provider_service_capabilities(provider_id,category_code,status) values ('22222222-2222-4222-8222-222222222222','diagnostics','trusted');
rollback to b;
select 'T7 invalid status rejected (error above)';
savepoint c;
insert into inspection_staff(provider_id,user_id,first_name,affiliation_status) values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','A','bogus');
rollback to c;
select 'T8 invalid affiliation_status rejected (error above)';
insert into inspection_staff(provider_id,user_id,first_name) values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','New');
select 'T8b new staff row default affiliation: ' || affiliation_status || ' active=' || is_active from inspection_staff where first_name='New';
rollback;
-- RLS / grants
select 'T9 RLS enabled on provider_service_capabilities: ' || relrowsecurity from pg_class where relname='provider_service_capabilities';
select 'T10 anon/authenticated privileges on table: ' || count(*) from information_schema.role_table_grants where table_name='provider_service_capabilities' and grantee in ('anon','authenticated','PUBLIC');
select 'T11 service_role privileges: ' || count(*) from information_schema.role_table_grants where table_name='provider_service_capabilities' and grantee='service_role';
select 'T12 registration RPC present: ' || count(*) from pg_proc where proname='kayad_create_inspection_provider_application';
