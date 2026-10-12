# KAYAD Dealer Platform — Route & Component Ownership Map (Phase 0)

**Mission:** Master Dealer Platform Convergence, Registration, Onboarding, Security & Production Certification
**Foundation:** Stage 36 working copy, `/home/claude/stage36/kayad-stage36` (zip SHA-256 `9769dc970f3bfe5b1c62cb510787f5830330a5095be59c61c28599cc21d00a55`)
**Method:** Every classification below is derived from direct `grep`/import-graph evidence against `src/App.tsx` (the live route table) and cross-file import search — never from file naming or "looks unused." Evidence commands and raw output are preserved in the working session; the conclusions are restated here.

## 1. Live route table (ground truth)

`src/App.tsx` is the single route-resolution authority for this app (no separate `routes.ts`/router config exists). The following `path === ...` / `path.startsWith(...)` checks are the ONLY dealer-area routes actually reachable by a browser:

| Path | Component rendered | Guard |
|---|---|---|
| `/dealer` | `<Navigate to="/?nav=dealer-dashboard" />` → `DealerDashboard` (nav-driven, not path-driven) | `RequireAuth` + `RequireDealer` |
| `/dealer/onboarding` | `DealerOnboarding` | `RequireAuth` + `RequireDealer` |
| `/dealer/auction-setup` | `DealerAuctionSetupWizard` | `RequireAuth` + `RequireDealer` |
| `/dealer/auction-operations` | `DealerAuctionOperations` | `RequireAuth` + `RequireDealer` |
| `/dealer/auction-operations/:id` | `DealerAuctionOperationCase` | `RequireAuth` + `RequireDealer` |
| nav=`dealer-dashboard` (query-param driven, not a path route) | `DealerDashboard` (lazy: `./pages/dealer/dashboard/DealerDashboard`) | `RequireAuth` + `RequireDealer` + inline `!isDealer && !isAdmin` redirect |

No other `/dealer/*` path is registered anywhere in the codebase.

## 2. CANONICAL (confirmed live, reachable, imported from `App.tsx`)

| Component | File | Evidence |
|---|---|---|
| **Dealer dashboard (main)** | `src/pages/dealer/dashboard/DealerDashboard.tsx` | `React.lazy(() => import('./pages/dealer/dashboard/DealerDashboard'))` at `App.tsx:64`; rendered at `App.tsx:717,748` when `activeNav === 'dealer-dashboard'` |
| Dealer onboarding | `src/pages/dealer/DealerOnboarding.jsx` | Direct import + render at route `/dealer/onboarding` |
| Dealer auction setup wizard | `src/pages/dealer/DealerAuctionSetupWizard.jsx` | Direct import + render at `/dealer/auction-setup` |
| Dealer auction operations (list) | `src/pages/dealer/DealerAuctionOperations.jsx` | Direct import + render at `/dealer/auction-operations` |
| Dealer auction operations (case detail) | `src/pages/dealer/DealerAuctionOperationCase.jsx` | Direct import + render at `/dealer/auction-operations/:id`; also referenced by `src/utils/navigation.ts` (nav-id builder) |

`DealerDashboard.tsx` (925 lines) is self-contained: it does **not** import any file from `src/pages/dealer/components/`, `src/components/dealer/`, or `src/components/features/dealer/`. All of its sub-views (Overview, Inventory, Leads, Escrow, Auctions, Finance, Team, etc. — Phase 1 scope) are implemented inline in this one file, consuming `src/services/dealerPlatformApi.js` directly. This is an important Phase 1 precondition: the wiring audit must trace *this* file's inline sections, not the parallel component trees below.

## 3. CONFIRMED DEAD — orphaned "legacy dealer dashboard" subtree

A second, older, complete dealer-dashboard implementation exists in parallel and is **not reachable from any route, nav state, or test runner's production path**. It is reachable only from its own unit test.

| File | Importers found (excluding itself) | Classification |
|---|---|---|
| `src/pages/dealer/DealerDashboard.jsx` (430 lines) | `src/__tests__/pages/dealer/DealerDashboard.test.jsx` only | **TEST-ONLY** (exercised by a unit test, zero production entry point) |
| `src/components/features/dealer/DealerHub.tsx` | `DealerDashboard.jsx` (above, dead) and `src/pages/dealer/components/DealerOverview.jsx` (itself orphaned — see §4) | **DEAD** (every consumer is itself dead) |
| `src/components/features/dealer/index.ts` (barrel) | same as above | **DEAD** |
| `src/components/dealer/DealerHub.jsx` | **zero** importers anywhere (not even a test) | **DEAD** |
| `src/components/dealer/index.js` (barrel) | zero importers | **DEAD** |

**Finding:** `DealerHub.tsx` vs `DealerHub.jsx` is not an active duplicate-ownership conflict for Phase 1 purposes — neither copy is on any live code path. `DealerHub.jsx` (the `components/dealer/` copy) is the more completely dead of the two: it has no consumer of any kind, including tests.

## 4. CONFIRMED DEAD — orphaned "DealerSidebar / DealerLayout" shell and its linked pages

`src/components/layout/DealerSidebar.tsx` defines sidebar links to `/dealer/add-car`, `/dealer/auction-setup`, `/dealer/analytics`, `/dealer/settlement`, `/dealer/team`, `/dealer/activity-log`, `/dealer/settings`, `/dealer/onboarding`. Cross-checked against §1's live route table: **none of `/dealer/add-car`, `/dealer/analytics`, `/dealer/settlement`, `/dealer/team`, `/dealer/activity-log`, `/dealer/settings` are registered routes.** This is not a live broken-navigation defect, because the sidebar that produces these links is itself unreachable:

| File | Importers found | Classification |
|---|---|---|
| `src/components/layout/DealerSidebar.tsx` | `src/components/layout/DealerLayout.tsx`, `src/components/dealer/DealerLayout.tsx` | DEAD (both consumers dead) |
| `src/components/layout/DealerLayout.tsx` | zero importers | **DEAD** |
| `src/components/dealer/DealerLayout.tsx` | zero importers | **DEAD** |
| `src/components/AppLayout.tsx` | zero importers (self-reference only) — consistent with the Stage 36 finding that this file is dead | **DEAD** (reconfirmed) |

The pages those dead sidebar links point at are themselves orphaned, with **no importer of any kind, including tests**:

| File | Classification |
|---|---|
| `src/pages/dealer/AddCarPage.jsx` | **DEAD** |
| `src/pages/dealer/EditCarPage.jsx` | **DEAD** |
| `src/pages/dealer/DealerAnalytics.jsx` | **DEAD** |
| `src/pages/dealer/DealerSettlement.jsx` | **DEAD** |
| `src/pages/dealer/DealerTeam.jsx` | **DEAD** |
| `src/pages/dealer/DealerAuditLog.jsx` | **DEAD** |
| `src/pages/dealer/DealerSettings.jsx` | **DEAD** |

One further file in this family is tested but not live:

| File | Importers | Classification |
|---|---|---|
| `src/pages/dealer/DealerAuctionSetup.jsx` (distinct from the live `DealerAuctionSetupWizard.jsx`) | `src/__tests__/pages/DealerAuctionSetup.test.jsx` only | **TEST-ONLY** |

## 5. CONFIRMED DEAD — orphaned "pages/dealer/pages/" and "pages/dealer/components/" sub-clusters

A third partial dashboard cluster exists under `src/pages/dealer/pages/` (`DealerFinancePage.jsx`, `DealerInventoryPage.jsx`, `DealerLeadsPage.jsx`), consuming a large set of Tab/Widget components under `src/pages/dealer/components/`. Neither the `pages/pages/` files nor most of the `pages/components/` files are imported by `App.tsx`, by the canonical `dashboard/DealerDashboard.tsx`, or by any other live file — they import each other in a closed, self-referential loop with no live entry point:

| File | External importers (outside this cluster) | Classification |
|---|---|---|
| `src/pages/dealer/pages/DealerFinancePage.jsx` | none found | DEAD (pending final confirmation — see §7 open item) |
| `src/pages/dealer/pages/DealerInventoryPage.jsx` | none found | DEAD (pending final confirmation) |
| `src/pages/dealer/pages/DealerLeadsPage.jsx` | none found | DEAD (pending final confirmation) |
| `src/pages/dealer/components/AddCarStepBasic/Indicator/Photos/Pricing/Specs.jsx`, `AddCarSuccess.jsx` | 0 | **DEAD** (confirmed — `AddCarPage.jsx` itself is dead and doesn't even consume these) |
| `src/pages/dealer/components/DealerBidsTab.jsx`, `DealerEscrowsTab.jsx`, `DealerMilestoneTracker.jsx`, `DealerOverview.jsx`, `DealerPackageTab.jsx`, `DealerVerificationProgress.jsx`, `EditCarAuctionTab.jsx`, `EditCarDetailsTab.jsx`, `EditCarPhotosTab.jsx`, `EditCarPromoteTab.jsx`, `TeamTab.jsx` | 0 external | **DEAD** |
| `src/pages/dealer/components/DashboardWidgets.jsx`, `DealerLeadsTab.jsx`, `DealerListingsTab.jsx`, `DealerEarningsTab.jsx`, `ConversionFunnelDashboard.jsx`, `DealerAuctionCarIdentity/DraftCard/EndedCard/Field/LiveCard/StatusPill.jsx`, `DealerKPIWidgets.jsx` | only each other / the dead `pages/pages/*Page.jsx` files, or the dead `DealerDashboard.jsx` | **DEAD** |

## 6. Backend dealer route mount classification (confirmed)

`backend/server.js` mounts three distinct dealer route files at three distinct, non-colliding base paths:

| Mount | File | Role |
|---|---|---|
| `app.use("/api/dealer", dealerRoutes)` (server.js:820) | `backend/routes/dealerRoutes.js` | Onboarding (`GET/PUT /onboarding`), **legacy** cars/earnings/analytics/settlement/team/bids/auction-lifecycle/payouts/wholesale/trade-listing endpoints |
| `app.use("/api/dealer", auctionSetupRoutes)` (server.js:821) | separate router, also under `/api/dealer` | Auction-setup-specific (not yet individually classified — queued) |
| `app.use("/api/dealer-health-score", dealerHealthScoreRoutes)` (server.js:868) | `backend/routes/dealerHealthScoreRoutes.js` | Trust/health scoring + ranking (public reads) + `admin-only` recalculate/override/distribution/alerts |
| `app.use("/api/dealer-platform", dealerPlatformRoutes)` (server.js:912) | `backend/routes/dealerPlatformRoutes.js` | **CANONICAL, live** dashboard operations: `/dashboard`, `/inventory`, `/leads`, `/pipeline`, `/marketing`, `/analytics`, `/team`, `/subscription`, `/customers`, `/auctions`, `/finance`, `/inspections`, `/reputation` — this is what `src/services/dealerPlatformApi.js` calls, i.e. the backend for the live `DealerDashboard.tsx` |

**This is not a simple two-namespace split — it is a confirmed duplicate-owner conflict for team management and dealer analytics/settlement, with a security-relevant asymmetry:**

`backend/routes/dealerRoutes.js` independently implements its own `/team` subtree (`POST /team/invite`, `PATCH /team/:memberId`, `DELETE /team/:memberId`) alongside `/analytics`, `/settlement` (GET+PUT), `/earnings`, `/cars/*` (duplicate/bulk-delete/mark-sold/bulk-status/accept-bid/reject-bid/auction start-end-extend/wholesale/trade-listings/pricing-recommendations). `src/api/api.exports.ts`'s `dealerAPI` object (`analytics`, `getSettlement`, `updateSettlement`, etc.) calls this namespace, **not** `dealerPlatformApi.js`. Cross-referencing §4–5 of this document: `dealerAPI` is imported only by the confirmed-**DEAD** frontend subtree (`DealerAnalytics.jsx`, `DealerSettlement.jsx`, `DealerTeam.jsx`, the legacy `DealerDashboard.jsx`/`DealerHub`) — so `dealerRoutes.js`'s team/analytics/settlement endpoints are the backend half of that same dead-frontend subtree: **ACTIVE-SECONDARY at the backend layer** (the code is live and mounted — it is NOT dead code on the server — even though nothing in the live UI currently calls it).

**CORRECTION (made during Phase 2, superseding the paragraph below as originally written):** a closer read of `dealerRoutes.js` lines 95-110 shows `router.use(protect, dealerOnly, requireApproved)` at line 102 — applied by Express to every route registered later in the file, which includes all three `/team/*` handlers (lines 663/724/747). They are **not** unauthenticated; they are in fact gated more strictly (role + approval status) than the canonical `dealerPlatformRoutes.js` equivalents. See `KAYAD_DEALER_GAP_AND_RISK_REGISTER.md` entries R1 (retraction) and R1-NEW (the corrected, differently-scoped finding this review turned up instead) for the full account. The paragraph immediately below is preserved, struck through in spirit, to keep an honest record of the original (wrong) claim rather than silently deleting it:

~~**HIGH-SEVERITY FINDING:** `POST /api/dealer/team/invite`, `PATCH /api/dealer/team/:memberId`, and `DELETE /api/dealer/team/:memberId` in `dealerRoutes.js` carry no `protect` middleware and no role/permission check of any kind — only `invalidateCache("dealer")`. The handlers read `req.user.id` directly, so every request with no valid session would throw and 500 rather than cleanly 401/403.~~ — **this was based on reading only the individual route declarations and missed the router-level middleware two lines above; it does not hold.**

Backend modules inventoried, not yet individually classified at the authorization-boundary level (deferred to Phase 5):

```
backend/controllers/dealerHealthScoreController.js   backend/models/DealerSubscription.js
backend/controllers/dealerPlatformController.js      backend/models/DealerTeam.js
backend/middleware/dealerOrgAccess.js                backend/models/DealerTrustScore.js
backend/middleware/dealerVerification.js              backend/models/DealerVerification.js
backend/models/Dealer.js                              backend/services/dealerHealthScoreScheduler.js
backend/models/DealerAnalytics.js                     backend/services/dealerHealthScoreService.js
backend/models/DealerHealthScore.js                   backend/services/dealerSubscription.service.js
backend/models/DealerProfile.js                        backend/services/dealerSubscriptionExpiryCron.js
                                                        backend/services/dealerVerificationService.js
backend/validation/dealer.schema.js
backend/validation/dealerOnboarding.schema.js
backend/tests/inspection/dealerInspectionPrivacy.test.js
```

## 7. Phase 0 status: CLOSED (with carry-forward items)

Resolved in this phase:
1. ✅ Backend mount points confirmed (§6): `dealerRoutes.js` (`/api/dealer`, legacy/active-secondary), `auctionSetupRoutes.js` (`/api/dealer`, live — backs `DealerAuctionSetupWizard`), `dealerHealthScoreRoutes.js` (`/api/dealer-health-score`, live, separate scoring feature), `dealerPlatformRoutes.js` (`/api/dealer-platform`, canonical/live).
3. ✅ `src/components/OnboardingFlow.tsx` confirmed live — imported directly by `App.tsx`.

Carried forward into Phase 1/5 (not blocking Phase 0 closure):
2. `pages/dealer/pages/DealerFinancePage.jsx` / `DealerInventoryPage.jsx` / `DealerLeadsPage.jsx` — confirmed zero importers via direct-import search in §5; re-verify for dynamic-import patterns during Phase 1's section-by-section wiring pass rather than as a separate step.
4. Authorization-boundary classification of the backend modules listed at the end of §6, and the newly-discovered `dealerRoutes.js` missing-`protect` defect, is Phase 5's "Dealer Organization & Team Authorization" / RLS investigation scope — tracked there, not fixed here.

## 9. CLASSIFICATION SUMMARY TABLE (Phase 0 deliverable)

| Component/Route | Classification |
|---|---|
| `src/pages/dealer/dashboard/DealerDashboard.tsx` | CANONICAL |
| `src/pages/dealer/DealerOnboarding.jsx` | CANONICAL |
| `src/pages/dealer/DealerAuctionSetupWizard.jsx` | CANONICAL |
| `src/pages/dealer/DealerAuctionOperations.jsx` | CANONICAL |
| `src/pages/dealer/DealerAuctionOperationCase.jsx` | CANONICAL |
| `src/components/OnboardingFlow.tsx` | CANONICAL |
| `backend/routes/dealerPlatformRoutes.js` | CANONICAL |
| `backend/routes/auctionSetupRoutes.js` | CANONICAL |
| `backend/routes/dealerHealthScoreRoutes.js` | CANONICAL (separate feature) |
| `backend/routes/dealerRoutes.js` | ACTIVE-SECONDARY (live-mounted, backs dead frontend, carries its own missing-auth defect) |
| `src/pages/dealer/DealerDashboard.jsx` | TEST-ONLY |
| `src/pages/dealer/DealerAuctionSetup.jsx` | TEST-ONLY |
| `src/components/features/dealer/DealerHub.tsx` + barrel | DEAD |
| `src/components/dealer/DealerHub.jsx` + barrel | DEAD |
| `src/components/layout/DealerSidebar.tsx` | DEAD |
| `src/components/layout/DealerLayout.tsx` | DEAD |
| `src/components/dealer/DealerLayout.tsx` | DEAD |
| `src/components/AppLayout.tsx` | DEAD (reconfirmed from Stage 36) |
| `src/pages/dealer/AddCarPage.jsx` | DEAD |
| `src/pages/dealer/EditCarPage.jsx` | DEAD |
| `src/pages/dealer/DealerAnalytics.jsx` | DEAD |
| `src/pages/dealer/DealerSettlement.jsx` | DEAD |
| `src/pages/dealer/DealerTeam.jsx` | DEAD |
| `src/pages/dealer/DealerAuditLog.jsx` | DEAD |
| `src/pages/dealer/DealerSettings.jsx` | DEAD |
| `src/pages/dealer/pages/*.jsx` (3 files) | DEAD |
| `src/pages/dealer/components/*` (20 of 27 files) | DEAD — see §5 for the 7 still consumed by the dead cluster |

## 8. Headline implication for the rest of this mission

**Roughly half of the `src/pages/dealer/*` tree, all of `src/components/dealer/*`, all of `src/components/features/dealer/*`, and both `DealerLayout`/`DealerSidebar` implementations are dead code** — a second complete (but unreachable) dealer-dashboard architecture plus a third partial one, coexisting with the one real, live dashboard (`src/pages/dealer/dashboard/DealerDashboard.tsx`). This mirrors the Stage 36 finding (triple footer implementation, two dead). Per the brief's Non-Negotiable Foundation Rules (never create a second dealer portal, never introduce a second implementation, never delete/rename something before confirming it's genuinely unreferenced), **no deletion or modification of any file listed above as DEAD/TEST-ONLY is being performed in this phase** — this document only records ownership for the audit. Any cleanup of this dead code is a separate, explicitly-scoped decision for the user, not an automatic action of this mission.
