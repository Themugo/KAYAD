#!/bin/bash
# Resets the DISPOSABLE local stack to a pristine schema built from supabase/migrations. Never touches hosted services.
set -e
export PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres
pkill -f "^node bootstrap.js" || true
pkill -x postgrest || true
sleep 2
psql -d postgres -qc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='kayad_c1_disposable'" >/dev/null
dropdb --if-exists kayad_c1_disposable
createdb -T kayad_c1_pristine kayad_c1_disposable
redis-cli -p 6390 flushall >/dev/null
(cd /home/claude/c1 && nohup bin/postgrest bin/postgrest.conf > logs/postgrest.log 2>&1 &)
timeout 30 bash -c 'until [ "$(curl -s -o /dev/null -w %{http_code} http://127.0.0.1:54330/)" = 200 ]; do sleep 1; done'
echo "stack reset: kayad_c1_disposable recreated from kayad_c1_pristine; redis flushed; postgrest up"
