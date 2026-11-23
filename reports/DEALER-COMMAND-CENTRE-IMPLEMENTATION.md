# Dealer Command Centre — Implementation Report (rev 2, hardening phase)

Base `origin/main` bfe3735. Worktree `/home/claude/p9`, branch `work/dealer-command-centre`. **Nothing committed, pushed, merged or deployed. No hosted migration or hosted write.** Hosted Supabase was used for read-only metadata/SELECT checks only. **Production verification: NOT TESTED.** This is not a release-readiness claim.

Read with: `DEALER-FINANCIAL-DEFINITIONS.md`, `DEALER-LEDGER-RECONCILIATION.md`, `LEGACY-EARNINGS-ENDPOINT-AUDIT.md`, `DEALER-TEAM-WORKSPACE-OVERVIEW.md`, `BRANCH-INTEGRATION-PLAN.md`.

## Stop condition
Not triggered for escrow/payment/payout/ledger logic: **none was changed**. Discrepancies D1–D6 are documented with proposed fixes (not applied) in the reconciliation report.

## What exists
1. Read-only `GET /api/dealer-platform/command-centre` (owner full; members get only sections their permission keys unlock). Owner panel `CommandCentrePanel` inside the existing Overview.
2. Phase 2 additions: per-source degradation (`optional()`, `isMissingRelation`, `data.unavailable`; missing sources are hidden, never shown as zero), `data.truncated`; member overview tab (`TeamOverview`) inside the existing workspace; own-activity feed keyed on the authenticated member; legacy `/earnings` and `/summary` now carry an explicit revenue-basis label (`basis` / `revenueBasis`) — **numbers unchanged**.

## Files
Modified: `backend/controllers/dealerPlatformController.js`, `backend/routes/dealerPlatformRoutes.js`, `backend/routes/dealerRoutes.js` (label only), `backend/tests/regression/phase13dDealerIsolation.test.js` (mock gained `getCommandCentre`), `ci/db-journeys/run.sh` (journeys 18, 19), `src/features/DealershipWorkspace/DealershipWorkspace.tsx`, `src/__tests__/features/DealershipWorkspace.test.tsx`, `src/pages/dealer/dashboard/DealerDashboard.tsx`, `src/services/dealerPlatformApi.js`, `src/styles/dark-theme.generated.css` (see below).
New: `backend/services/dealerCommandCentre.service.js`, `backend/tests/regression/dealerCommandCentreService.test.js`, `src/pages/dealer/dashboard/CommandCentrePanel.tsx`, `src/features/DealershipWorkspace/TeamOverview.tsx`, `src/__tests__/pages/dealer/DealerCommandCentre.test.tsx`, `ci/db-journeys/18_…mjs`, `ci/db-journeys/19_…mjs`, `ci/browser/command-centre.mjs`, reports and `reports/evidence/command-centre/`.
No migrations. No new tables, permissions, routes or navigation.

**Generated / local-only artifacts.** `data/uploads.sqlite` is a local runtime database: **excluded**. `ci/db-journeys/out/*.json` local evidence: excluded. `src/styles/dark-theme.generated.css` is a build-generated file but **is tracked** and `src/__tests__/theme/darkThemeLayer.test.ts` fails when it is stale, so it **is included** (the previous v1 patch wrongly omitted it). After integration it must be regenerated: `node scripts/generate-dark-theme.mjs`.

## Results (local disposable stack; final tree unless noted)
| Check | Result |
|---|---|
| Backend jest, dealer/escrow/payout/ledger/team/command/phase13d/workspace subset | 44/44 suites, 974 tests VERIFIED |
| Service unit tests | 27/27 VERIFIED (within subset) |
| Frontend full suite | 225 files, 1904 passed, 1 skipped VERIFIED (two runs: under load and unloaded) |
| `tsc --noEmit`, `npm run build` | clean VERIFIED |
| Validators: dealer-workspace-navigation 16/16, code-splitting, frontend-runtime-contracts | PASS |
| Journey 18 (roles/isolation/read-only) | 69/69 VERIFIED |
| Journey 19 (ledger reconciliation, real payment/settlement flows) | 21/21 VERIFIED |
| Journeys 10, 11, 12, 14, 16, 17 | pass (run during this phase) |
| Browser harness | 196/196 VERIFIED; **re-run for fresh screenshots after the last screenshot-order edit is NOT done** — counts come from the run before that edit |

Journeys 18/19 and the browser run predate only the `phase13dDealerIsolation` mock fix (test-only); no runtime code changed afterwards.

### First-run frontend failure (investigated)
Test: `src/__tests__/theme/darkThemeLayer.test.ts > is up to date with the colour classes in src`. Not a flake: reproduced deterministically by restoring the stale generated CSS (1 failed, 1903 passed, 1 skipped, same signature as the first run). Cause: the generated file was stale until `npm run build` regenerated it. Resolved by including the regenerated file. The earlier "unexplained flake / load-related" note is superseded.

## Status by item
**Complete (local):** financial reconciliation for escrow-mode card/M-Pesa purchase, release, payout, refund, dispute flows; dashboard = records = ledger, trial balance 0; legacy labelling; member overview; isolation/session/removal tests; accessibility/keyboard/narrow/empty/error states.
**Partial:** source degradation covers offers, settlements, auction outcomes, team feed; core tables (escrows etc.) deliberately still fail loudly.
**Blocked / needs owner decision:** D1 payout-prepare function defect (migration), D2 commission-rate recompute at release, D3 release sync between endpoint and RPC, D4 direct-mode receivable, legacy endpoint correction, enquiry assignment feature, applying hosted migrations (hosted lacks auction_outcomes, auction_setups, dealer_listing_lifecycle_events, marketplace_offers, marketplace_offer_settlements, purchase_outcomes).
**Not tested:** auction-win, offer-settlement and bank-transfer funding ledger flows; `closed` escrows; concurrency; production/hosted behaviour; real devices.
