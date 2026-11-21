#!/usr/bin/env bash
# LOCAL REHEARSAL of the onboarding-critical migration chain on a THROWAWAY PostgreSQL (>=15).
# NOT EXECUTED AGAINST PRODUCTION. Refuses anything but a local socket/localhost and a db named rehearsal*.
# Usage: PGHOST=/tmp PGPORT=55432 PGUSER=postgres ./scripts/rehearse-onboarding-migrations-local.sh
set -euo pipefail
DB="${REHEARSAL_DB:-rehearsal}"
HOST="${PGHOST:-/tmp}"
case "$HOST" in /*|localhost|127.0.0.1) ;; *) echo "REFUSED: PGHOST must be a local socket or localhost (got '$HOST')"; exit 2;; esac
case "$DB" in rehearsal*) ;; *) echo "REFUSED: database name must start with 'rehearsal'"; exit 2;; esac
if [ -n "${DATABASE_URL:-}${SUPABASE_URL:-}${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then echo "NOTE: ignoring DATABASE_URL/SUPABASE_* - this script only uses PG* local settings"; fi
HERE="$(cd "$(dirname "$0")" && pwd)"; M="$HERE/../supabase/migrations"
P=(psql -X -v ON_ERROR_STOP=1 -q)
"${P[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${P[@]}" -d "$DB" -f "$HERE/rehearsal/onboarding_prod_shaped_baseline.sql"
"${P[@]}" -d "$DB" -f "$M/20260710043210_20260710005500_sync_profiles_trigger.sql" 2>/dev/null
ORDER="20260930111500 20260930113000 20260930112000 20261001090000 20261001220000 20260930110000 20261011090000 20261011121000"
for pass in 1 2; do
  for v in $ORDER; do "${P[@]}" -d "$DB" -f "$M"/${v}_*.sql >/dev/null; echo "pass $pass apply $v OK"; done
done
"${P[@]}" -d "$DB" -f "$HERE/rehearsal/onboarding_assertions.sql"
echo "REHEARSAL PASSED (applied twice, assertions green)"
