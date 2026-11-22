# Implementation change register (this phase)

| Area | Change | Files |
|---|---|---|
| Lifecycle | Single-listing Pause / Publish (Republish) through the existing atomic SQL function; completeness check (`missingForPublication`) → 422 `LISTING_INCOMPLETE`; 404 / 409 mapped | `services/dealerListingSale.service.js`, `routes/dealerRoutes.js`, `openapi.yaml` |
| Lifecycle | Bulk publish / hide reuse the same service (no duplicate lifecycle code) | `dealerListingSale.service.js` |
| Defect fix | Public marketplace cache was not refreshed after dealer pause / publish / sold / bulk; now `invalidatePublicListingCaches()` | `dealerRoutes.js`, `dealerPlatformController.js` |
| Defect fix | Lead note write used a non-existent `actorId` column (500) | `services/leadService.js` |
| UI | Pause / Publish / Republish controls, one status vocabulary (Active, Paused, Under review, Draft, Reserved, Sold), Paused tile and filter, inline errors | `DealerDashboard.tsx`, `services/vehicleApi.ts` |
| Navigation | Groups: Overview / Operations / Business management; Help & support in footer; Sign out always reachable | `DealerDashboard.tsx` |
| Defect fix | Sidebar height measured a detached node (Sign out below fold) | `DealerDashboard.tsx` |
| Accessibility | Three controls raised above 24 px | `DealerDashboard.tsx` |
| Legacy | Four unreferenced dealer components removed with evidence | see LEGACY-DUPLICATION-REGISTER.md |
| Tests | Frontend, node:test, DB journeys 11 and 12 (30 named journeys), fixture updates | see TEST-RESULTS.md |

Earlier DA-01..07 changes (also uncommitted in this tree) are described in `../DEALER-IMPLEMENTATION-20261121/`.
