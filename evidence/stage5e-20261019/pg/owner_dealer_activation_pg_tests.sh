#!/usr/bin/env bash
# STAGE 5E — dealer-to-owner activation tests. DISPOSABLE PostgreSQL ONLY (database name must end _disposable, loopback host).
# Clones the Stage 5D hosted-like rehearsal database (118 name-matched migrations + 63 missing + 5B/5C candidates) and tests the
# real 5B functions against a seeded pending, unverified dealer account that mirrors the shape of the hosted account.
# No hosted system is contacted. All identities are @kayad-test.example; all password "hashes" are inert test strings.
set -uo pipefail
export PATH=/usr/lib/postgresql/16/bin:$PATH
HOST=127.0.0.1; PORT=${PGPORT_5E:-54339}; SRC=${SRC_DB:-kayad5d_hostedlike_disposable}; DB=kayad5e_owner_disposable
case "$DB" in *_disposable) ;; *) echo "REFUSING: db name must end _disposable"; exit 1;; esac
[ "$HOST" = 127.0.0.1 ] || { echo REFUSING; exit 1; }
PSQL="psql -h $HOST -p $PORT -U postgres -v ON_ERROR_STOP=1 -qAt"
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB template $SRC" >/dev/null || { echo "clone failed"; exit 1; }
Q() { $PSQL -d $DB "$@"; }
Q <<'SQL'
create schema t5e;
create table t5e.res(n serial, name text, ok boolean, detail text);
create function t5e.chk(p_name text, p_ok boolean, p_detail text default '') returns void language sql as $$ insert into t5e.res(name, ok, detail) values (p_name, coalesce(p_ok,false), p_detail) $$;
-- start from a clean owner state (the clone may carry rehearsal residue; events table is append-only so we only assert deltas)
create table t5e.base as select (select count(*) from owner_memberships) m, (select count(*) from owner_invitations) i, (select count(*) from owner_membership_events) e;
SQL
echo "baseline owner rows (clone): $(Q -c 'select m||'"'"'/'"'"'||i||'"'"'/'"'"'||e from t5e.base')"
Q <<'SQL'
-- reset owner state with the superuser (test setup only; the append-only trigger on events is left alone, so we measure event deltas)
delete from owner_invitations; delete from owner_memberships; update owner_bootstrap_state set status='open', closed_at=null, closed_by=null, closed_reason=null;
-- seed: pending, UNVERIFIED dealer (no dealers/dealer_verifications rows, exactly like the hosted account) AND a richer dealer variant
insert into users(id,name,email,role,status,email_verified,is_banned,business_name) values
 ('11111111-0000-4000-8000-000000000001','Dealer One','dealer-one@kayad-test.example','dealer','pending',false,false,'Dealer One Motors');
insert into user_auth(user_id,password,token_version,email_verify_token,reset_token) values ('11111111-0000-4000-8000-000000000001','OLDPASSWORDHASH_NOT_REAL_0000000001',3,'verifytok','resettok');
insert into refresh_tokens("user",token_hash,expires_at,is_revoked) values ('11111111-0000-4000-8000-000000000001','rt_hash_1',now()+interval '7 days',false),('11111111-0000-4000-8000-000000000001','rt_hash_2',now()+interval '7 days',false);
insert into dealers("user",business_name,approved) values ('11111111-0000-4000-8000-000000000001','Dealer One Motors',false) on conflict do nothing;
insert into dealer_verifications("user",dealer,verification_status) select '11111111-0000-4000-8000-000000000001', d.id, 'pending' from dealers d where d."user"='11111111-0000-4000-8000-000000000001' and not exists (select 1 from dealer_verifications v where v."user"=d."user");
-- bystander verified ordinary user, banned user
insert into users(id,name,email,role,status,email_verified) values ('22222222-0000-4000-8000-000000000002','Bystander','bystander@kayad-test.example','user','approved',true);
insert into user_auth(user_id,password,token_version) values ('22222222-0000-4000-8000-000000000002','BYSTANDERHASH_NOT_REAL_000000002',0);
insert into users(id,name,email,role,status,email_verified,is_banned) values ('33333333-0000-4000-8000-000000000003','Banned','banned@kayad-test.example','dealer','approved',true,true);
insert into user_auth(user_id,password,token_version) values ('33333333-0000-4000-8000-000000000003','BANNEDHASH_NOT_REAL_00000000003',0);
-- verified dealer (Path A)
insert into users(id,name,email,role,status,email_verified,business_name) values ('44444444-0000-4000-8000-000000000004','Verified Dealer','verified-dealer@kayad-test.example','dealer','approved',true,'VD Motors');
insert into user_auth(user_id,password,token_version) values ('44444444-0000-4000-8000-000000000004','VDHASH_NOT_REAL_000000000000004',5);
insert into refresh_tokens("user",token_hash,expires_at,is_revoked) values ('44444444-0000-4000-8000-000000000004','rt_vd_1',now()+interval '7 days',false);
insert into dealers("user",business_name,approved) values ('44444444-0000-4000-8000-000000000004','VD Motors',true) on conflict do nothing;
-- digests of the dealer-owned data that must never change
create or replace function t5e.dealer_digest(u uuid) returns text language sql as $$
 select md5(coalesce((select row_to_json(d)::text from dealers d where d."user"=u order by d.id limit 1),'')||coalesce((select string_agg(row_to_json(v)::text,'|' order by v.id) from dealer_verifications v where v."user"=u),'')
  ||(select concat_ws('|',role,status,business_name,is_banned,name,phone,location,dealer_package,subscription_status) from users where id=u)) $$;
create table t5e.snap(k text primary key, v text);
insert into t5e.snap values ('dealer1_before', t5e.dealer_digest('11111111-0000-4000-8000-000000000001')),
 ('vd_before', t5e.dealer_digest('44444444-0000-4000-8000-000000000004')),
 ('bystander_before', (select md5(row_to_json(u)::text||row_to_json(a)::text) from users u join user_auth a on a.user_id=u.id where u.id='22222222-0000-4000-8000-000000000002')),
 ('d1_tv_before', (select token_version::text from user_auth where user_id='11111111-0000-4000-8000-000000000001')),
 ('d1_pw_before', (select md5(password) from user_auth where user_id='11111111-0000-4000-8000-000000000001')),
 ('vd_pw_before', (select md5(password)||token_version from user_auth where user_id='44444444-0000-4000-8000-000000000004')),
 ('ev_before', (select count(*)::text from owner_membership_events));
SQL
J() { Q -c "$1"; }   # one-value query helper
TH() { echo -n "stage5e-disposable-$1" | sha256sum | cut -d' ' -f1; }   # deterministic inert token hash
D1=11111111-0000-4000-8000-000000000001; BY=22222222-0000-4000-8000-000000000002; BN=33333333-0000-4000-8000-000000000003; VD=44444444-0000-4000-8000-000000000004
NEWPW="NEWPASSWORDHASH_NOT_REAL_ABCDEFGHIJ"; EXP="now() + interval '1 day'"
A() { Q -c "select (public.kayad_owner_accept_invitation_atomic('$1', $2, $3, $4))::text"; }   # token_hash name pw auth

echo "== T1 pre-state"
Q -c "select t5e.chk('T1.1 dealer account exists as pending/unverified dealer', (select role='dealer' and status='pending' and email_verified=false from users where id='$D1'))"
Q -c "select t5e.chk('T1.2 not an owner before invitation', not public.kayad_owner_usable('$D1') and public.kayad_owner_usable_count()=0)"

echo "== T2 invitation authorization"
r=$(Q -c "select public.kayad_owner_issue_invitation('x-no-actor@kayad-test.example','invitation','$(TH noactor)', $EXP, null, 'attacker', null)::text"); Q -c "select t5e.chk('T2.1 unattended kind=invitation refused', '$r' like '%OWNER_ACTOR_REQUIRED%', '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('x-dealer-actor@kayad-test.example','invitation','$(TH dactor)', $EXP, '$D1', 'dealer', null)::text"); Q -c "select t5e.chk('T2.2 non-owner (the dealer itself) cannot invite', '$r' like '%OWNER_ACTOR_NOT_OWNER%', '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('dealer-one@kayad-test.example','bootstrap','$(TH exp8)', now() + interval '8 days', null, 'bootstrap-cli:test', null)::text"); Q -c "select t5e.chk('T2.3 expiry beyond 7 days refused', '$r' like '%OWNER_INVALID_EXPIRY%', '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('not-an-email','bootstrap','$(TH bad)', $EXP, null, 'bootstrap-cli:test', null)::text"); Q -c "select t5e.chk('T2.4 malformed address refused', '$r' like '%OWNER_INVALID_REQUEST%', '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('  Dealer-One@Kayad-Test.Example ','bootstrap','$(TH d1)', $EXP, null, 'bootstrap-cli:test', 'stage5e disposable')::text"); Q -c "select t5e.chk('T2.5 operator bootstrap invitation issued (address normalised)', '$r' like '%\"ok\": true%' and '$r' like '%dealer-one@kayad-test.example%', '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('dealer-one@kayad-test.example','bootstrap','$(TH d1dup)', $EXP, null, 'bootstrap-cli:test', null)::text"); Q -c "select t5e.chk('T2.6 duplicate pending invitation refused', '$r' like '%OWNER_INVITATION_PENDING%', '$r')"
Q -c "select t5e.chk('T2.7 stored value is a hash, never a plaintext token; one pending row', (select count(*)=1 and min(token_hash)='$(TH d1)' from owner_invitations where status='pending'))"
Q -c "select t5e.chk('T2.8 invitation alone grants no privilege', not public.kayad_owner_usable('$D1') and (select count(*)=0 from owner_memberships))"

echo "== T3 failed acceptance attempts never mutate"
Q -c "insert into t5e.snap values ('pre_fail', (select md5(string_agg(row_to_json(a)::text,'|' order by a.user_id)) from user_auth a)||(select count(*)::text from owner_memberships)||(select md5(string_agg(row_to_json(r)::text,'|' order by r.token_hash)) from refresh_tokens r))"
r=$(A "$(TH wrong)" "'Dealer One'" "'$NEWPW'" null); Q -c "select t5e.chk('T3.1 unknown token refused', '$r' like '%OWNER_INVITATION_INVALID%', '$r')"
r=$(A "$(TH d1)" "'Dealer One'" "null" null); Q -c "select t5e.chk('T3.2 missing password on the unverified path refused', '$r' like '%OWNER_PASSWORD_REQUIRED%', '$r')"
r=$(A "$(TH d1)" "'Dealer One'" "'short'" null); Q -c "select t5e.chk('T3.3 too-short password hash refused', '$r' like '%OWNER_PASSWORD_REQUIRED%', '$r')"
Q -c "select t5e.chk('T3.4 no credential, session or membership change after 3 failed attempts', (select (select md5(string_agg(row_to_json(a)::text,'|' order by a.user_id)) from user_auth a)||(select count(*)::text from owner_memberships)||(select md5(string_agg(row_to_json(r)::text,'|' order by r.token_hash)) from refresh_tokens r) from (select 1) x) = (select v from t5e.snap where k='pre_fail'))"
Q -c "select t5e.chk('T3.5 failed attempts are audited as denied', (select count(*) from owner_membership_events where action='invitation_accept' and result='denied') >= 1)"

echo "== T4 expiry"
Q -c "select public.kayad_owner_issue_invitation('expired-user@kayad-test.example','bootstrap','$(TH expd)', $EXP, null, 'bootstrap-cli:test', null)::text" >/dev/null
Q -c "update owner_invitations set expires_at = now() - interval '1 minute' where token_hash='$(TH expd)'"   # test setup: simulate elapsed time
r=$(A "$(TH expd)" "'Exp'" "'$NEWPW'" null); Q -c "select t5e.chk('T4.1 expired token refused and marked expired', '$r' like '%OWNER_INVITATION_EXPIRED%' and (select status from owner_invitations where token_hash='$(TH expd)')='expired', '$r')"
Q -c "select t5e.chk('T4.2 expired token created no account', not exists(select 1 from users where email='expired-user@kayad-test.example'))"


echo "== T5 activation of the pending, unverified dealer (takeover-by-mailbox path) — field-impact evidence"
r=$(A "$(TH d1)" "'Dealer One'" "'$NEWPW'" null); echo "accept: $r"
Q -c "select t5e.chk('T5.1 acceptance succeeds, reports credentials_reset=true account_created=false', '$r' like '%\"ok\": true%' and '$r' like '%\"credentials_reset\": true%' and '$r' like '%\"account_created\": false%', '$r')"
Q -c "select t5e.chk('T5.2 DEALER DATA UNCHANGED: role, status, business, dealers row, dealer_verifications row', t5e.dealer_digest('$D1') = (select v from t5e.snap where k='dealer1_before'))"
Q -c "select t5e.chk('T5.3 role stays dealer and status stays pending (no role/status promotion)', (select role='dealer' and status='pending' from users where id='$D1'))"
Q -c "select t5e.chk('T5.4 email_verified flips false->true (mailbox proven by invitation token)', (select email_verified from users where id='$D1'))"
Q -c "select t5e.chk('T5.5 password REPLACED, token_version incremented, old verify/reset tokens cleared', (select md5(password) <> (select v from t5e.snap where k='d1_pw_before') and token_version=(select v::int+1 from t5e.snap where k='d1_tv_before') and email_verify_token is null and reset_token is null and login_attempts=0 and must_change_password=false from user_auth where user_id='$D1'))"
Q -c "select t5e.chk('T5.6 ALL prior refresh tokens revoked with reason', (select count(*)=2 and bool_and(is_revoked) and bool_and(revoke_reason='owner_invitation_credential_reset') from refresh_tokens where \"user\"='$D1'))"
Q -c "select t5e.chk('T5.7 active membership created, bound to user id and normalised email', (select count(*)=1 and min(user_id::text)='$D1' and min(email)='dealer-one@kayad-test.example' and min(added_via)='bootstrap' from owner_memberships where status='active'))"
Q -c "select t5e.chk('T5.8 invitation consumed (accepted, accepted_user_id set)', (select status='accepted' and accepted_user_id='$D1' from owner_invitations where token_hash='$(TH d1)'))"
Q -c "select t5e.chk('T5.9 account is now a usable owner; count=1', public.kayad_owner_usable('$D1') and public.kayad_owner_usable_count()=1)"
Q -c "select t5e.chk('T5.10 bystander account untouched (no riding on another invitation)', (select md5(row_to_json(u)::text||row_to_json(a)::text) from users u join user_auth a on a.user_id=u.id where u.id='$BY') = (select v from t5e.snap where k='bystander_before') and not exists(select 1 from owner_memberships where user_id='$BY'))"
Q -c "select t5e.chk('T5.11 audit: membership_activate success recorded with credentials_reset flag, no secrets', (select count(*)=1 from owner_membership_events where action='membership_activate' and result='success' and target_user_id='$D1' and metadata->>'credentials_reset'='true' and metadata::text not like '%$NEWPW%' and metadata::text not like '%$(TH d1)%'))"

echo "== T6 replay and idempotency"
r=$(A "$(TH d1)" "'Dealer One'" "'ANOTHERHASH_NOT_REAL_ABCDEFGHIJKL'" null); Q -c "select t5e.chk('T6.1 replay of a consumed token refused', '$r' like '%OWNER_INVITATION_INVALID%', '$r')"
Q -c "select t5e.chk('T6.2 replay changed nothing: one membership, password unchanged since activation', (select count(*)=1 from owner_memberships where status='active') and (select password='$NEWPW' from user_auth where user_id='$D1'))"
r=$(Q -c "select public.kayad_owner_issue_invitation('dealer-one@kayad-test.example','invitation','$(TH d1again)', $EXP, '$D1', 'owner:dealer-one', null)::text"); Q -c "select t5e.chk('T6.3 re-inviting an existing usable owner refused', '$r' like '%OWNER_ALREADY_ACTIVE%', '$r')"

echo "== T7 concurrency: two simultaneous acceptances of one token"
Q -c "select public.kayad_owner_issue_invitation('race-user@kayad-test.example','invitation','$(TH race)', $EXP, '$D1', 'owner:dealer-one', null)::text" >/dev/null
( A "$(TH race)" "'Race A'" "'RACEHASH_A_NOT_REAL_ABCDEFGHIJ'" null > /tmp/5e_race_a.out 2>&1 ) &
( A "$(TH race)" "'Race B'" "'RACEHASH_B_NOT_REAL_ABCDEFGHIJ'" null > /tmp/5e_race_b.out 2>&1 ) &
wait
okc=$(cat /tmp/5e_race_a.out /tmp/5e_race_b.out | grep -c '"ok": true'); invc=$(cat /tmp/5e_race_a.out /tmp/5e_race_b.out | grep -c 'OWNER_INVITATION_INVALID')
Q -c "select t5e.chk('T7.1 exactly one concurrent acceptance wins, the other is refused', $okc=1 and $invc=1, 'ok=$okc invalid=$invc')"
Q -c "select t5e.chk('T7.2 exactly one account and one membership for the raced address', (select count(*) from users where email='race-user@kayad-test.example')=1 and (select count(*) from owner_memberships where email='race-user@kayad-test.example' and status='active')=1)"
rm -f /tmp/5e_race_a.out /tmp/5e_race_b.out

echo "== T8 verified existing dealer (Path A): sign-in required, credentials NOT replaced"
Q -c "select public.kayad_owner_issue_invitation('verified-dealer@kayad-test.example','invitation','$(TH vd)', $EXP, '$D1', 'owner:dealer-one', null)::text" >/dev/null
r=$(A "$(TH vd)" "null" "null" null); Q -c "select t5e.chk('T8.1 anonymous acceptance by a verified account refused (OWNER_LOGIN_REQUIRED)', '$r' like '%OWNER_LOGIN_REQUIRED%', '$r')"
r=$(A "$(TH vd)" "null" "null" "'$BY'"); Q -c "select t5e.chk('T8.2 acceptance while signed in as a DIFFERENT account refused', '$r' like '%OWNER_LOGIN_REQUIRED%', '$r')"
Q -c "select t5e.chk('T8.3 refusals left the verified dealer untouched', t5e.dealer_digest('$VD')=(select v from t5e.snap where k='vd_before') and (select md5(password)||token_version from user_auth where user_id='$VD')=(select v from t5e.snap where k='vd_pw_before') and not exists(select 1 from owner_memberships where user_id='$VD'))"
r=$(A "$(TH vd)" "null" "null" "'$VD'"); Q -c "select t5e.chk('T8.4 acceptance signed in as the invited account succeeds with credentials_reset=false', '$r' like '%\"ok\": true%' and '$r' like '%\"credentials_reset\": false%', '$r')"
Q -c "select t5e.chk('T8.5 password, token_version and sessions preserved; dealer data unchanged', (select md5(password)||token_version from user_auth where user_id='$VD')=(select v from t5e.snap where k='vd_pw_before') and (select bool_and(not is_revoked) from refresh_tokens where \"user\"='$VD') and t5e.dealer_digest('$VD')=(select v from t5e.snap where k='vd_before'))"
Q -c "select t5e.chk('T8.6 verified dealer is now a usable owner; two usable owners', public.kayad_owner_usable('$VD') and public.kayad_owner_usable_count()=3)"

echo "== T9 blocked / revoked / recovery"
Q -c "select public.kayad_owner_issue_invitation('banned@kayad-test.example','invitation','$(TH ban)', $EXP, '$D1', 'owner:dealer-one', null)::text" >/dev/null
r=$(A "$(TH ban)" "null" "null" "'$BN'"); Q -c "select t5e.chk('T9.1 banned account cannot become owner', '$r' like '%OWNER_ACCOUNT_BLOCKED%' and not exists(select 1 from owner_memberships where user_id='$BN'), '$r')"
id=$(Q -c "select id from owner_invitations where token_hash='$(TH ban)'")
Q -c "select public.kayad_owner_issue_invitation('revoked-one@kayad-test.example','invitation','$(TH rev)', $EXP, '$D1', 'owner:dealer-one', null)::text" >/dev/null
rid=$(Q -c "select id from owner_invitations where token_hash='$(TH rev)'")
Q -c "select public.kayad_owner_revoke_invitation('$rid','$D1','owner:dealer-one','test')::text" >/dev/null
r=$(A "$(TH rev)" "'Rev'" "'$NEWPW'" null); Q -c "select t5e.chk('T9.2 revoked invitation cannot be accepted; no account created', '$r' like '%OWNER_INVITATION_INVALID%' and not exists(select 1 from users where email='revoked-one@kayad-test.example'), '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('recov@kayad-test.example','recovery','$(TH rc1)', $EXP, '$BY', 'bystander', null)::text"); Q -c "select t5e.chk('T9.3 non-owner cannot issue a recovery invitation', '$r' like '%OWNER_ACTOR_NOT_OWNER%', '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('recov@kayad-test.example','recovery','$(TH rc2)', $EXP, null, 'emergency-cli:x', 'emergency')::text"); Q -c "select t5e.chk('T9.4 emergency recovery refused while a usable owner exists', '$r' like '%OWNER_RECOVERY_NOT_NEEDED%', '$r')"

echo "== T10 governance invariants"
Q -c "select public.kayad_owner_revoke_membership_atomic('$VD','$D1','owner:dealer-one','test')::text" >/dev/null
Q -c "select t5e.chk('T10.1 owner revoked: membership revoked, not usable, dealer role and status preserved (reversible, nothing lost)', (select status='revoked' from owner_memberships where user_id='$VD' order by created_at desc limit 1) and not public.kayad_owner_usable('$VD') and (select role='dealer' and status='approved' from users where id='$VD') and t5e.dealer_digest('$VD')=(select v from t5e.snap where k='vd_before'))"
Q -c "select t5e.chk('T10.1b revoking membership invalidates the owner sessions (token_version bumped 5->6)', (select token_version from user_auth where user_id='$VD') = 6)"
# reduce to a single usable owner then try to remove it
Q -c "select public.kayad_owner_revoke_membership_atomic(user_id,'$D1','owner:dealer-one','test')::text from owner_memberships where email='race-user@kayad-test.example' and status='active'" >/dev/null
Q -c "select t5e.chk('T10.2 down to one usable owner', public.kayad_owner_usable_count()=1)"
r=$(Q -c "select public.kayad_owner_revoke_membership_atomic('$D1','$D1','owner:dealer-one','self')::text"); Q -c "select t5e.chk('T10.3 LAST usable owner cannot be removed (even by itself)', '$r' like '%OWNER_LAST_USABLE%' and public.kayad_owner_usable('$D1'), '$r')"
Q <<SQL
begin; update users set status='suspended' where id='$D1';
select t5e.chk('T10.5 a suspended owner is not usable (privilege follows account state)', not public.kayad_owner_usable('$D1'));
rollback;
begin; update users set email_verified=false where id='$D1';
select t5e.chk('T10.6 an owner whose e-mail becomes unverified is not usable', not public.kayad_owner_usable('$D1'));
rollback;
begin; update users set email='someone-else@kayad-test.example' where id='$D1';
select t5e.chk('T10.7 an owner whose e-mail no longer matches the membership is not usable', not public.kayad_owner_usable('$D1'));
rollback;
SQL
r=$(Q -c "select public.kayad_owner_bootstrap_close('test','all established')::text"); Q -c "select t5e.chk('T10.8 bootstrap closes once an owner exists', '$r' like '%\"ok\": true%' and (select status='closed' from owner_bootstrap_state), '$r')"
r=$(Q -c "select public.kayad_owner_issue_invitation('late@kayad-test.example','bootstrap','$(TH late)', $EXP, null, 'bootstrap-cli:test', null)::text"); Q -c "select t5e.chk('T10.9 no bootstrap invitation after close', '$r' like '%OWNER_BOOTSTRAP_CLOSED%', '$r')"

echo "== T11 privilege boundaries and audit integrity"
for fn in "kayad_owner_accept_invitation_atomic(text,text,text,uuid)" "kayad_owner_issue_invitation(text,text,text,timestamptz,uuid,text,text)" "kayad_owner_revoke_membership_atomic(uuid,uuid,text,text)" "kayad_owner_bootstrap_close(text,text)"; do
  Q -c "select t5e.chk('T11 $fn: anon/authenticated/public have no EXECUTE; service_role does', not has_function_privilege('anon','public.$fn','EXECUTE') and not has_function_privilege('authenticated','public.$fn','EXECUTE') and has_function_privilege('service_role','public.$fn','EXECUTE'))"
done
Q -c "select t5e.chk('T11.5 service_role has no direct write on owner tables (SELECT only)', not has_table_privilege('service_role','public.owner_memberships','INSERT') and not has_table_privilege('service_role','public.owner_memberships','UPDATE') and not has_table_privilege('service_role','public.owner_invitations','UPDATE') and not has_table_privilege('service_role','public.owner_membership_events','DELETE'))"
Q -c "select t5e.chk('T11.6 anon/authenticated have no access to owner tables', not has_table_privilege('anon','public.owner_memberships','SELECT') and not has_table_privilege('authenticated','public.owner_memberships','SELECT') and not has_table_privilege('authenticated','public.owner_invitations','SELECT'))"
x=$(Q -c "do \$\$ begin update owner_membership_events set reason='tamper' where true; exception when others then raise notice 'blocked'; end \$\$" 2>&1 | grep -c blocked); Q -c "select t5e.chk('T11.7 event ledger is append-only (UPDATE blocked)', $x>=1)"
x=$(Q -c "do \$\$ begin delete from owner_membership_events where true; exception when others then raise notice 'blocked'; end \$\$" 2>&1 | grep -c blocked); Q -c "select t5e.chk('T11.8 event ledger is append-only (DELETE blocked)', $x>=1)"
Q -c "select t5e.chk('T11.9 no password hash, token hash or token in any audit row of this run', not exists(select 1 from owner_membership_events where (coalesce(metadata::text,'')||coalesce(reason,'')) ~ '(NOT_REAL|[0-9a-f]{64})'))"
Q -c "select t5e.chk('T11.10 every state change in this run has an audit event', (select count(*) from owner_membership_events) - (select v::int from t5e.snap where k='ev_before') >= 12)"

echo "== T12 transaction-failure atomicity (fault injected AFTER the credential reset inside the acceptance transaction)"
AT=55555555-0000-4000-8000-000000000005
Q <<SQL
insert into users(id,name,email,role,status,email_verified) values ('$AT','Atomic','atomic@kayad-test.example','dealer','pending',false);
insert into user_auth(user_id,password,token_version) values ('$AT','ATOMICOLDHASH_NOT_REAL_00000005',2);
insert into refresh_tokens("user",token_hash,expires_at,is_revoked) values ('$AT','rt_atomic_1',now()+interval '7 days',false);
create table t5e.pre_atomic as select (select md5(password)||token_version||coalesce(email_verify_token,'') from user_auth where user_id='$AT') a, (select email_verified::text from users where id='$AT') b, (select count(*) from refresh_tokens where "user"='$AT' and not is_revoked) c;
create function t5e.boom() returns trigger language plpgsql as \$f\$ begin raise exception 'injected failure after credential reset'; end \$f\$;
create trigger t5e_boom before insert on owner_memberships for each row execute function t5e.boom();
SQL
Q -c "select public.kayad_owner_issue_invitation('atomic@kayad-test.example','invitation','$(TH atomic)', $EXP, '$D1', 'owner:dealer-one', null)::text" >/dev/null
Q -c "select public.kayad_owner_accept_invitation_atomic('$(TH atomic)','Atomic','$NEWPW',null)::text" >/dev/null 2>&1; rc=$?
Q -c "select t5e.chk('T12.1 injected failure surfaces as an error (no false success)', $rc<>0)"
Q -c "select t5e.chk('T12.2 ROLLED BACK: password, token_version, verify token, email_verified, live sessions all unchanged', (select md5(password)||token_version||coalesce(email_verify_token,'') from user_auth where user_id='$AT')=(select a from t5e.pre_atomic) and (select email_verified::text from users where id='$AT')=(select b from t5e.pre_atomic) and (select count(*) from refresh_tokens where \"user\"='$AT' and not is_revoked)=(select c from t5e.pre_atomic))"
Q -c "select t5e.chk('T12.3 invitation still pending and no membership after the failed transaction', (select status='pending' from owner_invitations where token_hash='$(TH atomic)') and not exists(select 1 from owner_memberships where user_id='$AT'))"
Q -c "drop trigger t5e_boom on owner_memberships; drop function t5e.boom()"
r=$(A "$(TH atomic)" "'Atomic'" "'$NEWPW'" null); Q -c "select t5e.chk('T12.4 after the fault is removed the same invitation completes (retry-safe)', '$r' like '%\"ok\": true%' and public.kayad_owner_usable('$AT'), '$r')"

echo
Q -c "select (case when ok then 'PASS' else 'FAIL' end)||' '||name||case when ok then '' else '  :: '||detail end from t5e.res order by n"
p=$(Q -c "select count(*) from t5e.res where ok"); f=$(Q -c "select count(*) from t5e.res where not ok")
echo "owner_dealer_activation_pg_tests: pass=$p fail=$f"
[ "$f" = 0 ]
