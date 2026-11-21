#!/usr/bin/env bash
# Rebuilds the disposable stack DB from the base template (migration applied), restarts PostgREST + backend, and runs the HTTP suite.
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=54339 PGUSER=postgres PATH=/home/claude/s5a/node22/package/bin:$PATH
S=/home/claude/s16/stack; W=/home/claude/s16/work
[ -f $S/backend.pid ] && kill "$(cat $S/backend.pid)" 2>/dev/null || true
psql -X -q -d postgres -c "DROP DATABASE IF EXISTS kayad5f16_stack_disposable WITH (FORCE)" -c "CREATE DATABASE kayad5f16_stack_disposable TEMPLATE kayad5f16_base_disposable"
psql -X -q -v ON_ERROR_STOP=1 -d kayad5f16_stack_disposable -1 -f $W/supabase/migrations/20261020180000_garage_organization_branch_membership.sql 2>/dev/null
psql -X -q -d kayad5f16_stack_disposable -c "NOTIFY pgrst, 'reload schema'"; sleep 1
$S/restart_backend.sh
export JWT_SECRET=$(grep '^JWT_SECRET=' $S/backend.env | cut -d= -f2-)
node $W/runbooks/stage5f16-garage-organization-20261020/http/stage5f16_http_e2e.mjs
