# KAYAD Admin Phase 4 — Test Results

| Command/check | Result | Evidence |
|---|---|---|
| SHA-256 of foundation ZIP | PASS | Exact match to `af015b732dd3655a0957a90fe608e5bd1b6432d6ae9960a08d211bbb6302e8a6` |
| ZIP integrity | PASS | 6,548 entries; `testzip()` returned no corrupt entry |
| `node --version` | Environment blocker | `v22.16.0`; project requires >=22.22.2 |
| `node scripts/validate-admin-route-convergence.mjs` | PASS | 14/14 |
| `node scripts/validate-business-command-centre-phase04.mjs` | PASS | 13/13 |
| `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` | PASS | 11/11 |
| `node scripts/validate-stage5f1-command-centre-layout.mjs` | PASS | 11/11 |
| `node scripts/validate-ui-surface-convergence.mjs` | PASS | 9/9 |
| `npm run typecheck` | BLOCKED | Exit 2; dependencies/types missing, 1,104 diagnostics; no valid full typecheck |
| `npm run build` | BLOCKED | Exit 127; `vite: Permission denied` |
| `npm test -- --run` | BLOCKED | Exit 127; `vitest: Permission denied` |
| Authenticated browser/E2E | NOT RUN | Runtime unavailable |
| Screenshot comparison | NOT RUN | Browser capture unavailable |

Static validators are source-contract checks only and are not runtime certification.
