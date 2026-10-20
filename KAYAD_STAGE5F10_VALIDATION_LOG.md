# KAYAD Stage 5F.10 — Validation log (commands and exit codes)

Date 2026-10-20, Node 22.22.2. All databases: local disposable PostgreSQL 16 (127.0.0.1, names ending _disposable). Nothing hosted.

## Baseline (input A, 5F.9, before changes) — validation-logs/baseline/
```
typecheck exit=0 secs=23
build exit=0 secs=1
frontend_vitest exit=0 secs=100
backend_jest exit=1 secs=106
backend_vitest exit=0 secs=9
backend_node exit=0 secs=1
validate:supabase-migrations exit=0 secs=0
validate:foundation-integrity exit=0 secs=0
validate:owner-identity-convergence exit=0 secs=0
validate:master-identity-authz-corrections exit=0 secs=0
validate:stage5f2-dashboard-data-workflow exit=0 secs=1
validate:stage5f6-buyer-convergence exit=0 secs=0
validate:stage5f7-private-auction-contract exit=0 secs=0
v5f5seller exit=0 secs=0
v5f8 exit=0 secs=0
v5f9 exit=0 secs=0
BASE_DONE
```
Baseline backend_jest exit=1: 2 failing suites (D-18); 2,441 tests passed.

## Final (merged + changed tree) — validation-logs/final/
```
typecheck exit=0 secs=21 :: npm run typecheck
build exit=0 secs=1 :: npm run build
frontend_vitest exit=0 secs=99 :: npx vitest run
backend_jest exit=0 secs=99 :: npm run test:jest
backend_vitest exit=0 secs=9 :: npm run test:vitest
backend_node exit=0 secs=0 :: npm run test:node
validate:supabase-migrations exit=0 secs=0 :: npm run validate:supabase-migrations
validate:foundation-integrity exit=0 secs=1 :: npm run validate:foundation-integrity
validate:owner-identity-convergence exit=0 secs=0 :: npm run validate:owner-identity-convergence
validate:master-identity-authz-corrections exit=0 secs=0 :: npm run validate:master-identity-authz-corrections
validate:stage5f2-dashboard-data-workflow exit=0 secs=0 :: npm run validate:stage5f2-dashboard-data-workflow
validate:stage5f6-buyer-convergence exit=0 secs=0 :: npm run validate:stage5f6-buyer-convergence
validate:stage5f7-private-auction-contract exit=0 secs=0 :: npm run validate:stage5f7-private-auction-contract
validate:stage5f10-private-seller-gate exit=0 secs=0 :: npm run validate:stage5f10-private-seller-gate
v5f5seller exit=0 secs=0 :: node scripts/validate-stage5f5-private-seller-dashboard.mjs
v5f8 exit=0 secs=0 :: node scripts/validate-stage5f8-contract.mjs
v5f9 exit=0 secs=0 :: node scripts/validate-stage5f9-eligibility.mjs
pg_stage5f10 exit=0 secs=35 :: env PGHOST=127.0.0.1 PGPORT=54339 PGUSER=postgres bash /home/claude/s10/pgtest.sh
http_stage5f10 exit=0 secs=1 :: node runbooks/stage5f10-private-seller-custody-20261020/http/stage5f10_http_e2e.mjs
ui_stage5f10 exit=0 secs=74 :: node runbooks/stage5f10-private-seller-custody-20261020/ui/ui_5f10.mjs
role_api_5f5 exit=0 secs=8 :: node role_api_5f5_merged.mjs
ui_5f5_admin exit=0 secs=51 :: node ui_5f5_admin_merged.mjs
FINAL_DONE
```

## Extra commands
```
sha256sum <input A zip> <input B zip>      -> match (see KAYAD_STAGE5F10_INPUT_VERIFICATION.md)
bash 10_replay_migrations.sh kayad5f10_replay_disposable supabase/migrations   exit=0  :: migrations=183 failed=0
```

Counts (from the final logs): frontend 716 passed/1 skipped/0 failed (93 files); backend jest 2,460 passed (148 suites); backend vitest 36; node:test 1; PG 227/227; HTTP 46/46; browser 23/23; 5F.5 admin API 88/88; 5F.5 admin UI 27/27; wiring validator 44/44.

Note: during the first final run of test:node, a detached shell without redirected stdin hung; not reproducible, passes in <1 s with stdin closed.
