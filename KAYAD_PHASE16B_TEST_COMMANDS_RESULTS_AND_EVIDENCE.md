# KAYAD Phase 16B — Test commands, exit codes, counts, failures

All runs on the final tree unless stated. Local disposable stack only (PostgreSQL 16 + PostgREST + Redis + backend on loopback); **nothing hosted**. Raw logs: `validation-logs/phase16b/`.

## Static / unit
| Command | Exit | Result |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | 0 | clean |
| `npm run build` | 0 | built |
| `npm test` (frontend Vitest) | 0 | 119 files, **960 passed, 1 skipped** (961) |
| `cd backend && npm run test:jest` | 0 | 175 suites, **3063 passed** (includes 16B: route exceptions 4 groups + MFA charging contract = 31 tests across the two 16B files) |
| `cd backend && npm run test:vitest` | 0 | 6 files, 36 passed |
| `cd backend && npm run test:node` | 0 | 1/1 |
| every `validate:*` script (143) | 141 × 0 | **2 × 1, both environmental**: `validate:communications:providers` (needs live email/SMS credentials) and `validate:live-runtime` (needs hosted Supabase credentials). `validate:stage5f7-private-auction-contract` now passes. `validate:repository-naming` passes (a first run caught Windows-illegal `:` in my own log file names; renamed) |

## Database / HTTP E2E (final code)
| Suite | Mode | Pass | Fail |
|---|---|---|---|
| owner_identity_governance (Phase 16) | owner tables | 73 | 0 |
| phase16a_arrangement | owner tables | 58 | 0 |
| account_security | owner tables / legacy | 47 / 47 | 0 / 0 |
| identity_integrity | legacy | 12 | 0 |
| dealer_lifecycle | legacy | 50 | 0 |
| dealer_payments | legacy | 73 | 0 |
| inventory_team | legacy | 60 | 0 |
| superadmin_governance | legacy | 73 | 0 |
| **phase16b_owner_dealer_separation (new)** | owner tables | **41** | 0 (3 of 3 repeats) |
| Negative control: same new suite on the unmodified 16A code | owner tables | – | S7 fails (12 evaluated, never locked) → the test does detect the defect |

Honest notes on harness runs: (1) the first legacy-mode sweep dropped `WEBHOIST_EMAIL` and produced 29 spurious `DECISION_AUTHORITY_REQUIRED` failures — runner fixed, not a code issue; (2) `inventory_team` needs `VERIFICATION_RATE_LIMIT_MAX`/`REGISTRATION_RATE_LIMIT_MAX` raised (verify-email throttling, identical 48/12 on the original 16A code, 60/60 when raised); (3) in the final sweep `account_security` B5 (password-change rate limit) failed only because my runner had also raised that limit; reverted and re-run 47/47 on both modes; (4) the new suite's S7 burst was reduced from 40 to 12 and made 408-tolerant because 30–40 concurrent bcrypt requests exceed the server's request timeout on a 2-core box. No assertion was weakened to hide a defect, and no existing assertion was edited.

## Role-by-route matrix (786 routes × 16 roles = 12,576 cells)
Baseline vs final: **0** cells moved from 401/403; low-privilege 2xx cells 235 → 235 (0 added, 0 removed); every `/api/owner*` route is 4xx for all non-owner roles. Routes with any 500: 239 → 222 (see defect ledger). Finance/support staff restrictions from Phase 16 unchanged.

## Registration / dealer onboarding PG rehearsal
`registration_dealer_onboarding_pg_checks.sh`: **47/47** on a hosted-shaped clone (apply, byte-identical rows, grants, function behaviour, atomicity, idempotency, rollback guards, rollback, roll-forward).

## Browser (real stack, Playwright + axe-core)
`browser_16b_real_stack.cjs`: **18/18**. Run 1 was 17/18 and found a real WCAG contrast defect (dealer onboarding button, 2.23:1), fixed, re-run 18/18. Covers owner management, real-TOTP enrolment, recovery codes, sign-in MFA challenge, wrong code, recovery-code sign-in, dealer/user blocked from `/admin/owners` (UI and `/api/owner` 403), dealer onboarding at 1280px and 390px (no horizontal overflow), axe with no critical/serious violations on owner management, MFA challenge and dealer onboarding. Screenshots in `validation-logs/phase16b/browser/`. Responsive note: the owner ledger table is cramped at 390px (logged as P3).

## Lint
Root ESLint ignores `backend/` (`.eslintignore`), so **11 changed backend files are skipped by the normal lint**. They were additionally linted with `--no-ignore --rule no-undef:off` and `node --check`: 5 findings (`no-control-regex` ×3, `no-dupe-keys` ×2 in `db/index.js` and `models/_base.js`), **all pre-existing in lines 16B did not touch** (verified by diff against the 16A copy). Changed non-ignored files (`DealerOnboarding.jsx`, the new runbook `.cjs` files) lint clean. Logs: `lint16b*.txt`.

## Not run / not possible here
Live email/SMS provider certification; hosted Supabase checks; real M-Pesa; real owner-invitation email delivery.
