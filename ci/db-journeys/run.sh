#!/usr/bin/env bash
# Disposable-database journey runner. NEEDS NO PRODUCTION CREDENTIALS and refuses to run against anything but loopback.
# Requirements: PostgreSQL 14+ superuser on loopback (PGHOST/PGPORT/PGUSER[/PGPASSWORD]), postgrest binary (POSTGREST_BIN),
#   redis-server, Node 22, `npm ci` done in backend/. Usage: ci/db-journeys/run.sh   (from the repository root)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; HERE="$ROOT/ci/db-journeys"
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
DB="${KAYAD_CI_DB:-kayad_ci}"; OUT="${KAYAD_CI_OUT:-$ROOT/ci/db-journeys/out}"
PGRST_PORT="${PGRST_PORT:-54340}"; PROXY_PORT="${PROXY_PORT:-54341}"; REDIS_PORT="${REDIS_PORT:-6391}"; API_PORT="${API_PORT:-5065}"; STUB_PORT="${CLOUDINARY_STUB_PORT:-9443}"
POSTGREST_BIN="${POSTGREST_BIN:-postgrest}"
case "$PGHOST" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: PGHOST=$PGHOST is not loopback"; exit 2;; esac
[[ "$DB" =~ ^kayad_(t|ci|test|recon|journey) ]] || { echo "REFUSING: database name $DB is not a disposable name"; exit 2; }
env | grep -Eq '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=.*supabase\.co' && { echo "REFUSING: a hosted Supabase URL/key is set in the environment"; exit 2; }
mkdir -p "$OUT"; : > "$OUT/summary.txt"; PIDS=()
cleanup() {
  for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null; done; sleep 1
  { echo "cleanup $(date -u +%FT%TZ)"; for p in "${PIDS[@]:-}"; do kill -0 "$p" 2>/dev/null && echo "pid $p STILL RUNNING" || echo "pid $p stopped"; done
    if [ "${KAYAD_CI_KEEP_DB:-0}" != 1 ] && [[ "$DB" =~ ^kayad_(ci|test|journey) ]]; then
      $P -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB'" >/dev/null 2>&1; $P -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 && echo "database $DB dropped" || echo "database $DB drop FAILED"
    else echo "database $DB kept (KAYAD_CI_KEEP_DB=1 or non-ephemeral name)"; fi
    for port in $PGRST_PORT $PROXY_PORT $REDIS_PORT $API_PORT $STUB_PORT; do (exec 3<>/dev/tcp/127.0.0.1/$port) 2>/dev/null && echo "port $port STILL LISTENING" || echo "port $port closed"; done
  } >"$OUT/cleanup.txt" 2>&1
}; trap cleanup EXIT
P="psql -X -q -v ON_ERROR_STOP=1"
rand() { node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))"; }
JWT_SECRET="$(rand)"; APW="$(rand)"; API_JWT_SECRET="$(rand)"
$P -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB'" >/dev/null
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" || exit 2
$P -d "$DB" -f "$HERE/bootstrap.sql" || { echo "bootstrap failed"; exit 2; }
$P -d "$DB" -c "alter role authenticator password '$APW'"
FAILED_MIG=0; N=0; : > "$OUT/migrations.txt"
for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  N=$((N+1)); if ! $P -d "$DB" -f "$f" >"$OUT/mig.tmp" 2>&1; then FAILED_MIG=$((FAILED_MIG+1)); echo "FAILED $(basename "$f")" >>"$OUT/migrations.txt"; echo "MIGRATION FAILED: $(basename "$f")" | tee -a "$OUT/summary.txt"; head -3 "$OUT/mig.tmp" | tee -a "$OUT/summary.txt"; else echo "OK     $(basename "$f")" >>"$OUT/migrations.txt"; fi
done
echo "migrations applied: $((N-FAILED_MIG))/$N" | tee -a "$OUT/summary.txt"
SR_JWT="$(JWT_SECRET="$API_JWT_SECRET" node -e "
const c=require('crypto'),b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const h=b({alg:'HS256',typ:'JWT'}),p=b({role:'service_role',iss:'ci',exp:Math.floor(Date.now()/1000)+86400});
process.stdout.write(h+'.'+p+'.'+c.createHmac('sha256',process.env.JWT_SECRET).update(h+'.'+p).digest('base64url'))")"
cat > "$OUT/pgrst.conf" <<EOF
db-uri = "postgres://authenticator:$APW@$PGHOST:$PGPORT/$DB"
db-schemas = "public"
db-max-rows = 1000
db-anon-role = "anon"
jwt-secret = "$API_JWT_SECRET"
server-host = "127.0.0.1"
server-port = $PGRST_PORT
EOF
"$POSTGREST_BIN" "$OUT/pgrst.conf" >"$OUT/postgrest.log" 2>&1 & PIDS+=($!)
PGRST_PORT=$PGRST_PORT PROXY_PORT=$PROXY_PORT node "$HERE/rest_prefix_proxy.cjs" >"$OUT/proxy.log" 2>&1 & PIDS+=($!)
redis-server --port "$REDIS_PORT" --save "" --appendonly no --bind 127.0.0.1 >"$OUT/redis.log" 2>&1 & PIDS+=($!)
# Local Cloudinary-compatible stub (loopback only): lets the REAL photo upload/destroy code run without internet. It is not Cloudinary.
export CLOUDINARY_STUB_LOG="$OUT/cloudinary-stub.log" CLOUDINARY_STUB_FAIL_FILE="$OUT/cloudinary-stub.fail" CLOUDINARY_STUB_PORT="$STUB_PORT"
node "$HERE/cloudinary_stub.cjs" >"$OUT/cloudinary-stub.out" 2>&1 & PIDS+=($!)
for i in $(seq 1 30); do curl -s -m 2 "http://127.0.0.1:$PROXY_PORT/" >/dev/null && break; sleep 1; done
( cd "$ROOT/backend" && exec env NODE_ENV=development PORT=$API_PORT JWT_SECRET="$JWT_SECRET" SUPABASE_URL="http://127.0.0.1:$PROXY_PORT" SUPABASE_SERVICE_ROLE_KEY="$SR_JWT" \
  REDIS_URL="redis://127.0.0.1:$REDIS_PORT" CLOUDINARY_CLOUD_NAME=disposable-local-placeholder CLOUDINARY_API_KEY=placeholder CLOUDINARY_API_SECRET=placeholder \
  CLOUDINARY_URL="cloudinary://placeholder:placeholder@disposable-local-placeholder?upload_prefix=http://127.0.0.1:$STUB_PORT" \
  AUTH_RATE_LIMIT_MAX=100000 RATE_LIMIT_MAX=1000000 ADMIN_RATE_LIMIT_MAX=1000000 VERIFICATION_RATE_LIMIT_MAX=100000 REGISTRATION_RATE_LIMIT_MAX=100000 \
  PAYMENT_RATE_LIMIT_MAX=1000 MPESA_ENV=production WEBHOIST_EMAIL="${WEBHOIST_EMAIL:-ci-owner@example.test}" node bootstrap.js >"$OUT/backend.log" 2>&1 ) & PIDS+=($!)
UP=0; for i in $(seq 1 60); do curl -s -m 2 "http://127.0.0.1:$API_PORT/api/health" | grep -q '"status":"ok"' && { UP=1; break; }; sleep 1; done
[ "$UP" = 1 ] || { echo "backend did not become healthy"; tail -20 "$OUT/backend.log"; exit 2; }
{ echo "stack up $(date -u +%FT%TZ)"; echo "postgres: $($P -d postgres -At -c 'show server_version')"; echo "postgrest: $("$POSTGREST_BIN" --version 2>&1 | head -1)"; echo "node: $(node -v)"; echo "redis: $(redis-server --version 2>&1 | head -1)"; echo "ports: pgrst=$PGRST_PORT proxy=$PROXY_PORT redis=$REDIS_PORT api=$API_PORT"; echo "backend health: $(curl -s -m 2 http://127.0.0.1:$API_PORT/api/health | cut -c1-120)"; } >"$OUT/stack.txt" 2>&1
$P -d "$DB" -c "notify pgrst, 'reload schema'"; sleep 2
export KAYAD_JOURNEY_BASE="http://127.0.0.1:$API_PORT" KAYAD_JOURNEY_DB="$DB"
RC=0
LEG="$ROOT/docs/handover/ALIGNMENT-VERIFICATION-20261121/evidence/journeys"
run_j() { local name="$1"; shift; ( cd "$1" && shift && timeout 280 node "$@" ) >"$OUT/$name.log" 2>&1; local rc=$?; local fails; fails=$(grep -c '^FAIL' "$OUT/$name.log"); echo "$name exit=$rc fails=$fails" | tee -a "$OUT/summary.txt"; [ "$rc" = 0 ] && [ "$fails" = 0 ] || RC=1; }
# Legacy chain (state passes through state.json in the working dir): registration, personal listing + moderation, enquiry, offers, payments gate, inspection, dealer, capabilities.
WORK="$(mktemp -d)"; cp "$LEG"/*.mjs "$WORK"/
for j in j1_registration_idempotency j1_personal_register_login j2 j3 j4_offers j5 j6 j7 j8 j9_capabilities j10_legacy_and_dealer; do run_j "legacy-$j" "$WORK" "$j.mjs"; done
for j in 03_reconciliation_issues 05_offer_payment 07_personal_listing_management 09_dealer_listing_lifecycle 10_dealer_banking 11_dealer_publish_pause 12_dealer_named_journeys; do run_j "$j" "$HERE" "$j.mjs"; done
# model-layer journey: talks to the disposable PostgREST directly (loopback key generated above)
SUPABASE_URL="http://127.0.0.1:$PROXY_PORT" SUPABASE_SERVICE_ROLE_KEY="$SR_JWT" run_j 06_aggregate_shim "$HERE" 06_aggregate_shim.mjs
# MUST run last: it drops the objects that are absent on the hosted project (a hosted-shaped schema) and then drives the whole owner lifecycle.
run_j 08_personal_listing_hosted_schema "$HERE" 08_personal_listing_hosted_schema.mjs
echo "overall=$([ $RC = 0 ] && [ $FAILED_MIG = 0 ] && echo PASS || echo FAIL)" | tee -a "$OUT/summary.txt"
[ $RC = 0 ] && [ $FAILED_MIG = 0 ]
