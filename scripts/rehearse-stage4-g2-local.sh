#!/usr/bin/env bash
# STAGE 4 LOCAL REHEARSAL (throwaway PostgreSQL only). NOT EXECUTED AGAINST PRODUCTION OR STAGING.
# G2: public.cars.status must be able to hold 'rejected'. Compares the Stage 3 single-transaction candidate with the Stage 4
# low-lock variant on a stub `cars` table that carries the ORIGINAL inline CHECK from
# supabase/migrations/20260710043200_20260710005000_foundational_tables.sql (constraint name cars_status_check).
#   A  baseline: 'rejected' is refused (23514) - the live defect in admin moderation / duplicate removal / report queue
#   B  Stage 3 candidate: DROP+VALIDATE in one transaction BLOCKS concurrent reads on cars for the whole transaction
#   C  Stage 3 candidate result (constraint valid, 'rejected' accepted, invalid values still refused)
#   D  Stage 4 low-lock variant: reads AND writes proceed while the validation lock is held
#   E  Stage 4 variant result == Stage 3 result (same name, same definition, validated)
#   F  abort condition: a legacy out-of-list value makes step 2 fail with 23514, old rule untouched, step-1 undo works
#   G  rollback limits: restoring the original CHECK fails while a 'rejected' row exists, succeeds once none does
# Usage: PGHOST=/path/to/socket PGPORT=55433 PGUSER=postgres ./scripts/rehearse-stage4-g2-local.sh
# Safety: refuses non-local hosts and DB names not starting with "rehearsal"; uses only PG* settings; ignores DATABASE_URL and
# SUPABASE_*. Harness result is NOT proof of the hosted database; it proves the SQL and its lock behaviour on stock PostgreSQL.
set -uo pipefail
HOST="${PGHOST:-/tmp}"; PORT="${PGPORT:-5432}"; DB="${REHEARSAL_DB:-rehearsal_s4_g2}"
case "$HOST" in /*|localhost|127.0.0.1) ;; *) echo "REFUSED: PGHOST must be a local socket or localhost"; exit 2;; esac
case "$DB" in rehearsal*) ;; *) echo "REFUSED: database name must start with 'rehearsal'"; exit 2;; esac
unset DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."
S3="$ROOT/runbooks/stage3-database-contract-20261018/03_G2_CANDIDATE_cars_status_rejected_NOT_APPLIED.sql"
S4="$ROOT/runbooks/stage4-rehearsal-20261018/03B_G2_CANDIDATE_cars_status_rejected_LOW_LOCK_NOT_APPLIED.sql"
P=(psql -X -q -h "$HOST" -p "$PORT" -U "${PGUSER:-postgres}")
PASS=0; FAIL=0
SERVER_VERSION="$("${P[@]}" -At -d postgres -c 'show server_version' 2>/dev/null)"
ok(){ echo "  PASS  $1"; PASS=$((PASS+1)); }
bad(){ echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
q(){ "${P[@]}" -At -d "$DB" -c "$1" 2>&1; }
run(){ "${P[@]}" -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null 2>&1; }
succeeds(){ # succeeds "<label>" <sql>   - psql exit status only (-q hides command tags)
  if "${P[@]}" -v ON_ERROR_STOP=1 -d "$DB" -c "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1"; fi; }
sqlstate(){ "${P[@]}" -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -d "$DB" -c "$1" 2>&1 | grep -Eo "ERROR:  [0-9A-Z]{5}" | head -n1 | sed "s/ERROR:  //"; }
expect(){ # expect "<label>" "<actual>" "<regex>"
  if echo "$2" | grep -Eq "$3"; then ok "$1"; else bad "$1  (got: $(echo "$2" | head -c 160))"; fi; }
reset(){
  "${P[@]}" -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB" >/dev/null 2>&1
  "${P[@]}" -d "$DB" >/dev/null 2>&1 <<'SQL'
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','sold','pending','reserved','hidden','draft'))
);
INSERT INTO public.cars(title,status) SELECT 'c'||g, (ARRAY['available','sold','pending','reserved','hidden','draft'])[1+(g%6)] FROM generate_series(1,600) g;
SQL
}
conname(){ q "select conname||'|'||convalidated||'|'||pg_get_constraintdef(oid) from pg_constraint where conrelid='public.cars'::regclass and contype='c' order by conname"; }

echo "== A. baseline (original inline CHECK)"
reset
expect "A1 constraint is named cars_status_check and validated" "$(conname)" '^cars_status_check\|true\|'
expect "A2 inserting status 'rejected' is refused with SQLSTATE 23514" "$(sqlstate "insert into public.cars(title,status) values('x','rejected')")" '^23514$'

echo "== B. Stage 3 candidate shape: DROP then VALIDATE in one transaction blocks concurrent reads"
( "${P[@]}" -d "$DB" >/dev/null 2>&1 <<'SQL'
BEGIN;
ALTER TABLE public.cars DROP CONSTRAINT cars_status_check;
SELECT pg_sleep(4);
ROLLBACK;
SQL
) & BG=$!
sleep 1
B_OUT="$("${P[@]}" -d "$DB" -c "set lock_timeout='1s'; select count(*) from public.cars" 2>&1)"
wait $BG
expect "B1 a concurrent SELECT on cars waits and hits lock_timeout while the DROP transaction is open" "$B_OUT" 'lock timeout|canceling statement due to lock timeout'
{ echo "B (Stage 3 shape) concurrent read during open DROP CONSTRAINT transaction:"; echo "$B_OUT"; } > /tmp/g2_lock_b.txt

echo "== C. Stage 3 candidate as written"
reset
run "$S3" && ok "C1 Stage 3 candidate applies cleanly" || bad "C1 Stage 3 candidate failed"
expect "C2 constraint cars_status_check validated and includes 'rejected'" "$(conname)" "^cars_status_check\|true\|.*rejected"
succeeds "C3 'rejected' now accepted" "insert into public.cars(title,status) values('x','rejected')"
expect "C4 an unlisted value ('deleted') is still refused (23514)" "$(sqlstate "insert into public.cars(title,status) values('x','deleted')")" '^23514$'

echo "== D. Stage 4 low-lock variant: reads and writes proceed while the validation lock is held"
reset
"${P[@]}" -v ON_ERROR_STOP=1 -d "$DB" -c "BEGIN; SET LOCAL lock_timeout='5s'; ALTER TABLE public.cars ADD CONSTRAINT cars_status_check_v2 CHECK (status IN ('available','sold','pending','reserved','hidden','draft','rejected')) NOT VALID; COMMIT;" >/dev/null 2>&1 && ok "D0 step 1 (NOT VALID add) applies" || bad "D0 step 1 failed"
expect "D1 step 1 changes no behaviour yet: 'rejected' is still refused by the old rule (23514)" "$(sqlstate "insert into public.cars(title,status) values('x','rejected')")" '^23514$'
( "${P[@]}" -d "$DB" >/dev/null 2>&1 <<'SQL'
BEGIN;
ALTER TABLE public.cars VALIDATE CONSTRAINT cars_status_check_v2;
SELECT pg_sleep(4);
COMMIT;
SQL
) & BG=$!
sleep 1
D_READ="$("${P[@]}" -At -d "$DB" -c "set lock_timeout='1s'; select count(*) from public.cars" 2>&1 | tail -n 1)"
if "${P[@]}" -v ON_ERROR_STOP=1 -d "$DB" -c "set lock_timeout='1s'; insert into public.cars(title,status) values('during-validate','available')" >/dev/null 2>&1; then D_WRITE=INSERT_OK; else D_WRITE=INSERT_BLOCKED_OR_FAILED; fi
wait $BG
expect "D2 SELECT succeeds while VALIDATE holds its lock" "$D_READ" '^[0-9]+$'
expect "D3 INSERT succeeds while VALIDATE holds its lock" "$D_WRITE" '^INSERT_OK$'
{ echo "D (Stage 4 low-lock) concurrent read during open VALIDATE transaction: count=$D_READ"; echo "D concurrent write during open VALIDATE transaction: $D_WRITE"; } > /tmp/g2_lock_d.txt

echo "== E. Stage 4 variant end state equals the Stage 3 end state"
reset
run "$S4" && ok "E1 low-lock variant applies cleanly (all three steps)" || bad "E1 low-lock variant failed"
expect "E2 single constraint named cars_status_check, validated, includes 'rejected'" "$(conname)" "^cars_status_check\|true\|.*rejected"
expect "E3 no leftover cars_status_check_v2" "$(q "select count(*) from pg_constraint where conname='cars_status_check_v2'")" '^0$'
succeeds "E4a 'rejected' accepted" "insert into public.cars(title,status) values('x','rejected')"
expect "E4b 'deleted' refused (23514)" "$(sqlstate "insert into public.cars(title,status) values('x','deleted')")" '^23514$'
succeeds "E5 re-running step 1 after completion is harmless (adds a v2 name that is rolled back here)" "BEGIN; ALTER TABLE public.cars ADD CONSTRAINT cars_status_check_v2 CHECK (status IN ('available','rejected')) NOT VALID; ROLLBACK;"

echo "== F. abort condition: legacy out-of-list value"
reset
"${P[@]}" -d "$DB" >/dev/null 2>&1 -c "alter table public.cars drop constraint cars_status_check; insert into public.cars(title,status) values('legacy','deleted');"
"${P[@]}" -v ON_ERROR_STOP=1 -d "$DB" -c "alter table public.cars add constraint cars_status_check check (status in ('available','sold','pending','reserved','hidden','draft')) not valid" >/dev/null 2>&1
F_OUT="$("${P[@]}" -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -d "$DB" -f "$S4" 2>&1)"
expect "F1 step 2 fails with SQLSTATE 23514 on the legacy row (v2 named in the message)" "$F_OUT" 'ERROR:  23514.*cars_status_check_v2'
expect "F2a after the failure the original-named rule is untouched" "$(conname)" 'cars_status_check\|false\|CHECK \(\(status = ANY \(ARRAY\[.available.::text, .sold.::text, .pending.::text, .reserved.::text, .hidden.::text, .draft.::text\]\)\)\)'
expect "F2b ...and v2 is left NOT VALID (not enforced as validated)" "$(conname)" 'cars_status_check_v2\|false'
q "alter table public.cars drop constraint cars_status_check_v2" >/dev/null
expect "F3 documented step-1 undo removes v2" "$(q "select count(*) from pg_constraint where conname='cars_status_check_v2'")" '^0$'

echo "== G. rollback limits"
reset
run "$S4"
q "insert into public.cars(title,status) values('r','rejected')" >/dev/null
G1="$("${P[@]}" -d "$DB" -c "alter table public.cars drop constraint cars_status_check; alter table public.cars add constraint cars_status_check check (status in ('available','sold','pending','reserved','hidden','draft'))" 2>&1)"
expect "G1 restoring the original CHECK fails while a 'rejected' row exists" "$G1" 'violated by some row'
q "update public.cars set status='hidden' where status='rejected'" >/dev/null
succeeds "G2 restoring succeeds once no 'rejected' row remains" "alter table public.cars drop constraint if exists cars_status_check; alter table public.cars add constraint cars_status_check check (status in ('available','sold','pending','reserved','hidden','draft'))"

"${P[@]}" -d postgres -c "drop database if exists $DB with (force)" >/dev/null 2>&1
echo; echo "RESULT: $PASS passed, $FAIL failed"
{ echo "# Stage 4 G2 rehearsal - lock behaviour (PostgreSQL $SERVER_VERSION)"; cat /tmp/g2_lock_b.txt /tmp/g2_lock_d.txt; } > "${REHEARSAL_EVIDENCE_OUT:-/dev/null}" 2>/dev/null || true
[ "$FAIL" -eq 0 ]
