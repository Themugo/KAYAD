# KAYAD Phase 13E — Regression and Validation Report
Baseline note: the Phase 13D numbers below come from the validation run of the byte-identical 13D source executed earlier in this same environment (logs in `validation-logs/baseline-13d/`). They were **not re-executed as a separate pre-change run in 13E**; the foundation ZIP hash and `unzip -t` were re-verified.

| Check | Phase 13D baseline | Phase 13E result | Difference | Explanation |
|---|---|---|---|---|
| `npx tsc --noEmit` | exit 0 | exit 0 | none | — |
| `npm run build` | exit 0 | exit 0 | none | — |
| Frontend Vitest | 103 files, 808 passed, 1 skipped | 105 files, 832 passed, 1 skipped | +2 files, +24 tests | new dashboard and Seller Studio gate tests; nothing removed or weakened |
| ESLint `npx eslint src` | exit 1: 5 errors, 1,556 warnings | exit 1: 5 errors, 1,556 warnings | none | a first run showed +1 warning in the new hook (setState in effect); fixed before the final run |
| Backend Jest (full) | 154 suites, 2,747 passed | 155 suites, 2,772 passed, exit 0 | +1 suite, +25 tests | `phase13eSellerCapability`; the 173-test 13D dealer-isolation suite still passes inside this run |
| Validators (19 run) | 17/18 pass (`stage5f7-private-auction-contract` fails, pre-existing relocated doc path) | 18/19 pass; same single failure | +`supabase-migrations` pass | `premium-sell-auth-public-convergence` pinned the old role-only seller gate; updated to the capability-aware gate (23/23) — see ledger |
| `validate:supabase-migrations` | not run in 13D | exit 0 | — | static check of the migration set; **not** a database run |

## What the new tests prove (mocked local runtime / component tiers)
- Capability lifecycle, duplicate prevention, validation, authorization of review, self-approval refused, audit calls, transition rules (25 backend tests).
- Listing guard: buyer in each state refused; approved personal seller allowed with no dealer privilege (`dealerBusinessOnly` still refuses); legacy sellers preserved, suspended/rejected/revoked now blocked; dealers/staff unchanged.
- Dashboard: buyer, pending, approved, rejected, suspended/revoked, load failure, legacy seller, non-personal roles (24 frontend tests).

## Not run / not established
Playwright and any browser journey; backend Vitest and `node:test` runners; SQL execution, RLS and backfill on a real database; staging; production; cookie/CSRF on the real domain; email/OTP delivery; responsive rendering; live-listing behaviour on suspension (undefined by policy). Protected financial suites were included in the full Jest run (passing) but no financial code was modified.
No test was weakened; one existing validator assertion was updated and one is listed above.
