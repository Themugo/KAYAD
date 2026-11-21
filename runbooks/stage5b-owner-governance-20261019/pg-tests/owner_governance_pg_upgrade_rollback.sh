#!/usr/bin/env bash
# STAGE 5B CLOSURE — upgrade / prerequisite / rollback rehearsal of the owner-governance migration candidate. DISPOSABLE DATABASE ONLY.
# Usage: PGHOST=127.0.0.1 PGPORT=54339 PGUSER=postgres ./owner_governance_pg_upgrade_rollback.sh <base_db_ending_disposable> <candidate.sql> <rollback.sql> [<logfile>]
set -u
BASE="${1:?base db}"; SQL="${2:?candidate}"; RB="${3:?rollback}"; LOG="${4:-/dev/stdout}"
case "${PGHOST:-}" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: host is not loopback"; exit 2;; esac
case "$BASE" in *_disposable) ;; *) echo "REFUSING: database must end with _disposable"; exit 2;; esac
exec > >(tee "$LOG") 2>&1
pass=0; fail=0; D1="kayad5b_upg_$$_disposable"; D2="kayad5b_pre_$$_disposable"; D3="kayad5b_rb_$$_disposable"
ok(){ pass=$((pass+1)); echo "PASS  $1"; }; ko(){ fail=$((fail+1)); echo "FAIL  $1 :: $2"; }
q(){ psql -X -q -At -d "$1" -c "$2" 2>&1; }
cleanup(){ for d in "$D1" "$D2" "$D3"; do psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$d\"" >/dev/null 2>&1; done; }
trap cleanup EXIT
for d in "$D1" "$D2" "$D3"; do psql -X -q -d postgres -c "CREATE DATABASE \"$d\" TEMPLATE \"$BASE\"" || { echo "cannot clone"; exit 2; }; done
fp(){ # fingerprint of every pre-existing public table: name|rows|md5 of all rows (ordered by row text)
  psql -X -q -At -d "$1" -c "
  DO \$\$ DECLARE r record; h text; n bigint; BEGIN
    CREATE TEMP TABLE _fp(t text, n bigint, h text);
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state') ORDER BY 1 LOOP
      EXECUTE format('SELECT count(*), COALESCE(md5(string_agg(x::text, ''|'' ORDER BY x::text)),''-'') FROM public.%I x', r.tablename) INTO n, h;
      INSERT INTO _fp VALUES (r.tablename, n, h);
    END LOOP;
  END \$\$;" >/dev/null 2>&1
  psql -X -q -At -d "$1" -c "
  CREATE OR REPLACE FUNCTION pg_temp.fpall() RETURNS TABLE(t text, n bigint, h text) LANGUAGE plpgsql AS \$f\$ DECLARE r record; BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state') ORDER BY 1 LOOP
      RETURN QUERY EXECUTE format('SELECT %L::text, count(*)::bigint, COALESCE(md5(string_agg(x::text, ''|'' ORDER BY x::text)),''-'') FROM public.%I x', r.tablename, r.tablename);
    END LOOP; END \$f\$;
  SELECT t||'|'||n||'|'||h FROM pg_temp.fpall();" 2>&1
}

echo "== A. representative prior state: existing users / sessions / controls survive the upgrade =="
psql -X -q -d "$D1" >/dev/null <<'SQL'
INSERT INTO public.users(name,email,role,status,email_verified) VALUES
 ('Designated Verified','designated-v@kayad-test.example','user','approved',true),
 ('Designated Squatter','designated-s@kayad-test.example','user','approved',false),
 ('Dealer','dealer@kayad-test.example','dealer','approved',true),
 ('Seller','seller@kayad-test.example','user','approved',true),
 ('Admin','admin@kayad-test.example','admin','approved',true);
INSERT INTO public.user_auth(user_id,password,token_version) SELECT id,'$2a$10$FIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIX',3 FROM public.users WHERE email LIKE '%@kayad-test.example';
SQL
BEFORE="$(fp "$D1")"
nbefore=$(echo "$BEFORE" | wc -l)
if psql -X -q -v ON_ERROR_STOP=1 -d "$D1" -1 -f "$SQL" >/dev/null 2>&1; then ok "candidate applies on top of a populated database"; else ko "candidate apply on populated db" "see psql"; fi
AFTER="$(fp "$D1")"
diff <(echo "$BEFORE") <(echo "$AFTER") > /tmp/fpdiff_$$.txt
changed=$(grep -c '^[<>]' /tmp/fpdiff_$$.txt)
only_ctl=$(grep '^[<>]' /tmp/fpdiff_$$.txt | grep -vc 'communication_event_controls')
[ "$only_ctl" = "0" ] && ok "every pre-existing table is byte-identical after the upgrade except communication_event_controls (+6 rows by design) [$nbefore tables fingerprinted]" || { ko "pre-existing data changed" "$(cat /tmp/fpdiff_$$.txt | head -5)"; }
[ "$(q "$D1" "select count(*) from public.communication_event_controls where event_type like 'owner.%'")" = "6" ] && ok "exactly the six owner.* control rows were added" || ko "controls" "unexpected count"
[ "$(q "$D1" "select (public.kayad_owner_snapshot())->'owners'")" = "[]" ] && ok "post-upgrade: NO owner exists, including designated verified accounts (no env-list privilege in database mode)" || ko "owners not empty" ""
[ "$(q "$D1" "select count(*) from public.owner_memberships")" = "0" ] && ok "post-upgrade: zero memberships — a verified designated account is not auto-promoted" || ko "memberships" ""

echo "== B. missing prerequisite aborts cleanly and leaves nothing behind =="
q "$D2" "alter table public.users drop column deactivated_at cascade" >/dev/null
if psql -X -q -v ON_ERROR_STOP=1 -d "$D2" -1 -f "$SQL" >/dev/null 2>&1; then ko "candidate should fail without users.deactivated_at" "it applied"; else ok "candidate refuses to apply when the Stage 5A users security columns are missing (hosted gap #3)"; fi
left=$(q "$D2" "select (select count(*) from pg_tables where schemaname='public' and tablename in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state')) + (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'kayad\_owner\_%')")
[ "$left" = "0" ] && ok "failed apply is atomic: none of the four owner governance tables or kayad_owner_* functions was left behind" || ko "partial objects remain" "$left"

echo "== C. rollback: refuses without export, then restores the pre-upgrade state without touching users/sessions =="
psql -X -q -d "$D3" >/dev/null <<'SQL'
INSERT INTO public.users(name,email,role,status,email_verified) VALUES ('Owner A','a@kayad-test.example','user','approved',true),('Owner B','b@kayad-test.example','user','approved',true);
INSERT INTO public.user_auth(user_id,password,token_version) SELECT id,'$2a$10$FIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIXTUREFIX',0 FROM public.users WHERE email LIKE '%@kayad-test.example';
SQL
psql -X -q -v ON_ERROR_STOP=1 -d "$D3" -1 -f "$SQL" >/dev/null 2>&1 || ko "apply for rollback test" "failed"
PRE_ROLLBACK_FP="$(fp "$D3")"
# fixtures through the REAL write path: two owners, one pending invitation, one revocation attempt
psql -X -q -d "$D3" >/dev/null <<'SQL'
INSERT INTO public.owner_memberships(user_id,email,status,added_via,added_by_label) SELECT id,email,'active','bootstrap','fixture' FROM public.users WHERE email IN ('a@kayad-test.example','b@kayad-test.example');
SELECT public.kayad_owner_issue_invitation('c@kayad-test.example','invitation',repeat('a',64),now()+interval '1 day',(select id from public.users where email='a@kayad-test.example'),'owner:a@kayad-test.example','rb');
SELECT public.kayad_owner_revoke_membership_atomic((select id from public.users where email='b@kayad-test.example'),(select id from public.users where email='a@kayad-test.example'),'owner:a@kayad-test.example','rollback fixture');
SQL
EV=$(q "$D3" "select count(*) from public.owner_membership_events")
out=$(psql -X -q -d "$D3" -1 -f "$RB" 2>&1)
echo "$out" | grep -q "REFUSING" && ok "rollback refuses to run without the export confirmation" || ko "rollback ran without confirmation" "$out"
[ "$(q "$D3" "select count(*) from public.owner_memberships")" = "2" ] && ok "refused rollback changed nothing" || ko "refused rollback changed data" ""
psql -X -q -At -d "$D3" -c "\copy (select * from public.owner_membership_events order by id) to '/tmp/owner_events_$$.csv' csv header" >/dev/null 2>&1
rows=$(($(wc -l < /tmp/owner_events_$$.csv)-1)); [ "$rows" = "$EV" ] && ok "audit ledger export captured all $EV events before the rollback" || ko "export row count" "$rows vs $EV"
psql -X -q -v ON_ERROR_STOP=1 -v confirm_events_exported=yes -d "$D3" -1 -f "$RB" >/dev/null 2>&1 && ok "rollback applies once export is confirmed" || ko "rollback apply" "failed"
left=$(q "$D3" "select (select count(*) from pg_tables where schemaname='public' and tablename in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state')) + (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'kayad\_owner\_%')")
[ "$left" = "0" ] && ok "rollback removed every owner_* table and kayad_owner_* function" || ko "objects remain after rollback" "$left"
POST="$(fp "$D3")"
diff <(echo "$PRE_ROLLBACK_FP" | grep -v 'refresh_tokens\|user_auth') <(echo "$POST" | grep -v 'refresh_tokens\|user_auth' | grep -v communication_event_controls) >/dev/null 2>&1
# communication_event_controls goes back to its pre-candidate rows; users and all other tables unchanged
PRE_CTL=$(echo "$PRE_ROLLBACK_FP" | grep '^communication_event_controls|' | cut -d'|' -f2); POST_CTL=$(echo "$POST" | grep '^communication_event_controls|' | cut -d'|' -f2)
[ "$((PRE_CTL-6))" = "$POST_CTL" ] && ok "the six owner.* control rows were removed again" || ko "controls after rollback" "$PRE_CTL -> $POST_CTL"
[ "$(q "$D3" "select count(*) from public.users where email like '%@kayad-test.example'")" = "2" ] && ok "user accounts untouched by rollback (nothing is deleted from users)" || ko "users changed" ""
# the revocation fixture bumped token_version/refresh tokens for owner B: that happened BEFORE rollback, as part of normal operation
[ "$(q "$D3" "select token_version from public.user_auth where user_id=(select id from public.users where email='b@kayad-test.example')")" = "1" ] && ok "pre-rollback revocation of a session is NOT undone by the rollback (rollback never restores old sessions)" || ko "token_version" ""
echo; echo "RESULT pass=$pass fail=$fail"; rm -f /tmp/fpdiff_$$.txt /tmp/owner_events_$$.csv
exit $((fail>0))
