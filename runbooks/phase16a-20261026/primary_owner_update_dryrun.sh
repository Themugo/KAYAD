#!/usr/bin/env bash
# PHASE 16A - DRY RUN of the exact proposed primary-owner correction (users + profiles, one guarded transaction) on a DISPOSABLE database shaped
# like the hosted rows (structure/counts only; fictional address; no hashes/tokens). Run twice per invocation: once with the HOSTED trigger set
# (only trg_sync_profile_from_user [INSERT] and the two updated_at triggers - no role-sync triggers) and once with the REPO trigger set.
# NOTHING here connects to a hosted database.   Usage: PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres ./primary_owner_update_dryrun.sh <base_db_ending_disposable> [logfile]
set -u
BASE="${1:?base}"; LOG="${2:-/dev/stdout}"
case "${PGHOST:-}" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: host is not loopback"; exit 2;; esac
case "$BASE" in *_disposable) ;; *) echo "REFUSING: database must end with _disposable"; exit 2;; esac
if [ "$LOG" != /dev/stdout ]; then exec > >(tee "$LOG") 2>&1; fi
pass=0; fail=0; DB=""
OWN=dad5a03a-8181-45d7-b540-798c01874a21; DLR=3ef47f31-0254-44a5-b141-4634ed9671c8   # the two hosted ids (identifiers only)
q(){ psql -X -q -At -d "$DB" -c "$1" 2>&1 | tr -d '\n'; }
chk(){ local g; g="$(q "$2")"; if [ "$g" = "$3" ]; then pass=$((pass+1)); echo "PASS  [$VARIANT] $1"; else fail=$((fail+1)); echo "FAIL  [$VARIANT] $1 :: want [$3] got [$g]"; fi; }
cleanup(){ [ -n "$DB" ] && psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$DB\"" >/dev/null 2>&1; }; trap cleanup EXIT
run(){ VARIANT="$1"; DB="kayad16a_own_${1}_$$_disposable"
psql -X -q -d postgres -c "CREATE DATABASE \"$DB\" TEMPLATE \"$BASE\"" || exit 2
psql -X -q -d "$DB" -c "ALTER TABLE users ADD CONSTRAINT users_superadmin_flag_consistency CHECK ((role = 'superadmin') = COALESCE(super_admin,false))" || exit 2   # exists on hosted only
if [ "$1" = hosted ]; then psql -X -q -d "$DB" -c "DROP TRIGGER IF EXISTS trg_sync_profile_role_from_user ON users; DROP TRIGGER IF EXISTS trg_sync_dealer_profile_from_user ON users; DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles"; fi
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
INSERT INTO users(id,name,email,role,status,email_verified,business_name,super_admin,last_login_at) VALUES
 ('$OWN','Owner Fixture','primary.fixture@example.test','dealer','pending',true,'Fixture Ltd',false,now()),
 ('$DLR','Dealer Fixture','dealer.fixture@example.test','dealer','pending',false,'FIXTURE DEALERS',false,null);
DELETE FROM dealers WHERE "user" IN ('$OWN','$DLR'); DELETE FROM dealer_verifications WHERE "user" IN ('$OWN','$DLR');
INSERT INTO user_auth(user_id,password) VALUES ('$OWN','x'),('$DLR','x');
INSERT INTO refresh_tokens("user",token_hash,expires_at) SELECT '$OWN', md5(g::text), now()+interval '7 days' FROM generate_series(1,38) g;
UPDATE refresh_tokens SET revoked_at=now() WHERE "user"='$OWN' AND token_hash IN (SELECT md5(g::text) FROM generate_series(3,38) g);
SQL
chk "fixture: primary is a verified dealer-labelled account, profile role dealer, no dealers/verification rows" "select u.role||'/'||u.super_admin||'/'||u.email_verified||'/'||p.role||'/'||(select count(*) from dealers where \"user\"='$OWN')||'/'||(select count(*) from dealer_verifications where \"user\"='$OWN') from users u join profiles p on p.id=u.id where u.id='$OWN'" "dealer/false/true/dealer/0/0"
dep(){ echo "$(q "select count(*) from user_auth where user_id='$OWN'")/$(q "select count(*) from profiles where id='$OWN'")/$(q "select count(*) from refresh_tokens where \"user\"='$OWN'")/$(q "select count(*) from refresh_tokens where \"user\"='$OWN' and revoked_at is null")/$(q "select md5(password) from user_auth where user_id='$OWN'")/$(q "select status||business_name from users where id='$OWN'")"; }
before="$(dep)"; dealer_before="$(q "select md5(t::text)||(select md5(p::text) from profiles p where id='$DLR') from users t where id='$DLR'")"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
CREATE TABLE _before_users AS SELECT * FROM users WHERE id='$OWN';
CREATE TABLE _before_profiles AS SELECT * FROM profiles WHERE id='$OWN';
SQL
# ---------------- THE PROPOSED OPERATION (identical text to the approval report) ----------------
OUT=$(psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" <<SQL
BEGIN;
WITH u AS (
  UPDATE public.users SET role = 'superadmin', super_admin = true
   WHERE id = '$OWN' AND role = 'dealer' AND super_admin = false AND email_verified = true AND is_banned IS NOT TRUE AND deactivated_at IS NULL
  RETURNING id),
p AS (
  UPDATE public.profiles SET role = 'superadmin'
   WHERE id = '$OWN' AND role IN ('dealer','superadmin') AND EXISTS (SELECT 1 FROM u)
  RETURNING id)
SELECT 'users=' || (SELECT count(*) FROM u) || ' profiles=' || (SELECT count(*) FROM p);
COMMIT;
SQL
); echo "     operation reported: $OUT"
[ "$OUT" = "users=1 profiles=1" ] && { pass=$((pass+1)); echo "PASS  [$VARIANT] operation touched exactly 1 users row and 1 profiles row"; } || { fail=$((fail+1)); echo "FAIL  [$VARIANT] operation counts: $OUT"; }
chk "users.role/super_admin and profiles.role all agree = superadmin/true/superadmin" "select u.role||'/'||u.super_admin||'/'||p.role from users u join profiles p on p.id=u.id where u.id='$OWN'" "superadmin/true/superadmin"
[ "$before" = "$(dep)" ] && { pass=$((pass+1)); echo "PASS  [$VARIANT] credentials, status, business name, profile count and ALL session rows (active+revoked) unchanged"; } || { fail=$((fail+1)); echo "FAIL  [$VARIANT] dependents changed"; }
chk "the test dealer (users + profiles row) is byte-identical" "select md5(t::text)||(select md5(p::text) from profiles p where id='$DLR') from users t where id='$DLR'" "$dealer_before"
chk "no users/profiles row created or removed" "select (select count(*) from users where id in ('$OWN','$DLR'))||'/'||(select count(*) from profiles where id in ('$OWN','$DLR'))" "2/2"
chk "re-running the operation changes nothing (guard role='dealer' no longer true)" "with u as (update users set role='superadmin', super_admin=true where id='$OWN' and role='dealer' and super_admin=false returning 1) select count(*) from u" "0"
psql -X -q -d "$DB" -c "update users set role='superadmin', super_admin=false where id='$OWN'" 2>&1 | grep -q users_superadmin_flag_consistency && { pass=$((pass+1)); echo "PASS  [$VARIANT] a half-applied change (role without flag) is rejected by the hosted CHECK constraint"; } || { fail=$((fail+1)); echo "FAIL  [$VARIANT] half-applied change was not rejected"; }
chk "verification query V1 returns the expected single consistent row" "select count(*) from users u join profiles p on p.id=u.id where u.id='$OWN' and u.role='superadmin' and u.super_admin and p.role='superadmin' and u.email_verified" "1"
# ---------------- ROLLBACK (identical text to the approval report) ----------------
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<SQL
BEGIN;
UPDATE public.users SET role = 'dealer', super_admin = false WHERE id = '$OWN' AND role = 'superadmin' AND super_admin = true;
UPDATE public.profiles SET role = 'dealer' WHERE id = '$OWN' AND role = 'superadmin';
COMMIT;
SQL
chk "rollback restores users and profiles to the recorded before-image (every column except the trigger-maintained updated_at)" "select ((select to_jsonb(u)-'updated_at' from users u where id='$OWN') = (select to_jsonb(b)-'updated_at' from _before_users b) and (select to_jsonb(p)-'updated_at' from profiles p where id='$OWN') = (select to_jsonb(b)-'updated_at' from _before_profiles b))::text" "true"
chk "rollback restores role/flag/profile role exactly (updated_at may differ - it is trigger-maintained)" "select u.role||'/'||u.super_admin||'/'||p.role||'/'||u.status||'/'||u.business_name from users u join profiles p on p.id=u.id where u.id='$OWN'" "dealer/false/dealer/pending/Fixture Ltd"
chk "the roll-forward is repeatable after a rollback" "with u as (update users set role='superadmin', super_admin=true where id='$OWN' and role='dealer' and super_admin=false and email_verified returning 1) select count(*) from u" "1"
cleanup; DB=""; }
run hosted; run repo
echo; echo "RESULT pass=$pass fail=$fail"; [ "$fail" -eq 0 ]
