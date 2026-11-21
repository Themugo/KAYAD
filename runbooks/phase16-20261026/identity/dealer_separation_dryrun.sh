#!/usr/bin/env bash
# PHASE 16 - DRY RUN of the proposed system-owner / dealer-identity separation, on a DISPOSABLE database shaped like the two hosted rows
# (only structure and counts are reproduced - no real addresses, hashes or tokens). Proves: the operation is one transaction, touches only the
# users row, keeps every dependent row (auth, profile, sessions, audit, deliveries), is reversible from the recorded before-image, and that the
# second account (the test dealer) is untouched. NOTHING here connects to a hosted database.
# Usage: PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres ./dealer_separation_dryrun.sh <base_db_ending_disposable> [<logfile>]
set -u
BASE="${1:?base}"; LOG="${2:-/dev/stdout}"
case "${PGHOST:-}" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: host is not loopback"; exit 2;; esac
case "$BASE" in *_disposable) ;; *) echo "REFUSING: database must end with _disposable"; exit 2;; esac
exec > >(tee "$LOG") 2>&1
DB="kayad16_sep_$$_disposable"; pass=0; fail=0
q(){ psql -X -q -At -d "$DB" -c "$1" 2>&1 | tr -d '\n'; }
chk(){ local g; g="$(q "$2")"; if [ "$g" = "$3" ]; then pass=$((pass+1)); echo "PASS  $1"; else fail=$((fail+1)); echo "FAIL  $1 :: want [$3] got [$g]"; fi; }
cleanup(){ psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$DB\"" >/dev/null 2>&1; }; trap cleanup EXIT
psql -X -q -d postgres -c "CREATE DATABASE \"$DB\" TEMPLATE \"$BASE\"" || exit 2
# Hosted production carries CHECK users_superadmin_flag_consistency (role='superadmin' <=> super_admin) that NO repo migration creates (drift). The dry run adds it so
# the rehearsal matches the hosted constraint set.
psql -X -q -d "$DB" -c "ALTER TABLE users ADD CONSTRAINT users_superadmin_flag_consistency CHECK ((role = 'superadmin') = COALESCE(super_admin,false))" || exit 2
OWN=dad5a03a-8181-45d7-b540-798c01874a21; DLR=3ef47f31-0254-44a5-b141-4634ed9671c8   # the two hosted ids (identifiers only)
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
INSERT INTO users(id,name,email,role,status,email_verified,business_name,super_admin,last_login_at) VALUES
 ('$OWN','Owner Fixture','owner.fixture@example.test','dealer','pending',true,'Fixture Ltd',false,now()),
 ('$DLR','Dealer Fixture','dealer.fixture@example.test','dealer','pending',false,'FIXTURE DEALERS',false,null);
DELETE FROM dealers WHERE "user" IN ('$OWN','$DLR');  -- hosted has 0 dealers rows; the full-schema trigger auto-creates one, removed to mirror hosted
INSERT INTO user_auth(user_id,password) VALUES ('$OWN','x'),('$DLR','x');
-- profiles rows are created by the sync trigger on users insert (hosted: 1 each)
INSERT INTO refresh_tokens("user",token_hash,expires_at) SELECT '$OWN', md5(g::text), now()+interval '7 days' FROM generate_series(1,38) g;
INSERT INTO communication_deliveries(user_id,channel,event_type,recipient,recipient_hash,provider) SELECT '$OWN','email','fixture','masked','h','none' FROM generate_series(1,4);
SQL
chk "fixture: owner row is a dealer with dealer metadata and no dealers/verification rows" "select role||'/'||(select count(*) from dealers where \"user\"='$OWN')||'/'||(select count(*) from dealer_verifications where \"user\"='$OWN') from users where id='$OWN'" "dealer/0/0"
before="$(q "select count(*) from user_auth where user_id='$OWN'")/$(q "select count(*) from profiles where id='$OWN'")/$(q "select count(*) from refresh_tokens where \"user\"='$OWN'")/$(q "select count(*) from communication_deliveries where user_id='$OWN'")"
dealer_before="$(q "select md5(t::text) from users t where id='$DLR'")"
# --- the proposed operation (record-level, one transaction, guarded by the expected before-image)
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
CREATE TABLE _before AS SELECT id,role,super_admin,business_name,status FROM users WHERE id='$OWN';
BEGIN;
UPDATE users SET role='superadmin', super_admin=true WHERE id='$OWN' AND role='dealer' AND super_admin=false AND email_verified=true AND email='owner.fixture@example.test';
COMMIT;
SQL
chk "exactly the owner row changed to superadmin/super_admin=true" "select role||'/'||super_admin from users where id='$OWN'" "superadmin/true"
chk "business_name and status untouched by default (clearing is a separate, optional decision)" "select business_name||'/'||status from users where id='$OWN'" "Fixture Ltd/pending"
after="$(q "select count(*) from user_auth where user_id='$OWN'")/$(q "select count(*) from profiles where id='$OWN'")/$(q "select count(*) from refresh_tokens where \"user\"='$OWN'")/$(q "select count(*) from communication_deliveries where user_id='$OWN'")"
[ "$before" = "$after" ] && { pass=$((pass+1)); echo "PASS  dependent row counts unchanged ($after)"; } || { fail=$((fail+1)); echo "FAIL  dependents changed $before -> $after"; }
chk "the other account (test dealer) is byte-identical" "select md5(t::text) from users t where id='$DLR'" "$dealer_before"
chk "no users row was created or removed" "select count(*) from users where id in ('$OWN','$DLR')" "2"
chk "DB constraint is satisfied (role='superadmin' <=> super_admin)" "select count(*) from users where (role='superadmin') <> super_admin" "0"
chk "guard: re-running the operation changes nothing (idempotent)" "with u as (update users set role='superadmin', super_admin=true where id='$OWN' and role='dealer' and super_admin=false returning 1) select count(*) from u" "0"
if psql -X -q -d "$DB" -c "update users set role='superadmin', super_admin=false where id='$OWN'" 2>&1 | grep -q users_superadmin_flag_consistency; then pass=$((pass+1)); echo "PASS  a partial change (role without flag) is rejected by the database constraint"; else fail=$((fail+1)); echo "FAIL  partial change was not rejected"; fi
# --- rollback from the before-image
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
BEGIN;
UPDATE users u SET role=b.role, super_admin=b.super_admin, business_name=b.business_name, status=b.status FROM _before b WHERE u.id=b.id AND u.id='$OWN';
COMMIT;
SQL
chk "rollback restores the exact original role/flag/business/status" "select role||'/'||super_admin||'/'||business_name||'/'||status from users where id='$OWN'" "dealer/false/Fixture Ltd/pending"
echo; echo "RESULT pass=$pass fail=$fail"; [ "$fail" -eq 0 ]
