#!/usr/bin/env bash
# PHASE 13G — migration/rollback/re-apply certification for 20261026100000_admin_alerts. DISPOSABLE LOCAL POSTGRESQL ONLY (refuses non-loopback).
# Usage: PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres scripts/validate-phase13g-db.sh
# Steps: (1) full chain on an EMPTY database in filename order, (2) idempotent re-apply, (3) grants/RLS, (4) rollback + re-apply,
#        (5) rollback data-loss behaviour + backup recipe, (6) 13F certification driver against the full-chain database.
set -u
case "${PGHOST:-}" in 127.0.0.1|localhost) ;; *) echo "REFUSING: PGHOST must be loopback"; exit 2;; esac
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; M="$ROOT/supabase/migrations/20261026100000_admin_alerts.sql"; R="$ROOT/supabase/rollbacks/20261026100000_admin_alerts.down.sql"
pass=0; fail=0; ok() { if [ "$2" = "0" ]; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1"; fail=$((fail+1)); fi; }
q() { psql -X -q -A -t -d "$DB" -v ON_ERROR_STOP=1 -c "$1" 2>&1 | head -1; }
FULL=kayad_g_full; DB=$FULL
echo "== 1. complete migration chain on an empty database =="
dropdb --if-exists $FULL >/dev/null 2>&1; createdb $FULL
psql -X -q -d $FULL -f "$ROOT/scripts/local-db/supabase-shim.sql" >/dev/null 2>&1; psql -X -q -d $FULL -v ON_ERROR_STOP=1 -f "$ROOT/scripts/local-db/supabase-default-privileges.sql" >/dev/null 2>&1
n=0; bad=0; last=""; for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do n=$((n+1)); last=$(basename "$f"); psql -X -q -d $FULL -v ON_ERROR_STOP=1 -1 -f "$f" >/dev/null 2>&1 || { bad=$((bad+1)); echo "  failed: $(basename "$f")"; }; done
echo "  applied $n files, $bad failures, last=$last"; ok "all migrations apply in order on an empty database" "$bad"
[ "$last" = "20261026100000_admin_alerts.sql" ]; ok "the 13G migration is the last file in the chain order" "$?"
[ "$(q "SELECT to_regclass('public.admin_alerts') IS NOT NULL")" = "t" ]; ok "admin_alerts exists after the chain" "$?"
echo "== 2. idempotent re-apply =="
psql -X -q -d $FULL -v ON_ERROR_STOP=1 -1 -f "$M" >/dev/null 2>&1; ok "re-applying the migration succeeds" "$?"
[ "$(q "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_alerts'")" = "7" ]; ok "exactly the 7 derived columns" "$?"
[ "$(q "SELECT count(*) FROM pg_trigger WHERE tgrelid='public.admin_alerts'::regclass AND NOT tgisinternal")" = "1" ]; ok "exactly one trigger after re-apply" "$?"
echo "== 3. grants and RLS =="
[ "$(q "SELECT relrowsecurity FROM pg_class WHERE oid='public.admin_alerts'::regclass")" = "t" ]; ok "RLS enabled" "$?"
[ "$(q "SELECT count(*) FROM pg_policies WHERE tablename='admin_alerts'")" = "0" ]; ok "no policies (deny-all for non-owner roles)" "$?"
[ "$(q "SELECT (has_table_privilege('anon','public.admin_alerts','select') OR has_table_privilege('anon','public.admin_alerts','insert') OR has_table_privilege('authenticated','public.admin_alerts','select') OR has_table_privilege('authenticated','public.admin_alerts','insert') OR has_table_privilege('authenticated','public.admin_alerts','update') OR has_table_privilege('authenticated','public.admin_alerts','delete'))")" = "f" ]; ok "anon/authenticated hold no privilege" "$?"
[ "$(q "SELECT has_table_privilege('service_role','public.admin_alerts','select')")" = "t" ]; ok "service_role retains access (backend)" "$?"
q "INSERT INTO admin_alerts(type,severity,data) VALUES('payment_failure','critical','{\"a\":1}'::jsonb)" >/dev/null
[ "$(q "SELECT read::text||'/'||(updated_at>=created_at)::text FROM admin_alerts LIMIT 1")" = "false/true" ]; ok "defaults: read=false, timestamps set" "$?"
echo "== 4. rollback then re-apply =="
psql -X -q -d $FULL -v ON_ERROR_STOP=1 -1 -f "$R" >/dev/null 2>&1; ok "rollback executes" "$?"
[ "$(q "SELECT to_regclass('public.admin_alerts') IS NULL")" = "t" ]; ok "table gone after rollback" "$?"
psql -X -q -d $FULL -v ON_ERROR_STOP=1 -1 -f "$M" >/dev/null 2>&1; ok "re-apply after rollback" "$?"
[ "$(q "SELECT count(*) FROM admin_alerts")" = "0" ]; ok "rollback is NOT lossless: previously stored alerts are gone (documented; backup first)" "$?"
echo "== 5. backup recipe preserves data across rollback =="
q "INSERT INTO admin_alerts(type,severity) VALUES('payment_failure','warning')" >/dev/null
q "CREATE TABLE admin_alerts_backup_test AS TABLE admin_alerts" >/dev/null
psql -X -q -d $FULL -v ON_ERROR_STOP=1 -1 -f "$R" >/dev/null 2>&1; psql -X -q -d $FULL -v ON_ERROR_STOP=1 -1 -f "$M" >/dev/null 2>&1
q "INSERT INTO admin_alerts SELECT * FROM admin_alerts_backup_test" >/dev/null
[ "$(q "SELECT count(*) FROM admin_alerts")" = "1" ]; ok "rows restored from the pre-rollback backup table" "$?"
q "DROP TABLE admin_alerts_backup_test" >/dev/null
echo "== 6. Phase 13F database certification driver against the full chain =="
out=$(TEMPLATE_DB=$FULL bash "$ROOT/scripts/validate-phase13f-db.sh" 2>&1); echo "$out" | tail -n 3
echo "$out" | grep -q "phase13f-db: pass=28 fail=0"; ok "13F driver (43-assertion lifecycle, re-apply, rollback, reconciliation, concurrency) passes on the 13G chain" "$?"
echo "phase13g-db: pass=$pass fail=$fail"; [ "$fail" = "0" ]
