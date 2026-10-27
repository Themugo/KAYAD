#!/bin/bash
# Builds a disposable database from the repository's own supabase/migrations (in order), after the compatibility shim.
# usage: build_full_schema.sh <db> <logfile>; env PGPORT (default 54329). Test-only; never point at a hosted database.
DB=${1:-kayad_full}; LOG=${2:-/tmp/migrate.txt}; PORT=${PGPORT:-54329}
P="psql -h 127.0.0.1 -p $PORT -U postgres -q"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
$P -d $DB -f "$(dirname "$0")/supabase_shim.sql" >/dev/null 2>&1
: > "$LOG"; fail=0
for f in supabase/migrations/*.sql; do
  out=$($P -d $DB -v ON_ERROR_STOP=1 -1 -f "$f" 2>&1 >/dev/null)
  if echo "$out" | grep -q "ERROR"; then fail=$((fail+1)); echo "FAIL $(basename "$f"): $(echo "$out" | grep -m1 ERROR | sed 's/.*ERROR: *//' | cut -c1-200)" >> "$LOG"; else echo "ok $(basename "$f")" >> "$LOG"; fi
done
echo "failures=$fail tables=$($P -d $DB -Atc "select count(*) from information_schema.tables where table_schema='public'")" | tee -a "$LOG"
