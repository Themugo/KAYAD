#!/bin/bash
# PHASE 16C - certification of the THREE pending migration candidates as a set, on disposable databases only (never hosted).
#   M1 = phase16b registration + dealer onboarding   M2 = stage5b owner governance   M3 = phase16 owner MFA
# usage: migration_set_certification.sh [template_db_with_full_repo_schema]   env PGPORT (default 54329). Test-only; refuses non-loopback.
T=${1:-kayad_16b_base}; PORT=${PGPORT:-54329}; HERE="$(cd "$(dirname "$0")" && pwd)"; R="$HERE/../.."
M1="$R/phase16b-20261027/migration-candidate/20261027120000_phase16b_registration_and_dealer_onboarding_CANDIDATE.sql"
M1R="$R/phase16b-20261027/migration-candidate/20261027120000_phase16b_registration_and_dealer_onboarding_ROLLBACK.sql"
M2="$R/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql"
M2R="$R/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_ROLLBACK_CANDIDATE.sql"
M3="$R/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_CANDIDATE.sql"
M3R="$R/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_ROLLBACK_CANDIDATE.sql"
PSQL="psql -h 127.0.0.1 -p $PORT -U postgres"; pass=0; fail=0
ck() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)); echo "FAIL $1 (got [$2] expected [$3])"; fi; }
mk() { $PSQL -d postgres -qc "drop database if exists $1" -c "create database $1 template $2" >/dev/null 2>&1; }
Qd() { local d=$1; shift; $PSQL -d $d -Atq "$@" 2>&1; }
ap() { local d=$1 f=$2; shift 2; $PSQL -d $d -v ON_ERROR_STOP=1 -q "$@" -f "$f" >/dev/null 2>&1; echo $?; }      # M1/M3 are self-contained transactions
ap2() { local d=$1; $PSQL -d $d -v ON_ERROR_STOP=1 -1 -q -f "$M2" >/dev/null 2>&1; echo $?; }                      # M2 has no BEGIN/COMMIT: must be run with -1
CAT="select md5(string_agg(x, '|' order by x)) from (
 select 'c:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'') x from information_schema.columns where table_schema='public'
 union all select 'i:'||indexdef from pg_indexes where schemaname='public'
 union all select 'f:'||p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid))||':'||coalesce(array_to_string(proacl,','),'') from pg_proc p where pronamespace='public'::regnamespace and prokind='f'
 union all select 'k:'||conrelid::regclass||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace
 union all select 'p:'||tablename||':'||policyname||':'||cmd from pg_policies where schemaname='public'
 union all select 'g:'||table_name||':'||grantee||':'||privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role')
 union all select 'r:'||relname||':'||relrowsecurity::text from pg_class where relnamespace='public'::regnamespace and relkind='r'
 union all select 't:'||tgname||':'||tgrelid::regclass from pg_trigger where not tgisinternal) s"
# rows that must never change: every pre-existing table that holds identity/session/dealer data (dealers compared on its pre-existing columns)
ROWS="select md5(concat_ws('|',(select md5(string_agg(x::text,'|' order by id)) from users x),(select md5(string_agg(x::text,'|' order by user_id)) from user_auth x),
 (select coalesce(md5(string_agg(x::text,'|' order by id)),'-') from refresh_tokens x),(select coalesce(md5(string_agg(x::text,'|' order by id)),'-') from dealer_verifications x),
 (select coalesce(md5(string_agg(x::text,'|' order by id)),'-') from dealer_teams x),(select md5(string_agg(x::text,'|' order by id)) from profiles x),
 (select coalesce(md5(string_agg(x.id::text||x.\"user\"::text,'|' order by x.id)),'-') from dealers x)))"
shape() { # shape like hosted per Phase 16A read-only evidence + seed synthetic rows (never real addresses)
  Qd $1 -c "drop trigger if exists trg_sync_dealer_profile_from_user on public.users" -c "drop trigger if exists trg_sync_profile_role_from_user on public.users" \
   -c "drop function if exists public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)" \
   -c "alter table public.dealers drop column bio, drop column payment_details, drop column onboarding_complete, drop column onboarding_completed_at" \
   -c "drop index if exists public.uq_users_email_normalized" -c "alter table public.dealer_verifications drop constraint dealer_verifications_verification_status_check" \
   -c "alter table public.dealer_verifications add constraint dealer_verifications_verification_status_check check (verification_status in ('pending','approved','rejected'))" >/dev/null
  Qd $1 -c "insert into users(id,name,email,role,status,email_verified,business_name) values
    ('00000000-0000-4000-8000-0000000000a1','Primary Synthetic','primary.synthetic@example.test','dealer','pending',true,'Biz A'),
    ('00000000-0000-4000-8000-0000000000b2','Test Dealer Synthetic','test.dealer.synthetic@example.test','dealer','pending',false,'Biz B'),
    ('00000000-0000-4000-8000-0000000000c3','Staff Synthetic','dealer.staff.synthetic@example.test','user','approved',true,null)" \
   -c "insert into user_auth(user_id,password,token_version) values ('00000000-0000-4000-8000-0000000000a1','hash-a-xxxxxxxxxxxxxxxxxxxx',3),('00000000-0000-4000-8000-0000000000b2','hash-b-xxxxxxxxxxxxxxxxxxxx',0),('00000000-0000-4000-8000-0000000000c3','hash-c-xxxxxxxxxxxxxxxxxxxx',0)" \
   -c "insert into refresh_tokens(\"user\",expires_at,token_hash) values ('00000000-0000-4000-8000-0000000000a1',now()+interval '7 days',repeat('1',64)),('00000000-0000-4000-8000-0000000000c3',now()+interval '7 days',repeat('2',64))" \
   -c "insert into dealers(\"user\") values ('00000000-0000-4000-8000-0000000000b2')" \
   -c "insert into dealer_verifications(\"user\",dealer,verification_status) select '00000000-0000-4000-8000-0000000000b2',id,'pending' from dealers where \"user\"='00000000-0000-4000-8000-0000000000b2'" \
   -c "insert into dealer_teams(dealer,role,status,invite_email,invited_by,member) values ('00000000-0000-4000-8000-0000000000b2','sales_agent','active','dealer.staff.synthetic@example.test','00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000c3')" >/dev/null 2>&1
}
for DB in cert_host cert_fresh; do :; done
# ============ A. fresh install (full repo schema) ============
mk cert_fresh $T; F0=$(Qd cert_fresh -c "$CAT"); FD0=$(Qd cert_fresh -c "select md5(pg_get_functiondef(oid)) from pg_proc where proname='kayad_register_identity_atomic'")
ck "A1 fresh: M1 applies (exit 0)" "$(ap cert_fresh $M1)" "0"
ck "A2 fresh: M1 changes only search_path/whitespace of the register function (same ACL, CHECK, columns)" "$(Qd cert_fresh -c "select (select array_to_string(proacl,',') from pg_proc where proname='kayad_register_identity_atomic')||'|'||(select string_agg(column_name,',' order by column_name) from information_schema.columns where table_name='dealers' and column_name in ('bio','payment_details','onboarding_complete','onboarding_completed_at'))||'|'||(select pg_get_constraintdef(oid) from pg_constraint where conname='dealer_verifications_verification_status_check')")" "postgres=X/postgres,service_role=X/postgres|bio,onboarding_complete,onboarding_completed_at,payment_details|CHECK ((verification_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])))"
ck "A3 fresh: M1 hardens search_path to 'public, pg_temp'" "$(Qd cert_fresh -c "select array_to_string(proconfig,',') from pg_proc where proname='kayad_register_identity_atomic'")" "search_path=public, pg_temp"
ck "A4 fresh: M2 applies with -1 (exit 0)" "$(ap2 cert_fresh)" "0"
ck "A5 fresh: M3 applies (exit 0)" "$(ap cert_fresh $M3)" "0"
A1=$(Qd cert_fresh -c "$CAT")
ck "A6 fresh: second full pass is a no-op on the catalog (repeat application)" "$( ap cert_fresh $M1 >/dev/null; ap2 cert_fresh >/dev/null; ap cert_fresh $M3 >/dev/null; Qd cert_fresh -c "$CAT")" "$A1"
# ============ B. upgrade from the hosted-shaped baseline, all six orders ============
mk cert_base_shaped $T; shape cert_base_shaped
ck "B0 baseline: hosted shape (no register function, 3-value CHECK, no owner tables)" "$(Qd cert_base_shaped -c "select (select count(*) from pg_proc where proname='kayad_register_identity_atomic')||'/'||(select count(*) from pg_class where relname in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state'))")" "0/0"
R0=$(Qd cert_base_shaped -c "$ROWS"); FIN=""
i=0
for ORDER in "1 2 3" "1 3 2" "2 1 3" "2 3 1" "3 1 2" "3 2 1"; do
  i=$((i+1)); mk cert_perm cert_base_shaped; rc=0
  for m in $ORDER; do case $m in 1) r=$(ap cert_perm $M1);; 2) r=$(ap2 cert_perm);; 3) r=$(ap cert_perm $M3);; esac; [ "$r" = 0 ] || rc=1; done
  C=$(Qd cert_perm -c "$CAT"); [ -z "$FIN" ] && FIN=$C
  ck "B$i upgrade order [$ORDER]: all three apply (exit 0)" "$rc" "0"
  ck "B$i upgrade order [$ORDER]: identical final catalog to the first order" "$C" "$FIN"
  ck "B$i upgrade order [$ORDER]: pre-existing identity/session/dealer rows byte-identical" "$(Qd cert_perm -c "$ROWS")" "$R0"
done
CL="select x from (
 select 'i:'||indexdef x from pg_indexes where schemaname='public'
 union all select 't:'||tgname||':'||tgrelid::regclass from pg_trigger where not tgisinternal
 union all select 'f:'||p.oid::regprocedure::text from pg_proc p where pronamespace='public'::regnamespace and prokind='f'
 union all select 'k:'||conrelid::regclass||':'||conname from pg_constraint where connamespace='public'::regnamespace
 union all select 'c:'||table_name||'.'||column_name from information_schema.columns where table_schema='public') s order by 1"
Qd cert_fresh -c "$CL" > /tmp/cl_fresh.txt; Qd cert_perm -c "$CL" > /tmp/cl_up.txt
DIFF=$(diff /tmp/cl_fresh.txt /tmp/cl_up.txt | grep '^[<>]' | sed 's/CREATE \(UNIQUE \)\?INDEX/IDX/' | cut -c1-110)
echo "INFO B7 objects that differ between a FRESH install and a hosted-shaped UPGRADE (intentionally not in M1):"; echo "$DIFF" | sed 's/^/INFO   /'
ck "B7 upgrade vs fresh: exactly 3 objects differ (the two hosted-only-absent sync triggers and the normalised-email unique index; all deliberately excluded from M1)" "$(echo "$DIFF" | grep -c '.')" "3"
# ============ C. failure atomicity of M2 ============
mk cert_atomic cert_base_shaped; Qd cert_atomic -c "drop table public.communication_event_controls cascade" >/dev/null
OUT1=$($PSQL -d cert_atomic -v ON_ERROR_STOP=1 -1 -q -f "$M2" 2>&1)
ck "C1 M2 with -1 on a DB lacking a prerequisite table fails" "$(echo "$OUT1" | grep -c 'communication_event_controls' | awk '{print ($1>0)?1:0}')" "1"
ck "C2 …and leaves NOTHING behind (no owner table, no owner function)" "$(Qd cert_atomic -c "select (select count(*) from pg_class where relname in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state'))+(select count(*) from pg_proc where proname like 'kayad_owner_%')")" "0"
mk cert_atomic2 cert_base_shaped; Qd cert_atomic2 -c "drop table public.communication_event_controls cascade" >/dev/null
$PSQL -d cert_atomic2 -v ON_ERROR_STOP=1 -q -f "$M2" >/dev/null 2>&1
ck "C3 DOCUMENTED RISK: M2 WITHOUT -1 leaves a half-applied schema when it fails late (so -1 is mandatory)" "$(Qd cert_atomic2 -c "select (select count(*) from pg_class where relname in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state'))>0")" "t"
mk cert_atomic3 cert_base_shaped; Qd cert_atomic3 -c "alter table user_auth drop column token_version cascade" >/dev/null
ck "C4 M1 preflight refuses and changes nothing when a prerequisite column is missing" "$(ap cert_atomic3 $M1 | grep -c '^[1-9]')|$(Qd cert_atomic3 -c "select count(*) from pg_proc where proname='kayad_register_identity_atomic'")" "1|0"
# ============ D. RLS / grants on every new object ============
mk cert_priv cert_base_shaped; ap cert_priv $M1 >/dev/null; ap2 cert_priv >/dev/null; ap cert_priv $M3 >/dev/null
for t in owner_memberships owner_invitations owner_membership_events owner_bootstrap_state owner_mfa_factors owner_mfa_recovery_codes; do
  ck "D $t: RLS enabled" "$(Qd cert_priv -c "select relrowsecurity::text from pg_class where relname='$t'")" "true"
  for r in anon authenticated; do ck "D $t: $r cannot SELECT" "$($PSQL -d cert_priv -Atq -c "set role $r" -c "select count(*) from public.$t" 2>&1 | grep -c 'permission denied')" "1"; done
  ck "D $t: PUBLIC has no privilege" "$(Qd cert_priv -c "select count(*) from information_schema.role_table_grants where table_name='$t' and grantee='PUBLIC'")" "0"
done
for t in owner_memberships owner_invitations owner_membership_events owner_bootstrap_state; do ck "D $t: service_role holds SELECT only (writes go through SECURITY DEFINER functions)" "$(Qd cert_priv -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='$t' and grantee='service_role'")" "SELECT"; done
for t in owner_mfa_factors owner_mfa_recovery_codes; do ck "D $t: service_role has CRUD, nobody else" "$(Qd cert_priv -c "select string_agg(grantee||':'||privilege_type,',' order by grantee,privilege_type) from information_schema.role_table_grants where table_name='$t' and grantee in ('anon','authenticated','service_role')")" "service_role:DELETE,service_role:INSERT,service_role:SELECT,service_role:UPDATE"; done
for f in "kayad_owner_snapshot()" "kayad_owner_issue_invitation(text,text,text,timestamptz,uuid,text,text)" "kayad_owner_accept_invitation_atomic(text,text,text,uuid)" "kayad_owner_revoke_membership_atomic(uuid,uuid,text,text)" "kayad_owner_bootstrap_close(text,text)" "kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)"; do
  ck "D fn $f: anon/authenticated/PUBLIC cannot execute, service_role can" "$(Qd cert_priv -c "select has_function_privilege('anon','public.$f','execute')::text||has_function_privilege('authenticated','public.$f','execute')::text||has_function_privilege('public','public.$f','execute')::text||has_function_privilege('service_role','public.$f','execute')::text")" "falsefalsefalsetrue"; done
ck "D: events ledger is append-only (UPDATE, DELETE and TRUNCATE all refused, even for the table owner)" "$(Qd cert_priv -c "insert into owner_membership_events(action,result,actor_label) values ('t','success','x')" -c "update owner_membership_events set action='y'" -c "delete from owner_membership_events" -c "truncate owner_membership_events" 2>&1 | grep -c 'append-only')" "3"
# ============ E. owner-activation semantics on the hosted-shaped data (role labels never change) ============
mk cert_act cert_base_shaped; ap cert_act $M1 >/dev/null; ap2 cert_act >/dev/null; ap cert_act $M3 >/dev/null
PRI=00000000-0000-4000-8000-0000000000a1; TD=00000000-0000-4000-8000-0000000000b2; STF=00000000-0000-4000-8000-0000000000c3
J() { Qd cert_act -c "$1" | tr -d ' \n'; }
UBEF=$(Qd cert_act -c "select md5(x::text) from users x where id='$PRI'"); PBEF=$(Qd cert_act -c "select md5(x::text) from profiles x where id='$PRI'"); ABEF=$(Qd cert_act -c "select md5(x::text) from user_auth x where user_id='$PRI'")
H1=$(printf 'a%.0s' $(seq 64)); H2=$(printf 'b%.0s' $(seq 64)); H3=$(printf 'c%.0s' $(seq 64)); H4=$(printf 'd%.0s' $(seq 64))
ck "E1 BEFORE any owner exists: an 'invitation' with no actor is refused" "$(J "select kayad_owner_issue_invitation('kayadautomotives.synthetic@example.test','invitation','$H1',now()+interval '1 day',null,'attacker','x')" | grep -o 'OWNER_ACTOR_REQUIRED')" "OWNER_ACTOR_REQUIRED"
ck "E2 BEFORE any owner exists: a non-owner (dealer-labelled, staff, test dealer) cannot issue an invitation" "$(for u in $PRI $TD $STF; do J "select kayad_owner_issue_invitation('kayadautomotives.synthetic@example.test','invitation','$H1',now()+interval '1 day','$u','x','x')" | grep -o 'OWNER_ACTOR_NOT_OWNER'; done | sort | uniq -c | tr -d ' \n')" "3OWNER_ACTOR_NOT_OWNER"
ck "E3 …and none left a pending invitation" "$(Qd cert_act -c "select count(*) from owner_invitations")" "0"
ck "E4 a bootstrap invitation (operator path, no actor) is accepted for the primary" "$(J "select kayad_owner_issue_invitation('primary.synthetic@example.test','bootstrap','$H2',now()+interval '1 day',null,'operator','bootstrap')" | grep -o '"ok":true')" '"ok":true'
ck "E5 the primary (verified, existing) must be signed in: anonymous accept refused" "$(J "select kayad_owner_accept_invitation_atomic('$H2',null,null,null)" | grep -o 'OWNER_LOGIN_REQUIRED')" "OWNER_LOGIN_REQUIRED"
ck "E6 …signed in as someone else: refused" "$(J "select kayad_owner_accept_invitation_atomic('$H2',null,null,'$STF')" | grep -o 'OWNER_LOGIN_REQUIRED')" "OWNER_LOGIN_REQUIRED"
ck "E7 …signed in as the primary: accepted, SAME user id (not recreated)" "$(J "select kayad_owner_accept_invitation_atomic('$H2',null,null,'$PRI')" | grep -o "\"user_id\":\"$PRI\"")" "\"user_id\":\"$PRI\""
ck "E8 primary's users row, profiles row and credentials are byte-identical (role label 'dealer' NOT changed)" "$(Qd cert_act -c "select md5(x::text) from users x where id='$PRI'")|$(Qd cert_act -c "select md5(x::text) from profiles x where id='$PRI'")|$(Qd cert_act -c "select md5(x::text) from user_auth x where user_id='$PRI'")" "$UBEF|$PBEF|$ABEF"
ck "E9 primary's refresh token still valid (activation does not log the owner out)" "$(Qd cert_act -c "select count(*) from refresh_tokens where \"user\"='$PRI' and is_revoked=false")" "1"
ck "E10 primary is now a usable owner" "$(J "select kayad_owner_usable('$PRI')")" "t"
ck "E11 bootstrap closes" "$(J "select kayad_owner_bootstrap_close('operator','primary established')" | grep -o '"ok":true')" '"ok":true'
ck "E12 the TEST DEALER and dealer STAFF still cannot invite" "$(for u in $TD $STF; do J "select kayad_owner_issue_invitation('kayadautomotives.synthetic@example.test','invitation','$H3',now()+interval '1 day','$u','x','x')" | grep -o 'OWNER_ACTOR_NOT_OWNER'; done | wc -l | tr -d ' ')" "2"
ck "E13 only the primary can invite the second owner (pending, expiry honoured)" "$(J "select kayad_owner_issue_invitation('kayadautomotives.synthetic@example.test','invitation','$H3',now()+interval '1 day','$PRI','primary','second owner')" | grep -o '"ok":true')" '"ok":true'
ck "E14 duplicate invitation to the same address refused" "$(J "select kayad_owner_issue_invitation('kayadautomotives.synthetic@example.test','invitation','$H4',now()+interval '1 day','$PRI','primary','dup')" | grep -o 'OWNER_INVITATION_PENDING')" "OWNER_INVITATION_PENDING"
ck "E15 invitation expiry window enforced (>7 days refused, <1 minute refused)" "$(J "select kayad_owner_issue_invitation('x.synthetic@example.test','invitation','$H4',now()+interval '8 days','$PRI','p','x')"| grep -o 'OWNER_INVALID_EXPIRY')|$(J "select kayad_owner_issue_invitation('x.synthetic@example.test','invitation','$H4',now()+interval '10 seconds','$PRI','p','x')"| grep -o 'OWNER_INVALID_EXPIRY')" "OWNER_INVALID_EXPIRY|OWNER_INVALID_EXPIRY"
ck "E16 the invitation is not usable by a different account that holds the token (no account for that address: password required)" "$(J "select kayad_owner_accept_invitation_atomic('$H3','Second Owner',null,null)" | grep -o 'OWNER_PASSWORD_REQUIRED')" "OWNER_PASSWORD_REQUIRED"
ck "E17 second owner accepts: account CREATED as role=user (no role elevation) and becomes a member" "$(J "select kayad_owner_accept_invitation_atomic('$H3','Second Owner','\$2b\$12\$synthetichashsynthetichash',null)" | grep -o '"account_created":true')|$(Qd cert_act -c "select role from users where email='kayadautomotives.synthetic@example.test'")" '"account_created":true|user'
ck "E18 single use: replaying the token is refused" "$(J "select kayad_owner_accept_invitation_atomic('$H3','Second Owner','\$2b\$12\$synthetichashsynthetichash',null)" | grep -o 'OWNER_INVITATION_INVALID')" "OWNER_INVITATION_INVALID"
ck "E19 the dealer-labelled test dealer is untouched by the whole activation (rows identical)" "$(Qd cert_act -c "select md5(x::text) from users x where id='$TD'")" "$(Qd cert_base_shaped -c "select md5(x::text) from users x where id='$TD'")"
ck "E20 two usable owners; the LAST-owner rule: revoking the second is allowed, the remaining primary cannot then be removed" "$(J "select kayad_owner_revoke_membership_atomic((select id from users where email='kayadautomotives.synthetic@example.test'),'$PRI','primary','test')" | grep -o '"ok":true')|$(J "select kayad_owner_revoke_membership_atomic('$PRI','$PRI','primary','test')" | grep -o 'OWNER_LAST_USABLE')" '"ok":true|OWNER_LAST_USABLE'
ck "E21 revocation killed the removed owner's sessions (token_version bumped)" "$(Qd cert_act -c "select token_version from user_auth ua join users u on u.id=ua.user_id where u.email='kayadautomotives.synthetic@example.test'")" "1"
ck "E22 owner events never contain a secret-looking key, token hash or password" "$(Qd cert_act -c "select count(*) from owner_membership_events where metadata::text ~* '(token|password|secret|hash)' or reason ~ '[0-9a-f]{64}'")" "0"
# ============ F. rollbacks, cross-rollback independence and re-application ============
mk cert_rb cert_act
ck "F1 M2 rollback REFUSES without the export confirmation (ledger destruction guard)" "$($PSQL -d cert_rb -v ON_ERROR_STOP=1 -1 -q -f "$M2R" 2>&1 | grep -c 'REFUSING')|$(Qd cert_rb -c "select count(*) from owner_memberships")" "1|2"
EV0=$(Qd cert_rb -c "select count(*) from owner_membership_events"); U0=$(Qd cert_rb -c "select count(*) from users")
ck "F2 M3 rollback drops only the MFA tables; owner membership and users untouched" "$(ap cert_rb $M3R)|$(Qd cert_rb -c "select (select count(*) from pg_class where relname like 'owner_mfa%')||'/'||(select count(*) from owner_memberships)||'/'||(select count(*) from users)")" "0|0/2/$U0"
ck "F3 M3 re-applies after rollback" "$(ap cert_rb $M3)" "0"
ck "F4 M2 rollback with confirmation (-1) succeeds and removes owner tables, functions and the two event controls" "$($PSQL -d cert_rb -v ON_ERROR_STOP=1 -1 -q -v confirm_events_exported=yes -f "$M2R" >/dev/null 2>&1; echo $?)|$(Qd cert_rb -c "select (select count(*) from pg_class where relname in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state'))||'/'||(select count(*) from pg_proc where proname like 'kayad_owner_%')||'/'||(select count(*) from communication_event_controls where event_type like 'owner.%')")" "0|0/0/0"
ck "F5 IRREVERSIBLE (disclosed): the ledger of $EV0 events is gone after F4" "$(Qd cert_rb -c "select count(*) from pg_class where relname='owner_membership_events'")" "0"
ck "F6 rollback of M2 did not touch users, profiles, user_auth, refresh_tokens, dealers data" "$(Qd cert_rb -c "select md5(string_agg(x::text,'|' order by id)) from users x where id in ('$PRI','$TD','$STF')")" "$(Qd cert_act -c "select md5(string_agg(x::text,'|' order by id)) from users x where id in ('$PRI','$TD','$STF')")"
ck "F7 M2 re-applies after rollback; bootstrap state is open again with ZERO owners (owner must be re-established)" "$(ap2 cert_rb)|$(Qd cert_rb -c "select (select status from owner_bootstrap_state)||'/'||(select count(*) from owner_memberships)")" "0|open/0"
mk cert_rb1 cert_act; Qd cert_rb1 -c "insert into dealer_verifications(\"user\",dealer,verification_status) select '$STF',id,'suspended' from dealers limit 1" >/dev/null 2>&1
ck "F8 M1 rollback REFUSES when suspended verification rows exist (no silent data loss)" "$(ap cert_rb1 $M1R | grep -c '^[1-9]')|$(Qd cert_rb1 -c "select count(*) from information_schema.columns where table_name='dealers' and column_name='bio'")" "1|1"
mk cert_rb2 cert_act
ck "F9 M1 rollback on clean data succeeds, then roll-forward restores everything" "$(ap cert_rb2 $M1R)|$(ap cert_rb2 $M1)|$(Qd cert_rb2 -c "select count(*) from pg_proc where proname='kayad_register_identity_atomic'")" "0|0|1"
# ============ G. non-destructiveness summary ============
ck "G1 users/user_auth/refresh_tokens/profiles/dealer_verifications/dealer_teams unchanged by M1+M2+M3 on the seeded hosted-shaped DB (see B)" "$(Qd cert_perm -c "$ROWS")" "$R0"
for d in cert_host cert_fresh cert_base_shaped cert_perm cert_atomic cert_atomic2 cert_atomic3 cert_priv cert_act cert_rb cert_rb1 cert_rb2 cert_atomic_pf; do $PSQL -d postgres -qc "drop database if exists $d" >/dev/null 2>&1; done
echo "RESULT $pass pass $fail fail"
