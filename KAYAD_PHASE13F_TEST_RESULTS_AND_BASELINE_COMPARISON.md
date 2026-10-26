# Test results and baseline comparison (fresh runs, Node v22.23.4)

| Suite | Baseline (pristine 13E) | Final (13F) | Log |
|---|---|---|---|
| Typecheck | exit 0 | exit 0 | baseline-typecheck / final-typecheck |
| Vite build | OK | OK | baseline-build / final-build |
| Frontend vitest | 3 failed, 834 passed, 1 skipped (2 files failing) | 0 failed, 848 passed, 1 skipped, 106 files | baseline-vitest-frontend / final2-vitest-frontend |
| Backend jest | 155/155 suites, 2773 tests | 156/156, 2791 tests | baseline-jest-backend / final2-jest-backend |
| Backend vitest | 6 files pass | 6 files pass | baseline-vitest-backend / final-vitest-backend |
| node:test | 1 pass | 1 pass | baseline-nodetest-backend / final-nodetest-backend |
| HTTP lifecycle matrix | n/a (new) | 103/103 | final-http-lifecycle-matrix |
| DB driver (+43-assertion SQL) | n/a (new) | 28/28 | final-db-validation-driver |
| Browser journeys | n/a (new) | 60/60 | final-ui-journeys |
| validate:phase13e-listing-visibility | — | 14/14 | final-validate:phase13e-listing-visibility |
| migration hygiene | — | PASS | final-validate:migration-hygiene |

Baseline frontend failures were 13E defects (admin review page tests; AdminShell icon-count 29≠30); fixed, not skipped.

ESLint (same command, `eslint .`, both trees): baseline 2255 errors / 1557 warnings; final 2284 / 1557 before adding a file-level `eslint-disable no-undef` header to the two new Node harness files (the extra 29 were `no-undef` in those harnesses only; no new errors in application code; the touched application files lint with 0 errors). The "5 errors" figure quoted in 13E does not correspond to `eslint .` on this tree and is not reproduced.

Sequence note: after the final suite runs, only two edits were made — the eslint-disable headers on the two harness files and the `validate:phase13f` package script (syntax-checked); no application source changed after the final runs. The HTTP matrix, UI journeys and DB driver were re-run on the final backend code after the last application edit (cache-pattern narrowing).

Frequency of reruns: matrix run1 → defects found; run2 → 103/103; final → 103/103 (logs retained).
