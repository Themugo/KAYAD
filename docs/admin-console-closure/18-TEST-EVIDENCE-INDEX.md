# 18 — Test evidence index (2026-11-24)

All results are local/disposable-stack. Exit codes are the real process exit statuses captured by the runner scripts.

| Suite | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` | exit 0 |
| Frontend unit/integration | `npx vitest run` | exit 0 — 236 files, 2,057 passed, 1 skipped |
| Production build | `npm run build` | exit 0 |
| Backend Jest | `node --max-old-space-size=3072 --experimental-vm-modules jest --forceExit --maxWorkers=2` — a single full run is OOM-killed (exit 137) in this container, so it was executed **in 6 sequential batches covering every recognised suite** (266) | all batches exit 0; 3,199 tests passed, 21 skipped, 0 failed |
| DB journeys (41 incl. legacy j1–j10, 03–32, 99 browser hold) | `ci/db-journeys/run.sh` on disposable DB | overall PASS, 0 failures; 862 checks summed from suite summaries |
| Journey 30 personal accounts & dealer suspension | within run.sh | 62/62 |
| Journey 31 admin workflow closure | within run.sh | 73/73 |
| Journey 32 route API authorisation (96 endpoints) | within run.sh; rerun on final code | 5/5 |
| Journey 29 permission matrix | within run.sh | 114/114 |
| Browser closure journeys | `ci/browser/admin-closure.mjs` (final code) | 32/32 |
| Browser sweep (53 routes × SA/moderator × 1440/390) | `ci/browser/admin-sweep.mjs` | 212 rows, 0 problems; now records API calls |
| Accessibility/keyboard/responsive | `ci/browser/admin-a11y.mjs` | see 10 (4 open findings) |
| Route classification | `node scripts/admin-closure-route-certification.mjs` | 53 routes classified, 0 self-check problems |

## Defects found during the closure run and their evidence
* Review moderation/delete 22P02 — journey 31 B3/B5 failed → fixed → 73/73.
* Moderator could read six staff endpoints — journey 32 T3 failed → five fixed (bids, ads×2, referrals, dealer payout accounts) → T3 passes; one (`system/health`) is a documented owner decision OD-5.
* Backend matrix `stage5f5RoleRouteMatrix` caught an over-reach of my first fix (system/health) → reverted.

## Integrated journeys A–F (master prompt §16) — where each is evidenced
| Journey | Evidence |
|---|---|
| A Super Admin: login → dashboard → users → dealer approvals → settings → logout | browser J1–J3, J6–J12; journey 31 A |
| B Moderator: login → permitted pages → blocked direct URLs → no unauthorised API | browser J3, J13–J16; sweep; journey 32 T3 |
| C Personal account: register/verify/list → admin sees correct state → suspend/restore | journeys 20, 07, 30 |
| D Dealer suspension: request → separation of duties → approval/rejection → audit | journey 30, browser J20–J22 |
| E Financial/marketplace: read-only + invalid transitions, no money movement | journeys 05, 19, 31 E |
| F Settings: save → reload → effective behaviour | journey 31 A |
These are composed from existing journeys rather than one continuous script; each step is real HTTP/browser evidence on the disposable stack.

## Final-code rerun (after the last backend edit)
Journeys 26 (22/22), 27 (47/47), 28 (16/16), 29 (114/114), 31 (73/73), 32 (5/5) and browser closure (32/32) were re-executed on the final code. tsc, vitest and build ran before the last backend-only edit (revert of one route guard; no frontend file changed afterwards); backend Jest ran after it.
