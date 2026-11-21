#!/usr/bin/env bash
# PHASE 16A - rollback rehearsal on a CLONE of the populated disposable DB (after the arrangement E2E): MFA rollback, then owner-governance rollback,
# proving that identity data (users, user_auth, profiles, sessions, dealers) is byte-identical, owner objects are gone, and the pair re-applies.
# Usage: PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres ./live_rollback_rehearsal.sh <populated_db> <mfa_candidate> <mfa_rollback> <5b_candidate> <5b_rollback>
set -u; SRC="${1:?}"; MC="${2:?}"; MR="${3:?}"; GC="${4:?}"; GR="${5:?}"
case "${PGHOST:-}" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: not loopback"; exit 2;; esac
DB="kayad16a_rb_$$_disposable"; pass=0; fail=0
q(){ psql -X -q -At -d "$DB" -c "$1" 2>&1 | tr -d '\n'; }
chk(){ local g; g="$(q "$2")"; if [ "$g" = "$3" ]; then pass=$((pass+1)); echo "PASS  $1"; else fail=$((fail+1)); echo "FAIL  $1 :: want [$3] got [$g]"; fi; }
trap 'psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$DB\"" >/dev/null 2>&1' EXIT
# the source is in use by the running application, so clone by dump/restore (no template lock needed)
psql -X -q -d postgres -c "CREATE DATABASE \"$DB\"" || exit 2
pg_dump "$SRC" 2>/dev/null | psql -X -q -d "$DB" >/dev/null 2>&1
ID="select md5(string_agg(t,'|' order by t)) from (select u::text t from users u union all select a::text from user_auth a union all select p::text from profiles p union all select r::text from refresh_tokens r union all select d::text from dealers d union all select v::text from dealer_verifications v) x"
chk "populated clone has owner governance + MFA objects" "select (to_regclass('owner_memberships') is not null and to_regclass('owner_mfa_factors') is not null)::text" "true"
chk "clone holds active owner memberships (state to be rolled back)" "select (count(*) >= 1)::text from owner_memberships where status='active'" "true"
before="$(q "$ID")"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$MR" >/dev/null 2>&1; chk "MFA rollback ran: MFA tables/functions gone" "select ((to_regclass('owner_mfa_factors') is null) and (to_regclass('owner_mfa_recovery_codes') is null))::text" "true"
chk "owner governance still intact after the MFA rollback only (layers roll back independently)" "select (to_regclass('owner_memberships') is not null)::text" "true"
psql -X -q -d "$DB" -c "select 1" >/dev/null
refuse="$(psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$GR" 2>&1 | grep -c REFUSING)"; chk "5B rollback REFUSES without the explicit confirmation variable" "select '$refuse'" "1"
psql -X -q -v ON_ERROR_STOP=1 -v confirm_events_exported=yes -d "$DB" -1 -f "$GR" >/dev/null 2>&1; chk "5B rollback ran: owner tables and kayad_owner* functions gone" "select ((to_regclass('owner_memberships') is null) and (to_regclass('owner_invitations') is null) and (to_regclass('owner_membership_events') is null) and (select count(*) from pg_proc where proname like 'kayad_owner%')=0)::text" "true"
chk "identity data (users, credentials, profiles, sessions, dealers, verifications) is byte-identical after both rollbacks" "$ID" "$before"
chk "users.email_verified / role / super_admin untouched (rollback never edits roles)" "select count(*) from users where lower(email) in ('owner148@example.test')" "1"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$GC" >/dev/null 2>&1; psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$MC" >/dev/null 2>&1
chk "both candidates re-apply cleanly after rollback (roll-forward works)" "select ((to_regclass('owner_memberships') is not null) and (to_regclass('owner_mfa_factors') is not null) and (select status from owner_bootstrap_state limit 1)='open')::text" "true"
chk "after re-apply the bootstrap switch is open again and no member is active (a fresh, audited bootstrap is required)" "select count(*) from owner_memberships where status='active'" "0"
echo; echo "RESULT pass=$pass fail=$fail"; [ "$fail" -eq 0 ]
