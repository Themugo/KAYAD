\set ON_ERROR_STOP off
\pset pager off
begin;
insert into users(id,email,name,role,status) values
 ('11111111-1111-4111-8111-111111111111','owner@t.test','Owner','dealer','approved'),
 ('22222222-2222-4222-8222-222222222222','member@t.test','Member','user','approved'),
 ('33333333-3333-4333-8333-333333333333','other@t.test','Other','dealer','approved');
insert into dealer_teams(id,dealer,member,role,permissions,status,invite_email,invited_by) values
 ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','sales_agent','{"canListCars":true}','active','member@t.test','11111111-1111-4111-8111-111111111111');
commit;
-- MEMBER session via authenticated role
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
\echo T1 member self-promote role (expect UPDATE 0)
update dealer_teams set role='manager' where id='aaaaaaaa-0000-4000-8000-000000000001';
\echo T2 member self-grant permissions (expect UPDATE 0)
update dealer_teams set permissions='{"canManageTeam":true}' where id='aaaaaaaa-0000-4000-8000-000000000001';
\echo T3 member re-point organisation (expect UPDATE 0)
update dealer_teams set dealer='33333333-3333-4333-8333-333333333333' where id='aaaaaaaa-0000-4000-8000-000000000001';
\echo T4 member reactivate/status (expect UPDATE 0)
update dealer_teams set status='suspended' where id='aaaaaaaa-0000-4000-8000-000000000001';
\echo T5 member delete own row (expect DELETE 0)
delete from dealer_teams where id='aaaaaaaa-0000-4000-8000-000000000001';
\echo T6 member insert self into org (expect RLS error)
insert into dealer_teams(dealer,member,role,status,invite_email,invited_by) values ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','manager','active','x@t.test','22222222-2222-4222-8222-222222222222');
\echo T7 member can read own row only (expect 1)
select count(*) from dealer_teams;
-- OTHER dealer session
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
\echo T8 other dealer cannot see or change owner team (expect 0 / UPDATE 0 / DELETE 0)
select count(*) from dealer_teams;
update dealer_teams set role='viewer' where id='aaaaaaaa-0000-4000-8000-000000000001';
delete from dealer_teams where id='aaaaaaaa-0000-4000-8000-000000000001';
-- anon
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
\echo T9 anon sees nothing (expect 0) / cannot update
select count(*) from dealer_teams;
update dealer_teams set role='manager';
-- OWNER session
reset role; set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
\echo T10 owner changes role (expect UPDATE 1)
update dealer_teams set role='viewer' where id='aaaaaaaa-0000-4000-8000-000000000001';
\echo T11 owner cannot move row to another org (expect UPDATE 1? dealer=other must fail check)
update dealer_teams set dealer='33333333-3333-4333-8333-333333333333' where id='aaaaaaaa-0000-4000-8000-000000000001';
\echo T12 owner removes member (expect UPDATE 1)
update dealer_teams set status='removed' where id='aaaaaaaa-0000-4000-8000-000000000001';
reset role;
select role,status,dealer from dealer_teams;
