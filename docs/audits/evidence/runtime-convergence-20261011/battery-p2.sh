#!/bin/bash
# Final regression for the runtime-convergence phase on /home/claude/msg/p2/work/KAYAD-main, Node 22.22.2.
export PATH=/tmp/claude-0/-home-claude/9cccf2fd-fe77-5914-aa11-45af2d198133/scratchpad/n22/node_modules/node-linux-x64/bin:$PATH
R=/home/claude/msg/p2/work/KAYAD-main
EV=$R/docs/audits/evidence/runtime-convergence-20261011/final-regression
H=$R/docs/messaging-consistency-audit/harness
W=/home/claude/msg/p2/battery
mkdir -p $EV $W; : > $EV/progress.txt
pg_lsclusters | grep -q online || pg_ctlcluster 16 main start
step(){ n=$1; shift; echo "== $n start $(date +%T) :: $*" >> $EV/progress.txt; "$@" > $EV/$n.txt 2>&1; echo "exit=$?" >> $EV/$n.txt; echo "== $n done $(tail -n1 $EV/$n.txt)" >> $EV/progress.txt; }
killservers(){ for p in $(ps aux | grep -E "node server.js|vite" | grep -v grep | awk '{print $2}'); do kill -9 $p 2>/dev/null; done; }
node -v > $EV/node_version.txt
killservers
# migration chains
for db in k9_main k9_crawl k9_plain; do su postgres -c "dropdb --if-exists $db" >/dev/null 2>&1; rm -rf $W/chain-$db; mkdir -p $W/chain-$db; done
for db in k9_main k9_crawl; do SUPABASE_DEFAULT_PRIVILEGES=1 bash $H/sql/apply_chain.sh $db $R/supabase/migrations $W/chain-$db > /dev/null 2>&1; done
bash $H/sql/apply_chain.sh k9_plain $R/supabase/migrations $W/chain-k9_plain > /dev/null 2>&1
mkdir -p $EV/migration-chain; : > $EV/migration-chain/chain_summary.txt
for db in k9_main k9_crawl k9_plain; do echo "$db: $(cat $W/chain-$db/chain_summary.txt) $(cat $W/chain-$db/chain_summary.txt.mode 2>/dev/null)" >> $EV/migration-chain/chain_summary.txt; cat $W/chain-$db/chain_errors.txt >> $EV/migration-chain/chain_errors.txt 2>/dev/null; done
for m in 20261011100000_chat_message_outbox 20261011120000_client_role_least_privilege 20261011121000_profiles_role_sync_repair 20261011130000_cars_click_counter; do for db in k9_plain k9_main; do su postgres -c "psql -X -d $db -v ON_ERROR_STOP=1 -1 -q" < $R/supabase/migrations/$m.sql > /dev/null 2>&1 && echo "re-apply $m on $db: OK" || echo "re-apply $m on $db: FAILED"; done; done > $EV/migration-chain/reapply_new_migrations.txt
echo "== chains built $(date +%T)" >> $EV/progress.txt
cd $R
step validate_supabase_migrations node scripts/validate-supabase-migrations.mjs
step tsc npx tsc --noEmit
step vite_build npx vite build --outDir $W/dist
step fe_vitest npx vitest run
cd $R/backend
step be_jest npm run test:jest
step be_vitest npm run test:vitest
step be_node npm run test:node
step be_chat_integrity npm run test:chat-integrity
cd $R
: > $EV/syntax_check.txt
for f in $(cd $R && grep -v '^#' /tmp/claude-0/-home-claude/9cccf2fd-fe77-5914-aa11-45af2d198133/scratchpad/changed-js.txt 2>/dev/null); do node --check $f >> $EV/syntax_check.txt 2>&1 && echo "ok $f" >> $EV/syntax_check.txt || echo "FAIL $f" >> $EV/syntax_check.txt; done
killservers
cd $H
step harness env KAYAD_TEST_DB=k9_main KAYAD_RLS_DB=k9_main node --test --test-concurrency=1 tests/*.test.mjs
killservers
rm -rf $H/data
cd $R
mkdir -p $EV/validators; cp /home/claude/msg/base3/KAYAD-main/docs/audits/evidence/final-verification/validators/list.txt $EV/validators/list.txt; : > $EV/validators/index.txt
while read -r v; do [ -z "$v" ] && continue; timeout 300 npm run "$v" > "$EV/validators/$v.txt" 2>&1; echo "$v rc=$?" >> $EV/validators/index.txt; done < $EV/validators/list.txt
echo "== validators done $(date +%T)" >> $EV/progress.txt
killservers
mkdir -p $EV/schema
cd $H
step route_schema_crawl env KAYAD_TEST_DB=k9_crawl node tools/route-schema-crawl.mjs $EV/schema/route-schema-crawl.json 45000
killservers
cd $R
VITE_API_URL=/api VITE_SOCKET_URL=http://api.kayad.test:5070 npx vite build --outDir $W/dist-crosshost > $EV/vite_build_crosshost.txt 2>&1
VITE_API_URL=/api VITE_SOCKET_URL=http://app.kayad.test:5070 npx vite build --outDir $W/dist-samehost > $EV/vite_build_samehost.txt 2>&1
cd $H; mkdir -p $EV/browser
su postgres -c "dropdb --if-exists k9_mx; createdb -T k9_main k9_mx" >/dev/null 2>&1
step matrix_prod env PROD=1 DIST=$W/dist KAYAD_TEST_DB=k9_mx LABEL=after node browser/p0-matrix.mjs $EV/browser/matrix-prod.json
killservers
step matrix_dev env KAYAD_TEST_DB=k9_mx LABEL=after node browser/p0-matrix.mjs $EV/browser/matrix-dev.json
killservers
su postgres -c "dropdb --if-exists k9_probe; createdb -T k9_main k9_probe" >/dev/null 2>&1
step realtime_host_probe env KAYAD_TEST_DB=k9_probe node browser/realtime-host-probe.mjs $EV/browser/realtime-host-probe.json $W/dist-crosshost $W/dist-samehost
killservers
cd $R/e2e
cp /home/claude/msg/base3/KAYAD-main/docs/audits/evidence/final-verification/e2e-playwright.local.config.ts.txt playwright.local.config.ts
step e2e timeout 900 npx playwright test --config playwright.local.config.ts --project chromium
rm -f playwright.local.config.ts; rm -rf test-results playwright-report
killservers
echo "== ALL DONE $(date +%T)" >> $EV/progress.txt
touch $EV/battery.done
