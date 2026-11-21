# Architecture and Duplication Audit

Scale on `main`: 117 backend route files, 80 controllers, 150 services, 202 migrations, 3,321 tracked files, 116 `app.use("/api...")` mounts in `backend/server.js`. Evidence is from import/route tracing; no code was deleted.

## Domain map (canonical entry points)
| Domain | Frontend entry | Backend | DB / RPC | Tests/validators |
|---|---|---|---|---|
| Registration/auth | `/register` -> `components/OnboardingFlow.tsx`; `/login` -> `pages/LoginPage.jsx`; `AuthModal.tsx` (shim) | `routes/authRoutes.js`, `controllers/authController.js` | `kayad_register_identity_atomic` | `tests/registrationFlow.e2e.test.js`, `validate-registration-*` |
| Unified personal account | `components/DashboardHub.tsx` | `routes/accountCapabilitiesRoutes.js`, `services/accountCapabilities.service.js` | users, onboarding policy | `DashboardHub*` tests (51 failing, harness defect) |
| Dealer registration/verification | `/dealer/onboarding` | `dealerApproval.service.js`, `dealerOnboardingReadiness.service.js` | `kayad_apply_dealer_verification_atomic` | `dealerApplicationRoutes.test.js` |
| Dealer workspace/subscription | `pages/dealer/dashboard/DealerDashboard.tsx`, `components/layout/DealerLayout.tsx` | `dealerPlatformController.js`, subscription services | dealer tables | `validate-dealer-workspace-navigation` passes in this run's sweep |
| Listings/lifecycle | `features/VehicleMarketplace`, seller studio | `carController.js`, `personalListingMutationGuard.service.js` | `kayad_personal_listing_lifecycle_atomic` (absent on hosted) | `personalListing*` tests |
| Search/discovery | `VehicleMarketplace.tsx` | cars routes, facet caches (`utils/publicListingCache.js`) | search tables | marketplace validators |
| Offers/negotiation | chat/lead UI | `routes/leadRoutes.js` -> `offerNegotiationController.js` -> `services/offerNegotiation.service.js` | `marketplace_offers` (absent on hosted) | 1 jest test reference; `validate-canonical-offer-negotiation` |
| Transactions/escrow/payment | payments pages | `transactionRoutes.js`, escrow/payment services | escrow tables | 14 escrow + 12 payment test files |
| Inspection | inspections nav | 2 route files, inspection services | inspection tables | 5 test files; `validate-inspection-marketplace` |
| Settlement | auctions | `auctionSettlementRoutes.js`, `auctionSettlement.service.js` | auction RPCs | settlement referenced in 6 test files |
| Admin/staff/audit | `pages/admin/*` | `adminRoutes.js` etc. | audit tables | many validators (several failing; see TEST-AND-VALIDATOR-RESULTS.md) |

## Confirmed duplication / legacy (nothing removed)
| # | Competing implementations | Authoritative | Still used? | Removal risk | Safe consolidation |
|---|---|---|---|---|---|
| D1 | `pages/dealer/DealerDashboard.jsx` vs `pages/dealer/dashboard/DealerDashboard.tsx` | the `.tsx` (App.tsx lazy import) | `.jsx` imported only by `src/__tests__/pages/dealer/DealerDashboard.test.jsx` | low in prod, but a test would break | migrate/replace the test, then remove `.jsx` |
| D2 | `src/pages/Dashboard.tsx` | `components/DashboardHub.tsx` | **no importers found** | low | confirm no dynamic import, then remove |
| D3 | `components/dashboard/DashboardPage.tsx` exported via `features/dashboard/index.ts` | `DashboardHub` | importers of `features/dashboard` not traced | unknown | trace, then decide |
| D4 | `components/dealer/DealerLayout.tsx` vs `components/layout/DealerLayout.tsx` | layout/ | re-export only | none | already consolidated; keep shim |
| D5 | `components/auth/AuthModal.tsx` vs `components/AuthModal.tsx` | `components/AuthModal.tsx` | re-export shim | none | already consolidated |
| D6 | multiple `app.use` mounts per prefix (`/api/cars` x2, `/api/dealer` x2, `/api/auctions` x5, `/api/analytics` x2) | n/a | intentional router splitting | route shadowing risk not audited | audit for overlapping paths |
| D7 | three migrations defining `kayad_register_identity_atomic` | latest (20261110140000) | yes | low | add a header comment |
| D8 | registration surface: no second form, no second endpoint found | - | - | - | none needed |
| D9 | `individual_seller` still present in DB constraint, RPC, admin filters (`adminRoutes.js` L295/362/367/398), broadcast role groups | unified `user` for new accounts | yes (legacy rows) | high if removed | keep until legacy rows are migrated by an approved plan |

No conflicting business-rule duplicates were found beyond D9 (a deliberate compatibility layer). Absence of other duplicates is "not found by tracing", not proof.
