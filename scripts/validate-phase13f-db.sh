#!/usr/bin/env bash
# PHASE 13F — real-database certification driver. DISPOSABLE LOCAL POSTGRESQL ONLY (refuses non-loopback hosts).
# Usage: PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres TEMPLATE_DB=kayad_local_pristine scripts/validate-phase13f-db.sh
# TEMPLATE_DB must already contain every migration in supabase/migrations (scripts/local-db/README.md section 1).
# Steps: (1) lifecycle suite, (2) idempotent re-apply, (3) rollback safety, (4) migration-time reconciliation, (5) two-session concurrency.
set -u
case "${PGHOST:-}" in 127.0.0.1|localhost) ;; *) echo "REFUSING: PGHOST must be loopback"; exit 2;; esac
TEMPLATE_DB="${TEMPLATE_DB:-kayad_local_pristine}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
M13E1="$ROOT/supabase/migrations/20261025100000_private_seller_capability.sql"
M13E2="$ROOT/supabase/migrations/20261025113000_private_seller_listing_visibility.sql"
M13F="$ROOT/supabase/migrations/20261025130000_private_seller_listing_visibility_hardening.sql"
R13E1="$ROOT/supabase/rollbacks/20261025100000_private_seller_capability.down.sql"
R13E2="$ROOT/supabase/rollbacks/20261025113000_private_seller_listing_visibility.down.sql"
R13F="$ROOT/supabase/rollbacks/20261025130000_private_seller_listing_visibility_hardening.down.sql"
pass=0; fail=0
ok() { if [ "$2" = "0" ]; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1"; fail=$((fail+1)); fi; }
q() { psql -X -q -A -t -d "$DB" -v ON_ERROR_STOP=1 -c "$1" 2>&1 | head -1; }
fresh() { DB="kayad_13f_check"; dropdb --if-exists "$DB" >/dev/null 2>&1; createdb -T "$TEMPLATE_DB" "$DB" || { echo "cannot clone template"; exit 2; }; }
mkuser() { q "INSERT INTO users(name,email,role,status,email_verified) VALUES('t','$(date +%s%N)$RANDOM@x.test','${1:-user}','approved',true) RETURNING id"; }
mkcar() { q "INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved) VALUES('c','B','M',2020,1,'$1','${2:-available}',true) RETURNING id"; }

echo "== 1. lifecycle suite =="
fresh
out=$(psql -X -q -d "$DB" -f "$ROOT/supabase/tests/phase13f_private_seller_lifecycle.sql" 2>&1); rc=$?
echo "$out" | grep -E "PASS:|FAIL|ERROR" | sed 's/^psql:[^ ]* NOTICE:  //'
ok "lifecycle suite exit code" "$rc"; ok "lifecycle suite has no failed assertion" "$(echo "$out" | grep -c 'ASSERTION FAILED')"

echo "== 2. idempotent re-apply of the three migrations =="
fresh
for f in "$M13E1" "$M13E2" "$M13F"; do psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$f" >/dev/null 2>&1; ok "re-apply $(basename "$f")" "$?"; done
U=$(mkuser); C=$(mkcar "$U"); q "INSERT INTO private_seller_capabilities(user_id,status) VALUES('$U','approved')" >/dev/null
q "UPDATE private_seller_capabilities SET status='suspended' WHERE user_id='$U'" >/dev/null
for f in "$M13E2" "$M13F"; do psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$f" >/dev/null 2>&1; done
[ "$(q "SELECT status FROM cars WHERE id='$C'")" = "hidden" ] && [ "$(q "SELECT count(*) FROM private_seller_listing_visibility_events WHERE car_id='$C' AND restored_at IS NULL")" = "1" ]; ok "re-applying migrations on a suspended seller keeps one open event and the listing hidden" "$?"

echo "== 3. rollback safety =="
fresh
U=$(mkuser); C1=$(mkcar "$U"); C2=$(mkcar "$U" sold); LEG=$(mkuser individual_seller)
q "INSERT INTO private_seller_capabilities(user_id,status) VALUES('$U','approved')" >/dev/null
q "UPDATE private_seller_capabilities SET status='suspended' WHERE user_id='$U'" >/dev/null
[ "$(q "SELECT status FROM cars WHERE id='$C1'")" = "hidden" ]; ok "precondition: listing hidden by policy" "$?"
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$R13F" >/dev/null 2>&1; ok "rollback 13F hardening applies" "$?"
[ "$(q "SELECT count(*) FROM pg_trigger WHERE tgname='trg_cars_private_seller_visibility_enforce'")" = "0" ] && [ "$(q "SELECT count(*) FROM information_schema.columns WHERE table_name='private_seller_listing_visibility_events' AND column_name='restore_outcome'")" = "0" ]; ok "13F objects removed" "$?"
q "UPDATE private_seller_capabilities SET status='approved' WHERE user_id='$U'" >/dev/null
[ "$(q "SELECT status FROM cars WHERE id='$C1'")" = "available" ]; ok "after 13F rollback the 13E trigger still restores on reinstatement" "$?"
q "UPDATE private_seller_capabilities SET status='suspended' WHERE user_id='$U'" >/dev/null
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$R13E2" >/dev/null 2>&1; ok "rollback 13E listing-visibility applies" "$?"
[ "$(q "SELECT status FROM cars WHERE id='$C1'")" = "available" ] && [ "$(q "SELECT status FROM cars WHERE id='$C2'")" = "sold" ] && [ "$(q "SELECT dealer_id FROM cars WHERE id='$C1'")" = "$U" ]; ok "rolling back restores policy-hidden listings (never leaves them stranded), keeps sold state and ownership" "$?"
[ "$(q "SELECT to_regclass('public.private_seller_listing_visibility_events') IS NULL")" = "t" ]; ok "events table dropped" "$?"
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$R13E1" >/dev/null 2>&1; ok "rollback 13E capability table applies" "$?"
[ "$(q "SELECT to_regclass('public.private_seller_capabilities') IS NULL")" = "t" ] && [ "$(q "SELECT role FROM users WHERE id='$LEG'")" = "individual_seller" ] && [ "$(q "SELECT count(*) FROM users WHERE id='$U'")" = "1" ]; ok "capability table dropped; users and roles untouched" "$?"
for f in "$M13E1" "$M13E2" "$M13F"; do psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$f" >/dev/null 2>&1; ok "forward re-apply after full rollback: $(basename "$f")" "$?"; done

echo "== 4. migration-time reconciliation of already-suspended sellers =="
fresh
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$R13F" >/dev/null 2>&1; psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$R13E2" >/dev/null 2>&1
S=$(mkuser); A=$(mkcar "$S"); D=$(mkuser dealer); DC=$(mkcar "$D"); O=$(mkuser); OC=$(mkcar "$O"); M=$(mkcar "$S" hidden)
q "INSERT INTO private_seller_capabilities(user_id,status) VALUES('$S','suspended'),('$O','approved')" >/dev/null
[ "$(q "SELECT status FROM cars WHERE id='$A'")" = "available" ]; ok "precondition: without the trigger the suspended seller's listing is still public" "$?"
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$M13E2" >/dev/null 2>&1; ok "13E migration applies on a database that already has a suspended seller" "$?"
[ "$(q "SELECT status FROM cars WHERE id='$A'")" = "hidden" ] && [ "$(q "SELECT status FROM cars WHERE id='$OC'")" = "available" ] && [ "$(q "SELECT status FROM cars WHERE id='$DC'")" = "available" ]; ok "reconciliation hid only the suspended seller's public listing" "$?"
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 -f "$M13F" >/dev/null 2>&1; ok "13F migration applies on top" "$?"
q "UPDATE private_seller_capabilities SET status='approved' WHERE user_id='$S'" >/dev/null
[ "$(q "SELECT status FROM cars WHERE id='$A'")" = "available" ] && [ "$(q "SELECT status FROM cars WHERE id='$M'")" = "hidden" ]; ok "reinstatement restores the reconciled listing and not the manually hidden one" "$?"

echo "== 5. two-session concurrency =="
fresh
U=$(mkuser); q "INSERT INTO private_seller_capabilities(user_id,status) VALUES('$U','approved')" >/dev/null
CAR=$(q "SELECT gen_random_uuid()")
# 5a: a writer publishes a listing inside a transaction that stays open; the admin suspends meanwhile. After both commit the listing MUST be hidden.
( psql -X -q -d "$DB" >/dev/null 2>&1 <<SQL
BEGIN;
INSERT INTO cars(id,title,brand,model,year,price,dealer_id,status,approved) VALUES('$CAR','race','B','M',2020,1,'$U','available',true);
SELECT pg_sleep(3);
COMMIT;
SQL
) &
WPID=$!
sleep 1
START=$(date +%s)
q "UPDATE private_seller_capabilities SET status='suspended' WHERE user_id='$U'" >/dev/null   # blocks on the writer's FOR SHARE lock until it commits
END=$(date +%s)
wait $WPID
[ "$(q "SELECT status FROM cars WHERE id='$CAR'")" = "hidden" ]; ok "5a suspension racing an in-flight publish hides the new listing (no public window)" "$?"
[ $((END-START)) -ge 1 ]; ok "5a suspension waited for the in-flight writer (serialised by the capability row lock)" "$?"
[ "$(q "SELECT count(*) FROM private_seller_listing_visibility_events WHERE car_id='$CAR' AND restored_at IS NULL")" = "1" ]; ok "5a exactly one tracked event" "$?"
# 5b: two administrators suspend/revoke at the same time -> a single consistent terminal state, one open event per listing
U2=$(mkuser); C2=$(mkcar "$U2"); q "INSERT INTO private_seller_capabilities(user_id,status) VALUES('$U2','approved')" >/dev/null
( q "UPDATE private_seller_capabilities SET status='suspended' WHERE user_id='$U2' AND status='approved'" >/dev/null ) &
( q "UPDATE private_seller_capabilities SET status='revoked' WHERE user_id='$U2' AND status='approved'" >/dev/null ) &
wait
ST=$(q "SELECT status FROM private_seller_capabilities WHERE user_id='$U2'")
{ [ "$ST" = "suspended" ] || [ "$ST" = "revoked" ]; } && [ "$(q "SELECT status FROM cars WHERE id='$C2'")" = "hidden" ] && [ "$(q "SELECT count(*) FROM private_seller_listing_visibility_events WHERE car_id='$C2' AND restored_at IS NULL")" = "1" ]; ok "5b concurrent conflicting decisions end in one terminal state with the listing hidden once" "$?"
# 5c: seller edits a listing while it is being suspended -> no lost hide
U3=$(mkuser); C3=$(mkcar "$U3"); q "INSERT INTO private_seller_capabilities(user_id,status) VALUES('$U3','approved')" >/dev/null
( psql -X -q -d "$DB" >/dev/null 2>&1 <<SQL
BEGIN; UPDATE cars SET price = price + 5 WHERE id='$C3'; SELECT pg_sleep(2); COMMIT;
SQL
) &
sleep 0.7
q "UPDATE private_seller_capabilities SET status='suspended' WHERE user_id='$U3'" >/dev/null
wait
[ "$(q "SELECT status FROM cars WHERE id='$C3'")" = "hidden" ] && [ "$(q "SELECT price FROM cars WHERE id='$C3'")" = "6" ]; ok "5c suspension during an in-flight edit hides the listing and keeps the edit" "$?"

dropdb --if-exists "$DB" >/dev/null 2>&1
echo "phase13f-db: pass=$pass fail=$fail"
[ "$fail" = "0" ]
