#!/usr/bin/env bash
# Real-database certification of the personal listing lifecycle (DISPOSABLE LOCAL POSTGRESQL ONLY; refuses non-loopback hosts).
# Usage: PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres DB=kayad_local scripts/validate-personal-lifecycle-db.sh
# DB must already contain every migration in supabase/migrations. Runs (1) the assertion suite, (2) a two-session concurrency race.
set -u
case "${PGHOST:-}" in 127.0.0.1|localhost|/*) ;; *) echo "REFUSING: PGHOST must be loopback or a local socket dir"; exit 2;; esac
DB="${DB:-kayad}"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"; pass=0; fail=0
ok() { if [ "$2" = "0" ]; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1"; fail=$((fail+1)); fi; }
P() { psql -X -q -A -t -d "$DB" -v ON_ERROR_STOP=1 "$@"; }
out=$(psql -X -q -d "$DB" -f "$ROOT/supabase/tests/personal_listing_lifecycle_atomic.sql" 2>&1); rc=$?
echo "$out" | grep -c "PASS:" | sed 's/^/assertions passed: /'
ok "lifecycle assertion suite" "$rc"; ok "no failed assertion" "$(echo "$out" | grep -c 'ASSERTION FAILED')"
# Concurrency: committed fixtures, two simultaneous 'hide' calls and a hide racing a mark_sold. Valid outcomes are listed in race().
U=$(P -c "INSERT INTO users(name,email,role,status,email_verified) VALUES('race','race$RANDOM$RANDOM@x.test','user','approved',true) RETURNING id" | head -1)
race() { # $1=actionA $2=actionB
  C=$(P -c "INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved) VALUES('race','B','M',2020,1,'$U','available',true) RETURNING id" | head -1)
  ( P -c "SELECT 'A:'||(kayad_personal_listing_lifecycle_atomic('$C','$U','$1')->>'status')" 2>&1 | head -1 > /tmp/race_a.$$ ) &
  ( P -c "SELECT 'B:'||(kayad_personal_listing_lifecycle_atomic('$C','$U','$2')->>'status')" 2>&1 | head -1 > /tmp/race_b.$$ ) &
  wait
  wins=$(cat /tmp/race_a.$$ /tmp/race_b.$$ | grep -c "^[AB]:\(hidden\|sold\|available\)")
  events=$(P -c "SELECT count(*) FROM personal_listing_lifecycle_events WHERE car_id='$C'")
  echo "race $1/$2 -> $(cat /tmp/race_a.$$ /tmp/race_b.$$ | tr '\n' ' ') final=$(P -c "SELECT status FROM cars WHERE id='$C'") events=$events"
  # Row lock serialises the pair. Valid: one winner + one refusal (1 event), or - only for hide then mark_sold - both applied in order (2 events, final=sold).
  # Always: audit rows == successful transitions, and the loser never overwrites a terminal sold state.
  final=$(P -c "SELECT status FROM cars WHERE id='$C'")
  if [ "$wins" = "1" ] && [ "$events" = "1" ]; then r=0
  elif [ "$1/$2" = "hide/mark_sold" ] && [ "$wins" = "2" ] && [ "$events" = "2" ] && [ "$final" = "sold" ]; then r=0
  else r=1; fi
  P -c "DELETE FROM personal_listing_lifecycle_events WHERE car_id='$C'; DELETE FROM cars WHERE id='$C'" >/dev/null
  rm -f /tmp/race_a.$$ /tmp/race_b.$$; return $r
}
for i in 1 2 3 4 5; do race hide hide; ok "concurrent hide/hide #$i: exactly one commit and one audit row" "$?"; done
for i in 1 2 3; do race hide mark_sold; ok "concurrent hide/mark_sold #$i: serialised, audit rows match transitions" "$?"; done
P -c "DELETE FROM users WHERE id='$U'" >/dev/null
echo "RESULT pass=$pass fail=$fail"; [ "$fail" = "0" ]
