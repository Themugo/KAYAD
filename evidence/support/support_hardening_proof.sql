\set ON_ERROR_STOP off
\pset tuples_only on
\pset format unaligned
-- emulate Supabase default function privileges before our migration's explicit revokes are verified
insert into users(id,name,email,role,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Customer A','a@x.co','user','approved'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Customer B','b@x.co','user','approved'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Agent','agent@x.co','technical_support','approved'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Mkt','mkt@x.co','marketing','approved') on conflict do nothing;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

select 'P1 create without ticket_number -> generated';
select (kayad_support_create_case('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium','Subject','Desc','{}','key-1','{}')) ->> 'ticket_number' ~ '^SUP-[0-9]{8}-[0-9]{6}$' as ok;
select 'P2 same idempotency key -> deduplicated, one row';
select (kayad_support_create_case('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium','Subject','Desc','{}','key-1','{}')) ->> 'deduplicated' as dedup, (select count(*) from support_tickets where idempotency_key='key-1') as rows;
select id as tid from support_tickets where idempotency_key='key-1' \gset

select 'P3 customer cannot be staff-first-response: customer reply keeps first_response_at null';
select (kayad_support_append_message(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer','my question',false,14)) ->> 'status' as status, first_response_at is null as no_first_response from support_tickets where id=:'tid';
select 'P4 staff internal note is not a first response';
select (kayad_support_append_message(:'tid','dddddddd-dddd-4ddd-8ddd-dddddddddddd','staff','INTERNAL fraud suspected',true,14)) ->> 'status' as status, first_response_at is null as no_first_response from support_tickets where id=:'tid';
select 'P5 staff public reply sets first response and moves open->in_progress';
select (kayad_support_append_message(:'tid','dddddddd-dddd-4ddd-8ddd-dddddddddddd','staff','We are looking',false,14)) ->> 'status' as status, first_response_at is not null as first_response from support_tickets where id=:'tid';
select 'P6 customer B cannot append to A ticket';
select kayad_support_append_message(:'tid','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','customer','hi',false,14);
select 'P7 customer cannot post internal';
select kayad_support_append_message(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer','x',true,14);

select 'P8 invalid transition open->closed rejected (set to open first)';
update support_tickets set status='open' where id=:'tid';
select kayad_support_update_case(:'tid','dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,'closed');
select 'P9 resolve without note rejected';
select kayad_support_update_case(:'tid','dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,'resolved');
select 'P10 assignee must be active support staff (marketing user rejected)';
select kayad_support_update_case(:'tid','dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,null,null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
select 'P11 stale row_version rejected';
select kayad_support_update_case(:'tid','dddddddd-dddd-4ddd-8ddd-dddddddddddd',999,'in_progress');
select 'P12 valid assign + resolve with note, audit row written';
select kayad_support_update_case(:'tid','dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,'resolved',null,'dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,'Refund guidance given') ->> 'status';
select count(*) as audit_rows from audit_logs where entity_id=:'tid' and action='support.case_updated';
select 'P13 rating: owner only, 1..5, once';
select kayad_support_rate_case(:'tid','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',5,'x');
select kayad_support_rate_case(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',9,'x');
select kayad_support_rate_case(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',4,'good') ->> 'rating';
select kayad_support_rate_case(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',2,'again');
select 'P13b rating text did not touch staff resolution_notes';
select resolution_notes, satisfaction_comment from support_tickets where id=:'tid';
select 'P14 customer reply inside window reopens; outside window rejected';
select (kayad_support_append_message(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer','still broken',false,14)) ->> 'reopened';
update support_tickets set status='resolved', resolved_at=now()-interval '20 days' where id=:'tid';
select kayad_support_append_message(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer','late',false,14);
select 'P15 closed rejects replies';
update support_tickets set status='closed' where id=:'tid';
select kayad_support_append_message(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer','late',false,14);
select 'P16 legacy RPC is inert';
select kayad_append_support_message(:'tid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin','forge',false,'[]');

select 'P17 authenticated cannot EXECUTE support RPCs (direct PostgREST call)';
begin; set local role authenticated;
select kayad_support_append_message(:'tid','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','staff','forged staff',false,14);
rollback;
begin; set local role anon; select kayad_support_create_case('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium','s','d'); rollback;
select 'P18 authenticated cannot SELECT messages column directly';
begin; set local role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true) is not null as claims;
select messages from support_tickets where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
rollback;
select 'P19 authenticated owner can SELECT safe columns, other customer sees nothing';
begin; set local role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true) is not null as claims;
select count(*) as own_rows from support_tickets where id=:'tid'; rollback;
begin; set local role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true) is not null as claims;
select count(*) as other_rows from support_tickets where id=:'tid'; rollback;
select 'P20 authenticated direct INSERT/UPDATE denied';
begin; set local role authenticated; insert into support_tickets(user_id,subject,description) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','s','d'); rollback;
begin; set local role authenticated; update support_tickets set status='closed' where id=:'tid'; rollback;
select 'P21 metrics';
select kayad_support_metrics(now()-interval '30 days', null, null) ->> 'total' as total, kayad_support_metrics(now()-interval '30 days', 60, null) -> 'firstResponseWithinTarget' as within, kayad_support_metrics(now()-interval '30 days', null, null) -> 'firstResponseWithinTarget' as within_unconfigured;
