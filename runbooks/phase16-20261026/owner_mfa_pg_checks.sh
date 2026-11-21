#!/usr/bin/env bash
# PHASE 16 - real-PostgreSQL checks of the owner-MFA migration candidate: fresh install, upgrade from the Phase 15 schema (the base IS the
# Phase 15 schema), idempotent re-apply, privileges/RLS, constraints, cascade behaviour, rollback. DISPOSABLE DATABASE ONLY.
# Usage: PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres ./owner_mfa_pg_checks.sh <base_db_ending_disposable> <candidate.sql> <rollback.sql> [<logfile>]
set -u
BASE="${1:?base}"; SQL="${2:?candidate}"; RB="${3:?rollback}"; LOG="${4:-/dev/stdout}"
case "${PGHOST:-}" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: host is not loopback"; exit 2;; esac
case "$BASE" in *_disposable) ;; *) echo "REFUSING: database must end with _disposable"; exit 2;; esac
exec > >(tee "$LOG") 2>&1
DB="kayad16_mfa_$$_disposable"; pass=0; fail=0
q(){ psql -X -q -At -d "$DB" -c "$1" 2>&1; }
chk(){ local n="$1" s="$2" w="$3" g; g="$(q "$s" | tr -d '\n')"; if [ "$g" = "$w" ]; then pass=$((pass+1)); echo "PASS  $n"; else fail=$((fail+1)); echo "FAIL  $n :: want [$w] got [$g]"; fi; }
cleanup(){ psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$DB\"" >/dev/null 2>&1; }; trap cleanup EXIT
psql -X -q -d postgres -c "CREATE DATABASE \"$DB\" TEMPLATE \"$BASE\"" || { echo "cannot clone base"; exit 2; }
chk "base has no MFA tables (upgrade starts from the Phase 15 schema)" "select count(*) from information_schema.tables where table_name like 'owner_mfa%'" "0"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$SQL" >/dev/null 2>&1 && { pass=$((pass+1)); echo "PASS  candidate applies"; } || { fail=$((fail+1)); echo "FAIL  candidate apply"; }
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$SQL" >/dev/null 2>&1 && { pass=$((pass+1)); echo "PASS  candidate re-applies idempotently"; } || { fail=$((fail+1)); echo "FAIL  candidate re-apply"; }
chk "both tables exist" "select count(*) from information_schema.tables where table_schema='public' and table_name in ('owner_mfa_factors','owner_mfa_recovery_codes')" "2"
chk "RLS enabled on both" "select count(*) from pg_class where relname in ('owner_mfa_factors','owner_mfa_recovery_codes') and relrowsecurity" "2"
chk "no policy exists (service_role only)" "select count(*) from pg_policies where tablename in ('owner_mfa_factors','owner_mfa_recovery_codes')" "0"
for r in anon authenticated; do
  chk "$r has no privilege on factors" "select has_table_privilege('$r','public.owner_mfa_factors','select,insert,update,delete')::text" "false"
  chk "$r has no privilege on recovery codes" "select has_table_privilege('$r','public.owner_mfa_recovery_codes','select,insert,update,delete')::text" "false"
done
chk "service_role can read/write factors" "select has_table_privilege('service_role','public.owner_mfa_factors','select,insert,update,delete')::text" "true"
psql -X -q -d "$DB" >/dev/null <<'SQL'
INSERT INTO public.users(id,name,email,role,status,email_verified) VALUES ('11111111-1111-1111-1111-111111111111','O','o@example.test','user','approved',true);
SQL
chk "pending factor can be stored" "insert into public.owner_mfa_factors(user_id,secret_enc) values ('11111111-1111-1111-1111-111111111111','v1:a:b:c') returning status" "pending"
chk "one factor per user" "insert into public.owner_mfa_factors(user_id,secret_enc) values ('11111111-1111-1111-1111-111111111111','x')" "ERROR:  duplicate key value violates unique constraint \"owner_mfa_factors_user_id_key\"DETAIL:  Key (user_id)=(11111111-1111-1111-1111-111111111111) already exists."
chk "active requires activated_at" "update public.owner_mfa_factors set status='active' where user_id='11111111-1111-1111-1111-111111111111'" "ERROR:  new row for relation \"owner_mfa_factors\" violates check constraint \"owner_mfa_factors_check\"DETAIL:  Failing row contains ($(q "select id from public.owner_mfa_factors limit 1"), 11111111-1111-1111-1111-111111111111, v1:a:b:c, active, $(q "select created_at from public.owner_mfa_factors limit 1"), null, null, 0, null)."
chk "status rejects unknown values" "update public.owner_mfa_factors set status='disabled'" "ERROR:  new row for relation \"owner_mfa_factors\" violates check constraint \"owner_mfa_factors_status_check\"DETAIL:  Failing row contains ($(q "select id from public.owner_mfa_factors limit 1"), 11111111-1111-1111-1111-111111111111, v1:a:b:c, disabled, $(q "select created_at from public.owner_mfa_factors limit 1"), null, null, 0, null)."
chk "recovery code is single row per (user,hash)" "insert into public.owner_mfa_recovery_codes(user_id,code_hash) values ('11111111-1111-1111-1111-111111111111','h1'),('11111111-1111-1111-1111-111111111111','h2') returning 1" "11"
chk "duplicate recovery hash refused" "insert into public.owner_mfa_recovery_codes(user_id,code_hash) values ('11111111-1111-1111-1111-111111111111','h1')" "ERROR:  duplicate key value violates unique constraint \"owner_mfa_recovery_codes_user_id_code_hash_key\"DETAIL:  Key (user_id, code_hash)=(11111111-1111-1111-1111-111111111111, h1) already exists."
chk "no plaintext secret column exists" "select count(*) from information_schema.columns where table_name='owner_mfa_factors' and column_name in ('secret','totp_secret','plaintext')" "0"
chk "deleting a user cascades to its factor and recovery-code rows only" "delete from public.users where id='11111111-1111-1111-1111-111111111111'; select (select count(*) from public.owner_mfa_factors)||'/'||(select count(*) from public.owner_mfa_recovery_codes)" "0/0"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$RB" >/dev/null 2>&1 && { pass=$((pass+1)); echo "PASS  rollback applies"; } || { fail=$((fail+1)); echo "FAIL  rollback"; }
chk "rollback removes only the Phase 16 tables" "select count(*) from information_schema.tables where table_name like 'owner_mfa%'" "0"
chk "rollback leaves users intact" "select to_regclass('public.users') is not null" "t"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$RB" >/dev/null 2>&1 && { pass=$((pass+1)); echo "PASS  rollback is idempotent"; } || { fail=$((fail+1)); echo "FAIL  rollback re-run"; }
echo; echo "RESULT pass=$pass fail=$fail"; [ "$fail" -eq 0 ]
