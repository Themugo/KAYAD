delete from support_tickets;
insert into users(id,name,email,role,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Customer A','a@x.co','user','approved'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Customer B','b@x.co','user','approved'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Agent','agent@x.co','technical_support','approved'),
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','Adm','adm@x.co','admin','approved') on conflict do nothing;
insert into support_tickets(id,user_id,category,priority,subject,description,status,ticket_number,satisfaction_rating,resolution_notes,messages,resolved_at) values
 ('10000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium','rated w/ comment','d','resolved','T-1',5,'Great service!', '[{"id":"m1","sender":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","senderRole":"user","content":"hi","isInternal":false},{"id":"m2","sender":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","senderRole":"technical_support","content":"INTERNAL","isInternal":true}]', now()),
 ('10000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','escrow','medium','rated no comment','d','closed','T-2',3,NULL,'[]',now()),
 ('10000000-0000-4000-8000-000000000003','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','auction','high','staff note unrated','d','resolved','T-3',NULL,'Staff: refunded',  '[]',now()),
 ('10000000-0000-4000-8000-000000000004','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','legacy-weird-cat','low','unknown cat','d','open','T-4',NULL,NULL,'[]',NULL),
 ('10000000-0000-4000-8000-000000000005','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',NULL,'low',repeat('s',300),repeat('d',6000),'open','T-5',NULL,NULL,'[]',NULL);
