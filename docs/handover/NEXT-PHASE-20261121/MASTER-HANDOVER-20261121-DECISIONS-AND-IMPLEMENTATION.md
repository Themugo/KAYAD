# KAYARD KE — master handover: next-phase decisions and controlled implementation (2026-11-21)

Scope: controlled **local** implementation and verification only. **Not done, not authorised:** commit, push, merge, deploy, hosted migration, production data change, production payment/settlement action. Nothing was applied to hosted; hosted access was read-only SELECT.

## ⚠ Local-only migrations — must NOT be applied to hosted without separate approval
`20261121090000_offer_action_replay_lookup_fix.sql`, `20261121100000_reconciliation_issue_rows.sql`, `20261121110000_offer_settlement_binding.sql`. (Hosted also lacks 79 earlier post-`20260922060457` migrations and the offer/purchase-outcome chain they depend on; see the hosted plan.) The settlement migration was amended in place this phase because it was unreleased.

## 1. Baseline (§2) — COMPLETE
`/home/claude/align/baseline-20261121/` (outside the repo tree): `BASELINE.md`, branch, HEAD, remotes, status, untracked list, full diff patch, `working-tree-snapshot.tgz`. The working tree is a git repository with extensive uncommitted work; nothing was reset, cleaned, overwritten or discarded. Delivered-ZIP checksums were re-verified against `SHA256SUMS-*.txt`.

## 2. Status by deliverable
| # | Deliverable | File | Status |
|---|---|---|---|
| 1 | Master handover | this file | complete |
| 2 | Offer-payment lifecycle and reservation | `OFFER-PAYMENT-LIFECYCLE-AND-RESERVATION-DESIGN-20261121.md` | implemented + **locally verified** (74 DB-backed checks); limitations stated |
| 3 | GAP-ANOMALY schema decision | `GAP-ANOMALY-SCHEMA-DECISION-20261121.md` | **owner decision required**; no code/schema change |
| 4 | Aggregation audit and corrections | `AGGREGATION-AUDIT-AND-CORRECTIONS-20261121.md` | defects reproduced, engine rewritten, **locally verified** (16 DB + 7 unit checks) |
| 5 | Write-route security audit | `WRITE-ROUTE-SECURITY-AUDIT-20261121.md` + `WRITE-ROUTE-MATRIX-20261121.csv` | **partial**: 690 routes mapped, ~45 inspected, 1 fix; rest unverified |
| 6 | Hosted migration reconciliation plan | `HOSTED-DB-MIGRATION-RECONCILIATION-PLAN-20261121.md` (+ P3) | plan complete; definition equality **BLOCKED** (no clone) |
| 7 | CI execution evidence | `CI-EXECUTION-EVIDENCE-20261121.md`, `evidence/ci-run-final/` | local run **verified**; **GitHub Actions NOT TESTED** |
| 8 | Provider journey matrix | `PROVIDER-JOURNEY-STATUS-MATRIX-20261121.md` | all provider journeys **BLOCKED** (no sandbox credentials) |
| 9–11 | Full-project ZIP, reports ZIP, SHA256 | `/home/claude/align/out/KAYARD-KE-NEXT-PHASE-DECISIONS-20261121-*.zip`, `SHA256SUMS-DECISIONS-20261121.txt` | produced |
Also: `HOMEPAGE-AND-COMPONENT-AUDIT-20261121.md`.

## 3. What changed in code this segment (all uncommitted)
* **Offers (decisions 1–7):** DB settlement/reservation, 48 h server window, immutable agreed amount, derived reservation flag on list/detail/search (no buyer identity, listing stays public), "Reserved" chip in `VehicleDetailModal`, whole-KES validation (API + DB), competing-payment refusal, payment freeze coverage, audit events with actor_role/reason.
* **Aggregation:** new `backend/models/aggregateEngine.js`; `Model.aggregate()` now reads all rows (paged), matches correctly, supports `$count/$facet/$min/$max/$first/$last/$push/$addToSet/$unwind/$project`, expressions and compound `_id`, and **throws on anything unsupported**. Behaviour change: dashboards that previously returned empty/low numbers now return real ones; `$avg` ignores missing values.
* **Wallet withdraw (W-1):** `POST /api/wallet/withdraw` rejects fractional KES (was rounded in the DB function).
* **Cleanup:** `DealerBusinessView.tsx` deleted after dependency proof (no route/import/dynamic/test dependency; validators only assert its absence). Hero CTA controls were **not** touched (audit only).
* **Guards/tests:** `scripts/validate-write-route-policy.mjs` + `write-route-public-allowlist.json`, `scripts/write-route-matrix.py`, `backend/tests/regression/aggregateEngine.test.js`, `walletWithdrawWholeKes.test.js`, `ci/db-journeys/06_aggregate_shim.mjs`; runner now writes `migrations.txt`, `stack.txt`, `cleanup.txt` and drops its database; `CLAUDE.md` updated.
* Fixed two regressions I introduced mid-segment (found by the full Jest run): an unused `logWarn` import in `offerSettlement.service.js`, and the `carAuctionLockAndUpdate` suite needed a mock for the controller's new `offerSettlement.service` dependency (pass-through; no assertion changed). No test was deleted, skipped or weakened.

## 4. Verification (§8) — commands and exact results
| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` | exit 0, no output |
| Frontend tests | `npx vitest run` | 208 files passed; **1752 passed, 1 skipped** (1753) |
| Frontend build | `npx vite build` | exit 0 (chunk-size warnings only) |
| Backend Jest | `cd backend && node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=1` | **249 suites passed, 1 skipped; 4149 passed, 21 skipped** (4170). (First pass this segment had 5 failing suites — my regressions above — fixed and re-run) |
| Backend Vitest | `npx vitest run --config vitest.config.js` | 11 files, 61 tests passed |
| Node tests | `node --test --test-force-exit tests/response-lifecycle.test.js tests/node/personalListingEligibilityProjection.test.js` | 13 pass, 0 fail |
| Validators | `for f in scripts/validate-*.mjs; do node $f; done` | **357 scripts, all exit 0** (`evidence/verification-final/validators.csv`); re-run after the last code edit |
| DB journeys (empty DB) | `PGPORT=54329 POSTGREST_BIN=… ci/db-journeys/run.sh` | **205/205 migrations; 14 journeys exit 0, 0 failures**; cleanup verified |
| Security / write-route regression | `validate-write-route-policy.mjs`; `walletWithdrawWholeKes.test.js`; security jest folder | pass |
Skips: 21 Jest tests and 1 Vitest test are pre-existing skips (not added by this work). Blocked: provider journeys, GitHub Actions, hosted comparison.
Logs: `evidence/verification-final/`, `evidence/ci-run-final/`.

## 5. Completed / locally verified / externally verified / blocked / unverified
* **Completed & locally verified:** offer-payment lifecycle and reservation; whole-KES enforcement; aggregation engine and fixes; reconciliation issue rows; W-1 fix; DealerBusinessView removal; empty-DB runner.
* **Externally verified:** **nothing.** No provider sandbox, no GitHub Actions run, no hosted comparison.
* **Blocked:** M-Pesa STK/callback/B2C, Cloudinary, bank funding, hosted definition diff (no clone), GitHub Actions (nothing pushed).
* **Unverified / open:** GAP-ANOMALY (needs decision; the detection writer has a bug); ~640 of 690 write routes inspected only by static map; no IDOR sweep; mobile homepage rendering not tested; race-test not mutation-tested; seller soft-delete of a reserved listing (decision needed); legacy journey j8 asserts nothing; dead hero CTA admin controls (decision needed); rollback never rehearsed.
* **Release readiness: NOT claimed.** Critical dependencies (hosted migrations, provider sandbox runs, GitHub CI) have no evidence.

## 6. Decisions needed from the owner
1. GAP-ANOMALY: approve option A (additive migration + detection bug fix)?
2. Reserved listing: may a seller withdraw/soft-delete while `awaiting_payment`?
3. Hero CTA admin fields: remove or align (current homepage unchanged)?
4. Wallet: require idempotency key and `paymentLimiter` on withdraw (W-2)?
5. Approve a staging clone to rehearse the 82-migration apply, and later a separate authorisation for production.
6. Push a branch/PR to exercise GitHub Actions (you asked earlier for commands; I supplied them and did not push).
