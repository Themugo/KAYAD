# 31 — Final release gates and regression (2026-11-24)

## Regression (this tree; exact commands, environment: Linux container, Node 22, PostgreSQL 16, PostgREST, loopback only)
| Suite | Command | Exit | Result |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | 0 | clean |
| Build | `npm run build` | 0 | built (`dist/`) |
| Vitest, full | `npx vitest run` | **1 on first run** | 236/237 files, 2075 passed, 1 failed, 1 skipped |
| Vitest, the failing file alone, twice | `npx vitest run src/__tests__/context/PublishedDesignRuntime.test.tsx` | 0, 0 | 5/5 each time |
| Backend Jest, 6 batches (`--experimental-vm-modules --maxWorkers=2`) | batched to avoid the known OOM | 0 ×6 | 4,366 tests passed (1,183 + 966 + 631 + 845 + 679 + 62 across batches; 21 skipped in the first batch) |
| DB journeys, all (44 incl. legacy; 33, 34, 35 and the new route-authorisation probes included) | `ci/db-journeys/run.sh` | 0 | 1,385 assertions, 0 FAIL; 1,232 s |
| Authorisation journeys re-run after the route fixes | journeys 14, 26, 29, 31, 32, 33, 34, 35 | 0 | 2, 22, 114, 73, 5, 107, 33, 5 assertions pass |
| Browser sweep, 53 routes × 2 roles × 2 widths | `ci/browser/admin-sweep.mjs` | 0 | 212 rows, 0 problems |
| axe + keyboard + overflow | `ci/browser/admin-a11y.mjs` | 0 | 0 serious/critical pages |
| Disposable restore rehearsal | `pg_dump -Fc` → `pg_restore` into a fresh `kayad_ci_restore` | 0 | 242 tables, 306 functions, 149 policies, 791 indexes, 639 rows identical |
| Screen reader | — | — | **NOT PERFORMED** (no NVDA in this environment) |

**First-run failures, disclosed.** (1) Journey 35 failed on its first runs (own probe bugs, then real findings: 63 any-staff routes). Each was fixed in the code, not in the test, and the checks were tightened, not weakened (5xx baseline is explicit and a new 5xx fails). (2) Vitest `PublishedDesignRuntime` failed once in the 237-file run (`expected '' to be '#AA0000'`, a CSS-variable timing assertion under load) and passed 5/5 twice in isolation. It is the same class of load-timing failure seen earlier on Windows; no test was weakened. A re-run of the full suite was not repeated.

Evidence copies: `evidence/final-regression-2/`, `evidence/sweep-final/`, `evidence/a11y-final/`, `evidence/restore-rehearsal/`.

## Release gates
| Gate | Status | Why |
|---|---|---|
| Checkout reconciliation | **PASS** | work tree = `origin/main` `a24a8629`, includes `9488526b`; nothing overwritten |
| System-health access | **PASS** (local) | technical-only eligibility, server + UI, journey 33 |
| Admin write endpoint audit | **BLOCKED** | audit complete (707 routes) and 54 defects fixed; **UD-1** (anonymous bid route) needs owner approval to fix because it touches the frozen auction flow; OD-5 awaits a decision |
| Admin route authorization | **PASS** (local) | 53 routes swept, API and UI agree |
| Moderator direct-URL protection | **PASS** (local) | 33 routes refused by direct URL; API agrees (journey 32) |
| Suspension/reinstatement governance | **PASS** (local) | journeys 30, 33 |
| Account governance | **PASS** (local) | unified personal account, Purity untouched |
| Financial operation safety | **NOT VERIFIED** | authorisation tested; no money movement or hosted function body checked; logic frozen |
| Screen-reader accessibility | **NOT VERIFIED** | no screen reader available; gate open |
| Migration ledger parity | **FAIL** | 47 repository migrations missing hosted, 34 unrecorded, 3 recorded-but-incomplete, 18 unknown (security hardening among them) |
| Hosted schema compatibility | **FAIL** | the six named objects: five absent hosted; `kayad_transition_escrow_atomic` present |
| Disposable restore rehearsal | **PASS** | doc 30 |
| Production migration runbook | **PASS** (prepared, not approved) | doc 30 |
| Regression suite | **PASS** | with the disclosed first-run vitest timing failure |
| GitHub branch/PR state | **NOT VERIFIED** | PR 266 cannot be inspected from here; `main` = `a24a8629` as pushed by the owner |
| ZIP integrity | see the delivery message | recorded with the ZIP |

## Decision: **CONDITIONALLY READY** (for release review, not for production)
The Admin Console is locally and disposable-DB verified. It must not be released until: (1) the owner decides UD-1 and OD-5, (2) the hosted database is brought to parity through the owner-authorised, rehearsed runbook (doc 30), (3) a human screen-reader pass is done, and (4) PR 266 is checked. Nothing here is production evidence.
