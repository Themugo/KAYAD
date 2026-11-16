# KAYAD showroom hero, dealer dashboard and stability update — delivery report (16 Nov 2026)

Branch `feature/showroom-hero-dealer-polish` (local only; nothing pushed, merged or deployed). Baseline checkpoint `ee66b8f`.
Base used: R16 tree (GitHub `main` was unreachable from the build environment), with the auction financial-integrity and re-award repairs ported and reconciled.

## What changed
1. **Homepage hero (R-01..R-10).** Real featured inventory always wins; two distinct vehicles pair, one vehicle gets a single composition, none gives a branded empty state; illustrative artwork appears only when there is no real vehicle and is labelled "Artwork · not a listing" with no price. A vehicle is never repeated. Procedural graphite showroom (CSS only), image-error plates, pause/play control, hover/focus/interaction pause, reduced motion, safe CTA wrapping, tablet reflow (1024–1279), admin hero-photo choice (honoured only if still in the listing), shared client/server validation of admin hero config.
2. **Dealer dashboard overview** (routed `DealerDashboard.tsx` is the single source). Real backend figures only (`dealerDashboardSummary.js` adds listing-status breakdown, top performers, recent activity). "—" = unavailable, 0 = real zero, skeletons while loading, clear empty and failure states, clickable pipeline stages, conversion shown only when computable.
3. **Personal-account login bug.** Approved `individual_seller` (and `broker`) accounts were sent to the dealer-only `/dealer` route and bounced to the homepage. `getPostAuthPath` now routes by role.
4. **Inventory slowness.** Root cause found in code: dealer-platform inventory loaded every listing (all columns) and paged in JavaScript; now database paging plus per-status COUNTs. `/api/cars/my-listings` keeps its default behaviour and gains optional `page`/`limit`. A read-only diagnostic script measures the real database. No migration needed: `idx_cars_dealer_id` already exists.
5. **Dock obstruction.** Audited 60 dock-bearing page loads (320–430px, signed out and signed in): last content clears the dock and no fixed element overlaps it.
6. **Regression repairs found along the way.** Leaked `dependabot-auto-merge.yml` removed (policy forbids it); hero controls could overlap the centre card at 1280px, fixed and now checked by the audit; overlays made palette-safe; stale validators and two tests updated to the approved hero policy.

## Verification (all run on the final tree)
| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Frontend vitest | 196 files, 1,624 passed, 1 skipped |
| Backend (jest chunks + vitest + node) | all green: regression 2,843; domain folders all pass; vitest 61; no failures |
| Validators vs baseline | 0 regressions (29 failures pre-exist at baseline: network, credentials, Docker/Supabase) |
| Hero browser audit | 162 loads, 0 issues, 5 behaviour checks pass |
| Dealer state matrix | 6 states x 6 widths, all pass |
| Width sweep | 126 loads, 18 widths (320–1920), 7 surfaces, 0 issues |
| Dock clearance | 60 dock pages, 0 obstructions |
| Page audit | 230 loads, 0 issues |
| Accessibility | axe: 26 screens, 0 violation groups; keyboard: 10 checks, 0 failing |
| Mobile nav certification | 91/91 |

## Screenshots
`docs/audits/screenshots/before-after/` (hero 390/768/1280/1920, dealer dashboard 390/1440). The per-state hero and dealer screenshots are regenerated on demand by `scripts/browser-audit-hero.mjs` and `scripts/browser-audit-dealer-states.mjs` (git-ignored).

## Remaining blockers (cannot be done from this environment)
- Live backend logs, so the **production** cause of the inventory timeout is not proven. Run `node backend/scripts/diagnose-dealer-inventory-latency.mjs` against staging: if the old shape is slow and the paged one fast, the fix addresses it; otherwise check row/JSONB size.
- Real Android device and iOS Safari safe-area checks (checklist below).
- Live Supabase, M-Pesa, Brevo and migration replay (no Postgres here). No migrations were added.
- GitHub `main` was unreachable: reconcile this branch against `main` before merging.
- Browser tests use a stubbed API boundary; sign in once with each account type on staging.

### Android / iOS checklist
Home hero at 360x800 and 412x915 with gesture nav and 3-button nav; dock does not cover the last card or footer links; keyboard open on the search field keeps it visible; landscape; dealer dashboard bottom actions reachable; sign in as personal account lands on My Dashboard and stays.

## Rollback
- Whole update: `git reset --hard ee66b8f` on the branch, or do not merge it. Discard the branch with `git branch -D feature/showroom-hero-dealer-polish`.
- Individual parts: `git revert <commit>` for the hero (6181b93), re-award port (efe5a1e) or later commits (`git log ee66b8f..HEAD`).
- No database change was made, so no data rollback is needed.

## File-change register (excluding screenshots)
| Change | File |
|---|---|
| modified | `backend/controllers/carController.js` |
| modified | `backend/controllers/dealerPlatformController.js` |
| modified | `backend/jest.config.js` |
| modified | `backend/routes/adminRoutes.js` |
| added | `backend/scripts/diagnose-dealer-inventory-latency.mjs` |
| modified | `backend/services/auctionFulfilment.service.js` |
| modified | `backend/services/auctionPlatformPolicy.service.js` |
| modified | `backend/services/auctionRegistration.service.js` |
| modified | `backend/services/auctionSettlement.service.js` |
| added | `backend/services/dealerDashboardSummary.js` |
| added | `backend/services/dealerInventoryQuery.js` |
| added | `backend/tests/auction/financialReawardIntegrity.test.js` |
| modified | `backend/tests/auction/reawardAtomicity.test.js` |
| added | `backend/tests/dealerDashboardSummary.test.js` |
| added | `backend/tests/dealerInventoryQuery.test.js` |
| added | `backend/tests/heroPresentationValidation.test.js` |
| added | `backend/utils/heroPresentation.js` |
| modified | `backend/vitest.config.js` |
| added | `docs/audits/KAYAD_AUCTION_FINANCIAL_REAWARD_REPAIR_20261115.md` |
| added | `scripts/browser-audit-dealer-states.mjs` |
| added | `scripts/browser-audit-dock-clearance.mjs` |
| added | `scripts/browser-audit-hero.mjs` |
| added | `scripts/browser-audit-width-sweep.mjs` |
| modified | `scripts/validate-auction-payment-and-settlement-journey.mjs` |
| modified | `scripts/validate-hero-admin-control.mjs` |
| modified | `scripts/validate-hero-mobile-assets.mjs` |
| modified | `scripts/validate-home-hero-premium.mjs` |
| modified | `scripts/validate-homepage-convergence.mjs` |
| modified | `scripts/validate-kayad-thika-expressway-hero.mjs` |
| modified | `scripts/validate-premium-presentation-pass.mjs` |
| modified | `scripts/validate-stage35-home-hero-pair.mjs` |
| modified | `src/__tests__/components/VehicleMarketplace.test.tsx` |
| added | `src/__tests__/features/heroPresentationParity.test.ts` |
| added | `src/__tests__/features/heroSelection.test.ts` |
| modified | `src/__tests__/utils/authIntent.test.ts` |
| added | `src/features/VehicleMarketplace/components/HeroDesktopVehicle.tsx` |
| modified | `src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx` |
| modified | `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` |
| modified | `src/features/VehicleMarketplace/components/homepage-redesign.css` |
| added | `src/features/VehicleMarketplace/utils/heroPresentationSafety.ts` |
| added | `src/features/VehicleMarketplace/utils/heroSelection.ts` |
| modified | `src/pages/dealer/dashboard/DealerDashboard.tsx` |
| modified | `src/utils/authRoutes.ts` |
| added | `supabase/migrations/20261115120000_auction_financial_reaward_integrity.sql` |


## Structure audit (2026-11-16)
Duplicates, generated files, unused assets and dead files were removed and reports renamed to one convention. Every deletion, move and rename, with the reason, is in `docs/handover/CLEANUP_REGISTER_20261116.csv`.
