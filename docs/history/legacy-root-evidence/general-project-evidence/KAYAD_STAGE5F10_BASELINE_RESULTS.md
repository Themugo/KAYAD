# KAYAD Stage 5F.10 — Baseline results (merged tree, before any 5F.10 change)

Tree: 5F.9 overlaid with 5F.5 (see the merge ledger). Node 22.22.2. Logs: `validation-logs/baseline/`.

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | clean |
| `npm run build` | 0 | built (2,400 modules) |
| `npx vitest run` (frontend) | 0 | 91 files, 707 passed, 1 skipped (pre-existing skip) |
| `backend: npm run test:jest` | **1** | 146 suites: 144 passed, **2 failed**; 2,441 tests passed |
| `backend: npm run test:vitest` | 0 | passed |
| `backend: npm run test:node` | 0 | 1/1 |
| validators: supabase-migrations, foundation-integrity, owner-identity-convergence, master-identity-authz-corrections, stage5f2, stage5f6, stage5f7, 5f5 seller dashboard, 5f8, 5f9 | 0 | all passed |

## The two baseline failures (defect D-18, introduced by Stage 5F.9)

`tests/security/placeBidErrorContract.test.js` and `tests/auction/placeBidRejectedListing.test.js` fail because the 5F.9 evaluator imports `findById` and `findOne` from `../db/index.js`; those suites mock that module without those exports, so `placeBid` crashes before it reaches the behaviour under test. This was a regression in a shipped input, not a flaky test. It is resolved by rewriting the evaluator (it no longer uses `db/index.js`) and by stubbing the eligibility module in the affected suites (those suites test the bid error contract, not eligibility; eligibility has its own suites).

## What the baseline validators do and do not prove

The 5F.9 validator (`validate-stage5f9-eligibility.mjs`) compares strings in source files. It passed while the evaluator it described treated a vehicle with no proposal as eligible and enforced nothing inside PostgreSQL. A passing 5F.9 validator is therefore **not** evidence that the auction gate works; Stage 5F.10 adds behavioural proof (disposable PostgreSQL and HTTP end-to-end).
