# Phase 14.4 — Test / Exit-Code Matrix, Write-Path Matrix, Change Ledger

## Validation (exit codes; logs in validation-logs-phase14-4/)
| Check | Command | Exit | Result |
|---|---|---|---|
| Type check | `npx tsc --noEmit` | 0 | clean |
| Build | `npm run build` | 0 | ok |
| Vitest | `npx vitest run` | 0 | 114 files, 924 passed, 1 skipped (14.3: 113 / 909) |
| ESLint src | `npx eslint src` | 0 | 0 errors, 1,565 warnings (14.3: 1,556; +9 from new files, pre-existing style) |
| Source checks | `node runbooks/phase14-20261026/phase14_dealer_dashboard_source_checks.mjs` | 0 | 26/26 (one check re-pointed to read the new team panel file; assertion unchanged) |
| Backend Jest (includes 13I–13K suites) | `cd backend && npm run test:jest` | 0 | 160 suites, 2,841 passed (identical to 14.3) |
| Validators | every `validate:*` | 135 pass / 7 fail | the **same 7** as 14.3/14.1 baseline: communications:providers, live-runtime, v14:live-certification-contract, v14:release-candidate, brand-palette-convergence, stage24-theme-convergence, stage5f7-private-auction-contract. None weakened; none caused by 14.4 |
| Browser (MOCKED API) | `runbooks/phase14-4-20261026/dealer_workflows_browser_check.cjs` | 0 | 14 sections + new/edit form × desktop/tablet/390px: no crashes, no horizontal overflow, no serious/critical axe (one transient `axe-error` on desktop pipeline, same page clean at tablet/mobile; not a finding) |
| NOT RUN | `eslint .` (whole repo), backend Vitest, `node:test` | — | not run in this time-boxed phase; carried forward as open (DEF-13) |

## Write-path matrix
| Path | Unit (mocked) | Browser (mocked API, request captured) | Live |
|---|---|---|---|
| Listing create | validation, single submit, 403 retry, refresh | multipart POST confirmed | LIVE-PENDING |
| Listing edit | prefill, partial PUT, 403, foreign id | `PUT /api/cars/c1` partial JSON | LIVE-PENDING |
| Settings save | validate/save/failure | `PUT /dealer-platform/profile/d1` | LIVE-PENDING |
| Team invite / role / suspend / remove | all four, 403, confirm-remove | invite POST | LIVE-PENDING |
| Lead stage / campaign create | existing 14.3 tests | — | LIVE-PENDING |
| Onboarding submit, inventory actions | not re-tested | — | LIVE-PENDING |

## Protected-domain diff vs 14.3
`backend/` — **zero differences**. No payments, M-Pesa, escrow, ledger, bidding, settlement, refunds, payouts, reconciliation or Super Admin auth files changed. Frontend changes confined to: `DealerDashboard.tsx`, new `DealerListingForm/SettingsPanel/TeamPanel.tsx`, `dealerPlatformApi.js` (+`getVerificationStatus`), `vehicleApi.ts` (+`updateCar`, multipart fix), tests, one runbook check, docs.

## Change ledger
1. Add vehicle / Edit listing (URL-backed) in Inventory.
2. `createCar` multipart defect fixed (images were being dropped).
3. Settings: profile edit + read-only verification status; placeholder removed.
4. Team: invite, role, suspend/reactivate, confirmed remove.
5. Tests: +11 dealer write-path, +4 vehicleApi; 2 contract tests updated (not weakened).

## Defects / handoff
* DEF-04 live session: BLOCKED. DEF-05: calendar/permissions are backend gaps (register). DEF-13: `eslint .`, backend Vitest, `node:test` not run. DEF-10/11/12 from 14.3 not re-opened here beyond the tablet pass above.
* Handoff: staging review with designated accounts to run LIVE-PENDING items; authorize backend items G2, G3, G6, G7.
