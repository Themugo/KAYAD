# 10 Regression matrix (14.6 final run, exit codes from logs/)
| Check | Result | 14.5 baseline |
|---|---|---|
| tsc --noEmit | exit 0 | 0 |
| npm run build | exit 0 | 0 |
| Vitest (frontend) | 114 files, 940 passed, 1 skipped | 114 / 926 / 1 |
| eslint src | exit 0, 0 errors, 1,565 warnings | 0 / 1,565 |
| eslint . | 2,286 errors (legacy tooling, report 04) | 2,313 |
| Dealer source-contract checks | 26/26 PASS | 26 |
| Naming/path validator (with --base 14.5) | 9/9 PASS | 9/9 |
| validate:* (143 scripts) | 138 pass, 5 fail (report 06) | 136 / 7 |
| Backend Jest | 163 suites, 2,898 passed | 161 / 2,877 |
| Backend Vitest | 6 files, 36 passed | 36 |
| node:test | 1/1 | 1/1 |
| 14.5 dealer security suite (36) | passed within Jest | 36 |
| New: profile/phone (9), team policy (12) | passed | - |
| Organization isolation and public projection | included in the 14.5 suite, passed | passed |
| Browser (real bundle, mocked API) | 48 views clean, 29 flow records, 0 interruptions | 14 sections |
Note: Jest output contains logged errors from tests that deliberately exercise failure paths (e.g. ledgerRedactionAndCircuit); suites pass.
Protected-domain diff vs the 14.5 foundation (logs/changed-files.txt): no change to payments, M-Pesa, escrow, ledger, bidding, settlement, refunds, payouts, reconciliation, financial idempotency, auction code or Super Admin auth. Only backend source change: authController.updateProfile (account profile).
