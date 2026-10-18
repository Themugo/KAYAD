#!/usr/bin/env bash
# DISPOSABLE LOCAL DATABASE ONLY. Refuses any host that is not loopback and any db name not ending _disposable.
set -u
: "${PGHOST:?}"; : "${PGPORT:?}"; DB="${1:?db name}"
case "$PGHOST" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: host $PGHOST is not loopback"; exit 2;; esac
case "$DB" in *_disposable) ;; *) echo "REFUSING: database name must end with _disposable"; exit 2;; esac
MIG="${2:?migrations dir}"
fail=0; n=0
for f in $(ls "$MIG"/*.sql | sort); do
  n=$((n+1))
  out=$(psql -q -v ON_ERROR_STOP=1 -d "$DB" -1 -f "$f" 2>&1) || { fail=$((fail+1)); echo "FAIL $(basename "$f") :: $(echo "$out" | grep -m1 ERROR)"; }
done
echo "migrations=$n failed=$fail"
[ "$fail" -eq 0 ]
