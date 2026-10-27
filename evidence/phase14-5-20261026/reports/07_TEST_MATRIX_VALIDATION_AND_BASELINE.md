# Test Matrix, Validation and Baseline Regression Report
Logs: `evidence/phase14-5-20261026/logs/`. Working directory: project root (backend commands in `backend/`).
| Check | Command | Exit | Result | Log |
|---|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | clean | tsc.txt |
| Build | `npm run build` | 0 | ok | build.txt |
| Vitest (frontend) | `npx vitest run` | 0 | 114 files, 926 passed, 1 skipped (14.4: 924) | vitest.txt |
| ESLint src | `npx eslint src` | 0 | 0 errors, 1,565 warnings (unchanged from 14.4) | eslint-src.txt |
| ESLint whole repo | `npx eslint .` | 1 | 2,313 errors in the first run; 14.4 baseline measured 2,291 (eslint-all-baseline144.txt). All errors are `no-undef`/`no-unused-vars` in `scripts/`, `runbooks/`, `evidence/`, `reports/` (config defines no Node globals there); none in `src`. The 22-error difference came from the two new files, which were fixed (global comments) and lint clean (verified by linting them alone, exit 0); the whole-repo run was not repeated | eslint-all.txt |
| Source checks | `node runbooks/phase14-20261026/phase14_dealer_dashboard_source_checks.mjs` | 0 | 26/26 | source-checks.txt |
| Naming/path validator | `npm run validate:repository-naming` (with `--base` previous release for change checks) | 0 | 9/9 | naming.txt |
| Backend Jest (includes 13I–13K suites) | `cd backend && npm run test:jest` | 0 | 161 suites, 2,877 passed (14.4: 160 / 2,841; +1 suite/+36 tests) | backend-jest.txt |
| Backend Vitest | `cd backend && npm run test:vitest` | 0 | 6 files, 36 passed | backend-vitest.txt |
| Backend node:test | `cd backend && npm run test:node` | 0 | 1/1 pass | backend-node-test.txt |
| Validators | every `validate:*` (143) | — | 136 pass, 7 fail | validators.txt |
| Browser (MOCKED API) | `node runbooks/phase14-5-20261026/dealer_workflows_browser_check.cjs` | 0 | 16 views × 3 viewports: 0 crashes, 0 overflow, 0 serious/critical axe, 0 page errors; flows captured | browser-run.txt, workflow-browser-results.json |
| Whole-suite not run | DB/migration tests, live certify scripts | — | NOT RUN: no database | — |

## Baseline validator failures (all 7 re-run; each classified)
| Validator | Result | Classification | Evidence |
|---|---|---|---|
| communications:providers | exit 1 | confirmed baseline failure (script error; same output as 14.4 except path text) | val-validate_communications_providers.txt |
| live-runtime | exit 1 | environment-blocked (missing SUPABASE_URL / SERVICE_ROLE_KEY) | identical to 14.4 |
| v14:live-certification-contract | exit 1 | confirmed baseline (14/15; "dealer certification routes exist") | identical to 14.4 |
| v14:release-candidate | exit 1 | confirmed baseline (cascades from the previous) | identical to 14.4 |
| brand-palette-convergence | exit 1 | confirmed baseline (1 issue) | identical to 14.4 |
| stage24-theme-convergence | exit 1 | confirmed baseline | identical to 14.4 |
| stage5f7-private-auction-contract | exit 1 | confirmed baseline (ENOENT for KAYAD_STAGE5F7_PHASE_A_CONTRACT_FREEZE.md) | same as 14.4 except path text |
**New regressions: none.** The new validator `validate:repository-naming` passes. No assertions were weakened or removed.

## Write-path matrix (all MOCKED; live items BLOCKED)
Profile PUT, team invite/update/remove: 36 backend tests (27 fail on 14.4 code, 36 pass now). Frontend listing create/edit/settings/team: Vitest + browser request capture (multipart POST /api/cars, PUT /api/cars/:id, PUT profile with phone only when changed, POST team/invite, DELETE team/:id).
