\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
-- Emulate Supabase default privileges: functions in public are executable by anon/authenticated unless explicitly revoked.
GRANT EXECUTE ON FUNCTION kayad_append_support_message(uuid,uuid,text,text,boolean,jsonb) TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
insert into users(id,name,email,role,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Customer A','a@x.co','user','approved'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Customer B','b@x.co','user','approved')
 on conflict do nothing;
-- seed (as table owner) a ticket for A with one internal staff note
insert into support_tickets(id,user_id,category,subject,description,ticket_number,messages,message_count)
 values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','s','d','SUP-TEST-1',
 '[{"sender":"x","senderRole":"admin","content":"INTERNAL: suspect fraud, do not tell customer","isInternal":true},{"sender":"x","senderRole":"admin","content":"public reply","isInternal":false}]',2);

select 'B1 ticket creation without ticket_number (what createTicket does):';
savepoint s1;
insert into support_tickets(user_id,category,priority,subject,description) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium','x','y');
rollback to s1;

select 'B2 customer A reads own ticket row directly (RLS owner policy) -> internal note visible?';
begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}',true);
select messages::text like '%INTERNAL: suspect fraud%' as internal_note_visible_to_customer from support_tickets where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
commit;

select 'B3 customer B reads ticket of A directly -> rows visible:';
begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',true);
select count(*) from support_tickets where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'; commit;

select 'B4 customer B inserts a ticket directly with forged status/messages/assignee:';
begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',true);
insert into support_tickets(user_id,category,subject,description,ticket_number,status,messages,assigned_to) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','x','s','d','SUP-FORGED','closed','[{"content":"forged staff message","senderRole":"admin"}]','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select 'B4 result: inserted ' || count(*) from support_tickets where ticket_number='SUP-FORGED'; commit;

select 'B5 customer B calls the append RPC directly as an admin on A''s ticket (emulated Supabase function grant):';
begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',true);
select kayad_append_support_message('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','admin','forged staff reply',false,'[]'::jsonb) is not null as append_succeeded;
commit;
reset role;
select 'B6 after that: first_response_at set=' || (first_response_at is not null) || ' status=' || status from support_tickets where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select 'B7 ordinary customer reply with app role "dealer" (req.user.role) counts as staff first response:';
update support_tickets set first_response_at=null, status='open', messages='[]', message_count=0 where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select kayad_append_support_message('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dealer','customer asks a question',false,'[]'::jsonb) is not null;
select 'B7 result: first_response_at set=' || (first_response_at is not null) || ' status=' || status from support_tickets where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
