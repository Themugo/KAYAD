-- Behavioural assertions for the onboarding schema chain (LOCAL REHEARSAL ONLY). Safe to re-run: it rolls back its own writes via a failing savepoint-free DO block only on error;
-- on success it leaves rows in the throwaway database. Use a fresh database per rehearsal.
\set ON_ERROR_STOP on
set role service_role;
do $$
declare r jsonb; n int; v_uid uuid; v_fam uuid; v_sess uuid; res jsonb;
begin
 select count(*) into n from dealers; assert n>=2, 'A1 dealers backfill expected >=2 got '||n;
 r := kayad_register_identity_atomic('Cust One','  Cust.One@Example.TEST ','user','+254700000001',null,null,null,'bcrypt-hash','vt-hash',now()+interval '1 day');
 assert r->>'email'='cust.one@example.test', 'B1 email normalised'; assert r->>'status'='approved','B1 status approved';
 select count(*) into n from user_auth where user_id=(r->>'id')::uuid and email_verify_token='vt-hash'; assert n=1,'B1 user_auth row';
 select count(*) into n from profiles where id=(r->>'id')::uuid; assert n=1,'B1 profile trigger';
 r := kayad_register_identity_atomic('Dealer New','dealer.new@example.test','dealer',null,'New Motors','Nairobi',null,'h','v',now()+interval '1 day');
 assert r->>'status'='pending','B2 dealer pending'; select count(*) into n from dealers where "user"=(r->>'id')::uuid and business_name='New Motors'; assert n=1,'B2 dealers trigger row';
 select count(*) into n from users;
 begin
   perform kayad_register_identity_atomic('Dup','CUST.ONE@example.test ','user',null,null,null,null,'h','v',now()+interval '1 day');
   assert false,'B3 duplicate should have failed';
 exception when unique_violation then null; end;
 assert (select count(*) from users)=n,'B3 no orphan users'; assert (select count(*) from user_auth)=n,'B3 no orphan user_auth (atomic)';
 begin perform kayad_register_identity_atomic('X','x@example.test','admin',null,null,null,null,'h','v',now()+interval '1 day'); assert false,'B4 admin should fail';
 exception when sqlstate '22023' then null; end;
 assert (select count(*) from users where email='x@example.test')=0,'B4 nothing written';
 select id into v_uid from users where email='cust.one@example.test'; v_fam:=gen_random_uuid(); v_sess:=gen_random_uuid();
 insert into refresh_tokens("user",token_hash,token_version,family_id,session_id,expires_at) values (v_uid,'t1',0,v_fam,v_sess,now()+interval '30 days');
 res := kayad_rotate_refresh_token('t1','t2',v_uid,0,v_fam,'d','ua','ip',now()+interval '30 days',gen_random_uuid());
 assert res->>'status'='rotated','C1 rotated'; assert (res->>'session_id')::uuid=v_sess,'C1 session id preserved';
 assert (select is_revoked from refresh_tokens where token_hash='t1'),'C1 old revoked'; assert not (select is_revoked from refresh_tokens where token_hash='t2'),'C1 new active';
 res := kayad_rotate_refresh_token('t2','t3',v_uid,0,v_fam,'d','ua','ip',now()+interval '30 days',gen_random_uuid());
 assert res->>'status'='rotated','C2 second rotation';
 res := kayad_rotate_refresh_token('t1','t9',v_uid,0,v_fam,'d','ua','ip',now()+interval '30 days',gen_random_uuid());
 assert res->>'status'='reuse_detected','C3 replay detected';
 assert (select count(*) from refresh_tokens where family_id=v_fam and not is_revoked)=0,'C3 family revoked';
 assert (select count(*) from refresh_tokens where token_hash='t9')=0,'C3 no new token minted on replay';
 assert (kayad_rotate_refresh_token('nope','n2',v_uid,0,null,'d','ua','ip',now()+interval '1 day',gen_random_uuid()))->>'status'='not_found','C4 not_found';
 insert into refresh_tokens("user",token_hash,token_version,family_id,session_id,expires_at) values (v_uid,'v1',0,gen_random_uuid(),gen_random_uuid(),now()+interval '1 day');
 assert (kayad_rotate_refresh_token('v1','v2',v_uid,5,null,'d','ua','ip',now()+interval '1 day',gen_random_uuid()))->>'status'='reuse_detected','C5 version mismatch';
 insert into refresh_tokens("user",token_hash,token_version,family_id,session_id,expires_at) values (v_uid,'e1',0,gen_random_uuid(),gen_random_uuid(),now()-interval '1 second');
 assert (kayad_rotate_refresh_token('e1','e2',v_uid,0,null,'d','ua','ip',now()+interval '1 day',gen_random_uuid()))->>'status'='reuse_detected','C6 expired treated as reuse';
 assert not exists(select 1 from information_schema.columns where table_name='refresh_tokens' and column_name='token'),'C7 token column dropped';
 assert (select count(*) from refresh_tokens where token_hash=encode(digest('legacy-token-1','sha256'),'hex'))=1,'C8 legacy plaintext token was hashed by backfill';
 insert into communication_deliveries(provider,channel,status,event_type,idempotency_key) values ('brevo','email','queued','account.email_verification','k1');
 begin insert into communication_deliveries(provider,channel,status,event_type,idempotency_key) values ('brevo','email','queued','account.email_verification','k1'); assert false,'D1 dup key must fail';
 exception when unique_violation then null; end;
 insert into communication_deliveries(channel,status,event_type) values ('email','queued','x'),('email','queued','y');
 insert into communication_deliveries(provider,channel,status,event_type,idempotency_key) values ('brevo','email','dead_letter','x','k2');
 begin insert into communication_deliveries(channel,status,event_type) values ('email','bogus','x'); assert false,'D2 bogus status must fail';
 exception when check_violation then null; end;
 assert (select granted_permissions='{}' and revoked_permissions='{}' and deactivated_at is null from users where id=v_uid),'E1 defaults';
 raise notice 'ALL ASSERTIONS PASSED';
end $$;
reset role;
select has_function_privilege('anon','kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','execute') anon_reg,
       has_function_privilege('authenticated','kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','execute') auth_reg,
       has_function_privilege('service_role','kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','execute') svc_reg,
       has_function_privilege('anon','kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)','execute') anon_rot,
       has_function_privilege('service_role','kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)','execute') svc_rot;
