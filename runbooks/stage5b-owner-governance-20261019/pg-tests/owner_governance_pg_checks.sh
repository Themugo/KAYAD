#!/usr/bin/env bash
# STAGE 5B — real-PostgreSQL checks of the owner-governance migration candidate. DISPOSABLE DATABASE ONLY.
# Usage: PGHOST=127.0.0.1 PGPORT=54339 PGUSER=postgres ./owner_governance_pg_checks.sh <base_db_ending_disposable> <migration.sql> [<logfile>]
set -u
BASE="${1:?base database (clone template) name}"; SQL="${2:?candidate migration}"; LOG="${3:-/dev/stdout}"
: "${PGHOST:?}"; : "${PGPORT:?}"
case "$PGHOST" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: host is not loopback"; exit 2;; esac
case "$BASE" in *_disposable) ;; *) echo "REFUSING: database must end with _disposable"; exit 2;; esac
DB="kayad5b_gov_$$_disposable"
exec > >(tee "$LOG") 2>&1
pass=0; fail=0
q()  { psql -X -q -At -v ON_ERROR_STOP=0 -d "$DB" -c "$1" 2>&1; }
chk(){ local name="$1" sql="$2" want="$3" got; got="$(q "$sql" | tr -d '\n')"; if [ "$got" = "$want" ]; then pass=$((pass+1)); echo "PASS  $name"; else fail=$((fail+1)); echo "FAIL  $name :: want [$want] got [$got]"; fi; }
chkre(){ local name="$1" sql="$2" re="$3" got; got="$(q "$sql" | tr -d '\n')"; if [[ "$got" =~ $re ]]; then pass=$((pass+1)); echo "PASS  $name"; else fail=$((fail+1)); echo "FAIL  $name :: want ~[$re] got [$got]"; fi; }
cleanup(){ psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$DB\"" >/dev/null 2>&1; }
trap cleanup EXIT
psql -X -q -d postgres -c "CREATE DATABASE \"$DB\" TEMPLATE \"$BASE\"" || { echo "cannot clone base"; exit 2; }

echo "== migration apply =="
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$SQL" >/dev/null 2>&1 && { pass=$((pass+1)); echo "PASS  candidate applies to a clean replay of the 181 migrations"; } || { fail=$((fail+1)); echo "FAIL  candidate apply"; }
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$SQL" >/dev/null 2>&1 && { pass=$((pass+1)); echo "PASS  candidate re-applies idempotently"; } || { fail=$((fail+1)); echo "FAIL  candidate re-apply"; }

psql -X -q -d "$DB" >/dev/null <<'SQL'
CREATE SCHEMA t;
CREATE FUNCTION t.h(x text) RETURNS text LANGUAGE sql AS $$ SELECT encode(digest(x,'sha256'),'hex') $$;
CREATE FUNCTION t.mk(p_email text, p_verified boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid; BEGIN
  INSERT INTO public.users(name,email,role,status,email_verified) VALUES ('T '||p_email,p_email,'user','approved',p_verified) RETURNING id INTO v;
  INSERT INTO public.user_auth(user_id,password,token_version) VALUES (v,'$2a$12$OLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLD',0);
  RETURN v; END $$;
-- direct owner (bypasses the write path; used only to arrange fixtures)
CREATE FUNCTION t.own(p_email text) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := t.mk(p_email,true); BEGIN
  INSERT INTO public.owner_memberships(user_id,email,status,added_via,added_by_label) VALUES (v,p_email,'active','bootstrap','fixture'); RETURN v; END $$;
CREATE FUNCTION t.reset() RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.owner_invitations; DELETE FROM public.owner_memberships; UPDATE public.owner_bootstrap_state SET status='open', closed_at=NULL, closed_by=NULL, closed_reason=NULL; $$;
SQL

echo "== privileges / RLS =="
chk "RLS enabled on all four tables" "select count(*) from pg_class where relname in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state') and relrowsecurity" "4"
chk "anon cannot read memberships" "set role anon; select count(*) from public.owner_memberships" "ERROR:  permission denied for table owner_memberships"
chk "authenticated cannot read invitations" "set role authenticated; select count(*) from public.owner_invitations" "ERROR:  permission denied for table owner_invitations"
chk "authenticated cannot execute accept" "set role authenticated; select public.kayad_owner_accept_invitation_atomic('x','x','x',null)" "ERROR:  permission denied for function kayad_owner_accept_invitation_atomic"
chk "anon cannot execute snapshot" "set role anon; select public.kayad_owner_snapshot()" "ERROR:  permission denied for function kayad_owner_snapshot"
chk "service_role can read memberships" "set role service_role; select count(*) from public.owner_memberships" "0"
chk "service_role cannot INSERT a membership directly" "set role service_role; insert into public.owner_memberships(user_id,email,status,added_via) values (gen_random_uuid(),'x@y.zz','active','bootstrap')" "ERROR:  permission denied for table owner_memberships"
chk "service_role cannot UPDATE an invitation directly" "set role service_role; update public.owner_invitations set status='accepted'" "ERROR:  permission denied for table owner_invitations"
chk "service_role can call snapshot" "set role service_role; select (public.kayad_owner_snapshot())->>'installed'" "true"
chk "internal helper not executable by service_role" "set role service_role; select public.kayad_owner_usable(gen_random_uuid())" "ERROR:  permission denied for function kayad_owner_usable"

echo "== audit ledger =="
q "select public.kayad_owner_log_event('probe','success',null,'pg-test',null,null,'x','{}')" >/dev/null
chkre "events are append-only (UPDATE refused)" "update public.owner_membership_events set reason='x'" "^ERROR:  owner_membership_events is append-only"
chkre "events are append-only (DELETE refused)" "delete from public.owner_membership_events" "^ERROR:  owner_membership_events is append-only"
chkre "events are append-only (TRUNCATE refused)" "truncate public.owner_membership_events" "^ERROR:  owner_membership_events is append-only"
chkre "secret-looking metadata key is rejected" "select public.kayad_owner_log_event('probe','success',null,'pg-test',null,null,'x','{\"token\":\"abc\"}')" "violates check constraint"
chkre "secret-looking nested key is rejected" "select public.kayad_owner_log_event('probe','success',null,'pg-test',null,null,'x','{\"a\":{\"password_hash\":\"abc\"}}')" "violates check constraint"

echo "== bootstrap =="
A="a1@owners.test"; B="b2@owners.test"; C="c3@owners.test"
chk "bootstrap invitation (no actor) issues" "select (public.kayad_owner_issue_invitation('$A','bootstrap',t.h('tokA'),now()+interval '1 day',null,'bootstrap-cli:tester','boot'))->>'ok'" "true"
chk "duplicate pending invitation refused" "select (public.kayad_owner_issue_invitation('$A','bootstrap',t.h('tokA2'),now()+interval '1 day',null,'bootstrap-cli:tester','boot'))->>'code'" "OWNER_INVITATION_PENDING"
chk "unattended 'invitation' kind refused" "select (public.kayad_owner_issue_invitation('x@owners.test','invitation',t.h('tokX'),now()+interval '1 day',null,'cli',null))->>'code'" "OWNER_ACTOR_REQUIRED"
chk "invalid expiry refused (past)" "select (public.kayad_owner_issue_invitation('y@owners.test','bootstrap',t.h('tokY'),now()-interval '1 day',null,'cli',null))->>'code'" "OWNER_INVALID_EXPIRY"
chk "invalid expiry refused (too far)" "select (public.kayad_owner_issue_invitation('y@owners.test','bootstrap',t.h('tokY'),now()+interval '30 days',null,'cli',null))->>'code'" "OWNER_INVALID_EXPIRY"
chk "accept without password for new account refused" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokA'),'Owner A',null,null))->>'code'" "OWNER_PASSWORD_REQUIRED"
chk "accept creates verified account + membership" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokA'),'Owner A','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null))->>'account_created'" "true"
chk "created account is role=user, verified, approved" "select role||','||email_verified||','||status from public.users where email='$A'" "user,true,approved"
chk "membership is active, via bootstrap" "select status||','||added_via from public.owner_memberships where email='$A'" "active,bootstrap"
chk "replaying the same token is refused" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokA'),'Owner A','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null))->>'code'" "OWNER_INVITATION_INVALID"
chk "unknown token refused (same code, no oracle)" "select (public.kayad_owner_accept_invitation_atomic(t.h('nope'),'x','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null))->>'code'" "OWNER_INVITATION_INVALID"
chk "snapshot lists the usable owner" "select (public.kayad_owner_snapshot())->'owners'->0->>'usable'" "true"

echo "== squatter takeover is neutralised =="
UB=$(q "select t.mk('$B', false)"); q "insert into public.refresh_tokens(\"user\",token_hash,family_id,session_id,expires_at) values ('$UB','h1',gen_random_uuid(),gen_random_uuid(),now()+interval '1 day')" >/dev/null
q "select public.kayad_owner_issue_invitation('$B','bootstrap',t.h('tokB'),now()+interval '1 day',null,'bootstrap-cli:tester','boot')" >/dev/null
chk "unverified pre-existing row: accept resets credentials" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokB'),'ignored','\$2a\$12\$MINEMINEMINEMINEMINEMINEMINEMINEMINEMINEMINEMINEMINEMIN',null))->>'credentials_reset'" "true"
chk "…password replaced" "select (password like '\$2a\$12\$MINE%')::text from public.user_auth where user_id='$UB'" "true"
chk "…token_version bumped" "select token_version::text from public.user_auth where user_id='$UB'" "1"
chk "…existing refresh tokens revoked" "select count(*) from public.refresh_tokens where \"user\"='$UB' and is_revoked=false" "0"
chk "…mailbox now verified" "select email_verified::text from public.users where id='$UB'" "true"

echo "== existing verified account (third owner) =="
q "select t.mk('$C', true)" >/dev/null; OA=$(q "select id from public.users where email='$A'"); UC=$(q "select id from public.users where email='$C'")
chk "owner A invites verified user C" "select (public.kayad_owner_issue_invitation('$C','invitation',t.h('tokC'),now()+interval '1 day','$OA','owner:$A',null))->>'ok'" "true"
chk "accept without being signed in refused" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokC'),null,null,null))->>'code'" "OWNER_LOGIN_REQUIRED"
chk "accept signed in as someone else refused" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokC'),null,null,'$OA'))->>'code'" "OWNER_LOGIN_REQUIRED"
chk "accept signed in as C succeeds" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokC'),null,null,'$UC'))->>'ok'" "true"
chk "C's credentials were NOT touched" "select token_version::text||(password like '\$2a\$12\$OLD%')::text from public.user_auth where user_id='$UC'" "0true"
chk "membership records who invited" "select added_by_label from public.owner_memberships where email='$C'" "owner:$A"

echo "== bootstrap close =="
q "select public.kayad_owner_issue_invitation('late@owners.test','bootstrap',t.h('tokL'),now()+interval '1 day',null,'cli',null)" >/dev/null
chk "bootstrap closes once an owner is usable" "select (public.kayad_owner_bootstrap_close('system:auto','done'))->>'ok'" "true"
chk "pending bootstrap invitation is revoked by the close" "select status from public.owner_invitations where email='late@owners.test'" "revoked"
chk "closed bootstrap refuses new invitations" "select (public.kayad_owner_issue_invitation('z@owners.test','bootstrap',t.h('tokZ'),now()+interval '1 day',null,'cli',null))->>'code'" "OWNER_BOOTSTRAP_CLOSED"

echo "== authorization of the write path =="
OB=$UB
chk "non-owner cannot invite" "select (public.kayad_owner_issue_invitation('n@owners.test','invitation',t.h('tokN'),now()+interval '1 day',gen_random_uuid(),'x',null))->>'code'" "OWNER_ACTOR_NOT_OWNER"
chk "non-owner cannot revoke" "select (public.kayad_owner_revoke_membership_atomic('$OA',gen_random_uuid(),'x','r'))->>'code'" "OWNER_ACTOR_NOT_OWNER"
chk "owner cannot issue a bootstrap invitation" "select (public.kayad_owner_issue_invitation('n@owners.test','bootstrap',t.h('tokN'),now()+interval '1 day','$OA','x',null))->>'code'" "OWNER_ACTOR_NOT_OWNER"
chk "already-active identity cannot be re-invited" "select (public.kayad_owner_issue_invitation('$C','invitation',t.h('tokC9'),now()+interval '1 day','$OA','x',null))->>'code'" "OWNER_ALREADY_ACTIVE"
chk "emergency recovery refused while a usable owner exists" "select (public.kayad_owner_issue_invitation('r@owners.test','recovery',t.h('tokR'),now()+interval '1 day',null,'emergency-cli:t:inc1',null))->>'code'" "OWNER_RECOVERY_NOT_NEEDED"

echo "== last-owner / removal =="
chk "three usable owners" "select public.kayad_owner_usable_count()::text" "3"
chk "removing owner C works" "select (public.kayad_owner_revoke_membership_atomic('$UC','$OA','owner:$A','test'))->>'usable_after'" "2"
chk "removal bumps token_version in the same transaction" "select token_version::text from public.user_auth where user_id='$UC'" "1"
chk "removal revokes refresh tokens" "select count(*) from public.refresh_tokens where \"user\"='$UC' and is_revoked=false" "0"
chk "removed identity is no longer usable" "select public.kayad_owner_usable('$UC')::text" "false"
chk "removed owner cannot act" "select (public.kayad_owner_issue_invitation('q@owners.test','invitation',t.h('tokQ'),now()+interval '1 day','$UC','x',null))->>'code'" "OWNER_ACTOR_NOT_OWNER"
chk "self-removal allowed while another usable owner remains" "select (public.kayad_owner_revoke_membership_atomic('$OB','$OB','owner:$B','leaving'))->>'ok'" "true"
chk "LAST usable owner cannot be removed (by self)" "select (public.kayad_owner_revoke_membership_atomic('$OA','$OA','owner:$A','x'))->>'code'" "OWNER_LAST_USABLE"
chk "refusal is audited" "select count(*) from public.owner_membership_events where action='membership_revoke' and result='denied' and reason like '%last usable%'" "1"

echo "== unusable owners / emergency path =="
q "update public.users set email_verified=false where id='$OA'" >/dev/null
chk "owner whose mailbox lost verification is not usable" "select public.kayad_owner_usable_count()::text" "0"
chk "…so emergency recovery is permitted" "select (public.kayad_owner_issue_invitation('$A','recovery',t.h('tokE'),now()+interval '1 day',null,'emergency-cli:t:inc2','inc2'))->>'ok'" "true"
chk "…and the emergency issue is audited with the incident label" "select count(*) from public.owner_membership_events where actor_label='emergency-cli:t:inc2' and result='success'" "1"
chk "…recovery accept resets credentials of the unusable owner and restores a usable one" "select (public.kayad_owner_accept_invitation_atomic(t.h('tokE'),'Recovered','\$2a\$12\$RECRECRECRECRECRECRECRECRECRECRECRECRECRECRECRECRECREC',null))->>'credentials_reset'" "true"
chk "…usable owners = 1 again" "select public.kayad_owner_usable_count()::text" "1"
chk "…the stale membership row was superseded, not deleted" "select count(*) from public.owner_memberships where user_id='$OA' and status='revoked' and revoked_by_label='recovery-superseded'" "1"
chk "…credentials replaced and sessions invalidated" "select (password like '\$2a\$12\$REC%')::text||token_version::text from public.user_auth where user_id='$OA'" "true1"
q "update public.users set email_verified=true where id='$OA'" >/dev/null
q "update public.users set email='changed@owners.test' where id='$OA'" >/dev/null
chk "owner whose account e-mail changed is not usable" "select public.kayad_owner_usable('$OA')::text" "false"
q "update public.users set email='$A' where id='$OA'" >/dev/null
q "update public.users set is_banned=true where id='$OA'" >/dev/null
chk "banned owner is not usable" "select public.kayad_owner_usable('$OA')::text" "false"
q "update public.users set is_banned=false where id='$OA'" >/dev/null

echo "== expiry, resend, cooldown =="
q "select t.reset()" >/dev/null; OA=$(q "select t.own('own1@owners.test')")
chk "owner invites" "select (public.kayad_owner_issue_invitation('inv@owners.test','invitation',t.h('t1'),now()+interval '2 minutes','$OA','owner:own1',null))->>'ok'" "true"
IID=$(q "select id from public.owner_invitations where email='inv@owners.test'")
chk "resend inside cooldown refused" "select (public.kayad_owner_resend_invitation('$IID',t.h('t2'),now()+interval '1 day','$OA','owner:own1',60))->>'code'" "OWNER_INVITATION_COOLDOWN"
chk "resend with no cooldown rotates the token" "select (public.kayad_owner_resend_invitation('$IID',t.h('t2'),now()+interval '1 day','$OA','owner:own1',0))->>'ok'" "true"
chk "old token is dead after resend" "select (public.kayad_owner_accept_invitation_atomic(t.h('t1'),'N','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null))->>'code'" "OWNER_INVITATION_INVALID"
q "update public.owner_invitations set expires_at = now() - interval '1 second' where id='$IID'" >/dev/null
chk "expired token is refused as expired" "select (public.kayad_owner_accept_invitation_atomic(t.h('t2'),'N','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null))->>'code'" "OWNER_INVITATION_EXPIRED"
chk "…and marked expired" "select status from public.owner_invitations where id='$IID'" "expired"
chk "expired invitation can be resent" "select (public.kayad_owner_resend_invitation('$IID',t.h('t3'),now()+interval '1 day','$OA','owner:own1',0))->>'ok'" "true"
chk "after resend the new token works" "select (public.kayad_owner_accept_invitation_atomic(t.h('t3'),'N','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null))->>'ok'" "true"
chk "an accepted invitation cannot be resent" "select (public.kayad_owner_resend_invitation('$IID',t.h('t4'),now()+interval '1 day','$OA','owner:own1',0))->>'code'" "OWNER_INVITATION_CLOSED"
chk "a pending invitation can be revoked by an owner" "select (public.kayad_owner_issue_invitation('rev@owners.test','invitation',t.h('t5'),now()+interval '1 day','$OA','owner:own1',null))->>'ok'" "true"
RID=$(q "select id from public.owner_invitations where email='rev@owners.test'")
chk "…revoke works" "select (public.kayad_owner_revoke_invitation('$RID','$OA','owner:own1','changed mind'))->>'ok'" "true"
chk "…and a revoked token cannot be accepted" "select (public.kayad_owner_accept_invitation_atomic(t.h('t5'),'N','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null))->>'code'" "OWNER_INVITATION_INVALID"
q "select t.mk('sus@owners.test', true)" >/dev/null; q "update public.users set is_banned=true where email='sus@owners.test'" >/dev/null
q "select public.kayad_owner_issue_invitation('sus@owners.test','invitation',t.h('t6'),now()+interval '1 day','$OA','owner:own1',null)" >/dev/null
chk "suspended/banned account cannot become an owner" "select (public.kayad_owner_accept_invitation_atomic(t.h('t6'),'N',null,null))->>'code'" "OWNER_ACCOUNT_BLOCKED"
chk "that denial left no membership behind" "select count(*) from public.owner_memberships where email='sus@owners.test'" "0"

echo "== concurrency (separate sessions, real lock contention) =="
race() { # $1 = sql for session 1, $2 = sql for session 2 ; each runs inside an open transaction that holds the lock briefly
  ( psql -X -q -At -d "$DB" <<SQL1 ) > /tmp/race1.$$ 2>&1 &
BEGIN; $1 SELECT pg_sleep(0.6); COMMIT;
SQL1
  local p1=$!
  ( sleep 0.15; psql -X -q -At -d "$DB" <<SQL2 ) > /tmp/race2.$$ 2>&1 &
BEGIN; $2 COMMIT;
SQL2
  local p2=$!
  wait "$p1" "$p2"
}
okOrCode='CASE WHEN (r->>'"'"'ok'"'"')='"'"'true'"'"' THEN '"'"'true'"'"' ELSE r->>'"'"'code'"'"' END'
for i in 1 2 3 4 5; do
  q "select t.reset()" >/dev/null
  X=$(q "select t.own('x$i@owners.test')"); Y=$(q "select t.own('y$i@owners.test')")
  race "SELECT (SELECT $okOrCode FROM (SELECT public.kayad_owner_revoke_membership_atomic('$Y','$X','owner:x','race') r) s);" \
       "SELECT (SELECT $okOrCode FROM (SELECT public.kayad_owner_revoke_membership_atomic('$X','$Y','owner:y','race') r) s);"
  r1=$(grep -E '^(true|OWNER_)' /tmp/race1.$$ | head -1); r2=$(grep -E '^(true|OWNER_)' /tmp/race2.$$ | head -1)
  chk "round $i: mutual removal leaves exactly one usable owner ($r1 / $r2)" "select public.kayad_owner_usable_count()::text" "1"
  if [ "$r1" = "true" ] && [ "$r2" != "true" ]; then pass=$((pass+1)); echo "PASS  round $i: exactly one removal succeeded"; else fail=$((fail+1)); echo "FAIL  round $i: results [$r1] [$r2]"; fi
done
q "select t.reset()" >/dev/null; O=$(q "select t.own('own9@owners.test')")
race "SELECT (SELECT $okOrCode FROM (SELECT public.kayad_owner_issue_invitation('dup@owners.test','invitation',t.h('d1'),now()+interval '1 day','$O','owner:o',null) r) s);" \
     "SELECT (SELECT $okOrCode FROM (SELECT public.kayad_owner_issue_invitation('dup@owners.test','invitation',t.h('d2'),now()+interval '1 day','$O','owner:o',null) r) s);"
r1=$(grep -E '^(true|OWNER_)' /tmp/race1.$$ | head -1); r2=$(grep -E '^(true|OWNER_)' /tmp/race2.$$ | head -1)
chk "concurrent duplicate invitation → one pending row only ($r1 / $r2)" "select count(*) from public.owner_invitations where email='dup@owners.test' and status='pending'" "1"
if [ "$r1" = "true" ] && [ "$r2" = "OWNER_INVITATION_PENDING" ]; then pass=$((pass+1)); echo "PASS  duplicate race: one issued, one refused"; else fail=$((fail+1)); echo "FAIL  duplicate race [$r1] [$r2]"; fi
q "select public.kayad_owner_issue_invitation('twice@owners.test','invitation',t.h('tw'),now()+interval '1 day','$O','owner:o',null)" >/dev/null
race "SELECT (SELECT $okOrCode FROM (SELECT public.kayad_owner_accept_invitation_atomic(t.h('tw'),'Tw','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null) r) s);" \
     "SELECT (SELECT $okOrCode FROM (SELECT public.kayad_owner_accept_invitation_atomic(t.h('tw'),'Tw','\$2a\$12\$NEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWNEWN',null) r) s);"
r1=$(grep -E '^(true|OWNER_)' /tmp/race1.$$ | head -1); r2=$(grep -E '^(true|OWNER_)' /tmp/race2.$$ | head -1)
chk "concurrent double-accept of one token → one membership ($r1 / $r2)" "select count(*) from public.owner_memberships where email='twice@owners.test' and status='active'" "1"
chk "…and exactly one account" "select count(*) from public.users where email='twice@owners.test'" "1"
rm -f /tmp/race1.$$ /tmp/race2.$$

echo "== audit completeness =="
chkre "every state change has an event row (issue/accept/revoke/resend/close all present)" "select string_agg(distinct action, ',' order by action) from public.owner_membership_events" "bootstrap_close.*invitation_accept.*invitation_issue.*invitation_resend.*invitation_revoke.*membership_activate.*membership_revoke"
chk "no event row carries a secret-looking key" "select count(*) from public.owner_membership_events where metadata::text ~* '\"[a-z_]*(token|password|secret|hash|cookie)[a-z_]*\"\\s*:'" "0"
chk "events store hashes nowhere (no 64-hex string in any column)" "select count(*) from public.owner_membership_events where metadata::text ~ '[0-9a-f]{64}' or coalesce(reason,'') ~ '[0-9a-f]{64}'" "0"

echo
echo "RESULT pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
