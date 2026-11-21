# Test and Validator Results (all run on `main` @ 6eb7c98, Node 22.23.4)

> **Superseded in part (2026-11-21, later):** the post-alignment phase executed journeys, reconciled the baseline failures and found/fixed further defects. Where this document disagrees, `IMPLEMENTATION-AND-VERIFICATION-REPORT-20261121.md`, `FAILURE-REGISTER-20261121.md` and `HOSTED-DATABASE-MIGRATION-RECONCILIATION-20261121.md` are authoritative.

| # | Check | Command | Exit | Pass | Fail | Skip | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Lockfile/engine install | `npm ci` (root, then `backend/`) | 0 / 0 | - | - | - | `engine-strict` honoured |
| 2 | Typecheck | `npx tsc --noEmit` | 0 | - | 0 | - | `evidence/tsc.log` |
| 3 | Production build | `npx vite build` | 0 | - | - | - | chunk-size warnings only |
| 4 | Frontend tests | `npx vitest run` | 1 | 1679 | **69** | 1 | 207 files: 200 pass, **7 fail**; `evidence/frontend-vitest.log` |
| 5 | Backend jest | `node --max-old-space-size=3072 --experimental-vm-modules jest --forceExit --maxWorkers=2` | 1 | 4107 | **5** | 21 | 247 suites: 242 pass, **4 fail**, 1 skipped; 298 s |
| 6 | Backend vitest | `npm run test:vitest` | 1 | 60 | **1** | 0 | 11 files |
| 7 | Backend node:test | `npm run test:node` | 0 | 13 | 0 | 0 | |
| 8 | Validators | each `scripts/validate-*.mjs`, 90 s timeout, 3 parallel | - | **315** | **38** | 0 | 353 scripts, 0 timeouts; `evidence/validators.csv`, `evidence/validator-logs/` |
| 9 | Migrations | 14 newer migrations applied with psql `ON_ERROR_STOP` to disposable PG16 | all 0 | 14 | 0 | - | `evidence/migrations.txt` |
| 10 | Browser journeys | Playwright 390px mobile | - | see REGISTRATION doc | | | registration only |
| 11 | API security 21/21 (previous claim) | **not re-run**; the script targeted the checkpoint's idempotency design | - | - | - | - | NOT TESTED on `main` |

Environment note: `npm run test:jest` (6 GB heap, many workers) was **OOM-killed (exit 137) twice** on this 8 GB sandbox (once while other suites ran). The 2-worker/3 GB rerun above is the valid result. This is an environment limit, not a pass.

## Frontend failures (69, 7 files) - classified
| File | Fail | Cause | Class |
|---|---|---|---|
| `DashboardHubPersonalOverview.test.jsx` | 16 | `PersonalSignOutButton` calls `useNavigate()`; tests render without a Router. `main.tsx` wraps the app in `BrowserRouter` | test harness defect (not prod) |
| `DashboardHubUnifiedAccount.test.jsx` | 16 | same family | same |
| `Phase13iPersonalAccountStates.test.jsx` | 15 | same | same |
| `DashboardHubStaff.test.jsx` / `DashboardHubDealershipEntry.test.jsx` | 2 + 2 | same | same |
| `PageJourneyNavigationPersonal.test.tsx` | 2 | breadcrumb text expectation | unreconciled |
| `VehicleMarketplace.test.tsx` | 16 | labels removed/renamed by the approved homepage ("Hero year filter", "Marketplace at a glance", category buttons now "SUV category") | stale tests vs approved design |
The Router cause was confirmed by isolating one test in `DashboardHubPersonalOverview` and seeing the same `useNavigate()` error family in `Phase13iPersonalAccountStates`; the other files were not each isolated.

## Backend failures
| Test | Cause | Class |
|---|---|---|
| `auctionEngagement` (2 tests), `dealerCompanyNameRule` (1), backend vitest `healthRouteComposition` (1) | assert "KAYAD"/"Kayad API"; code now says "KAYARD KE" | stale brand strings |
| `personalListingPhotoRemoval` (2) | needs `CLOUDINARY_*` env; **passes 11/11 with placeholders** | non-hermetic test |
| `tests/node/personalListingEligibilityProjection.test.js` | `node:test` file collected by jest ("Cannot find module 'test'"); it passes 12/12 under node | jest config should ignore `tests/node` |

## Validator failures (38) - classified from the failing assertion vs current source
- **Stale validator, behaviour present (verified in source):** admin-settings-logo-flow (upload moved to `LogoUploader`, field `logo` matches backend `single("logo")`), dealer-operations-initiative (scope still `dealer: dealerId`, plus soft-delete filter), dealer-subscription-initiative (RPC call moved to `dealerApproval.service.js`), phase36-showroom-search (invalidation centralised in `publicListingCache.js`, includes facets+suggestions), admin-inspector-applications (error state + `statusCounts` present under different names), final-system-surface-guard (auth gating intact; `protectedNavs` renamed entries), production-host-contract (vercel.json SPA rewrite gained `uploads/`), admin-broadcast-end-to-end (individual_seller now in the personal audience), platform-integration-ux (expects a "seller" role card the unified-account decision removed), public-homepage-premium-refinement-20261029 (class/label renames; hero data source present).
- **Missing referenced artifact:** write-route-coverage (`API_VALIDATION_GAP_REGISTER_20261109.csv` absent - genuine gap), business-ownership-and-mobile-nav, phase8-operations, recovery-repair (`DealersView.tsx`), stage5f8-contract, super-admin-phase7-cards, ai-decision-support-domain.
- **Credentials/infra:** live-runtime, communications-provider-certification, communications-cleanup-provider-certification (missing needles), local-supabase (Supabase CLI start failed).
- **Not individually traced (still failing, NOT dismissed):** admin-moderation-page, phase03-staff-governance, mobile-menu-stage34, kenya-only-showroom-refinement, super-admin-phase2-hero/-completion/-phase8-team-calendar, stage24/27/30, stage6-mobile-discovery, stage5f8, phase39, frontend-polish-pass, homepage-compact-polish-20261114, homepage-design-direction-320-430, release (fails because it includes recovery-repair).
Reconciliation against the earlier reported "141/143 passed": that figure was from the checkpoint tree (143 validators) and is not comparable to `main` (353 validators, 315 pass). The two credential-dependent failures then correspond to live-runtime and communications-provider certification now.
