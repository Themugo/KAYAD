# KAYAD Automotive Services — Business Model to User Experience Convergence (2026-10-09)

Builds on `AUTOMOTIVE_SERVICES_PRODUCT_DISCOVERY.md` and `AUTOMOTIVE_SERVICES_MARKETPLACE_CONVERGENCE_REPORT.md` (backend/provider model, unchanged here). `INSPECTION_PROVIDER_BUSINESS_MODEL_CORRECTION.md` does not exist in this repository; the model correction is recorded in the convergence report §1–3 and the addenda to the two inspection documents. Evidence: `evidence/automotive-services/` and `evidence/ux-convergence/`.

## 1. Verified business model and actual capabilities
KAYAD is the platform; independent providers perform services. Classification against the current source (not against earlier claims):

| Capability | Status | Evidence |
|---|---|---|
| Provider identity, registration, lifecycle, admin approve/suspend | Implemented and connected | `inspection_providers`, registration RPC, `/api/admin/inspection-governance/*`, DB proof, 66 backend tests |
| Staff affiliation (two-sided), revocation | Implemented and connected | `inspection_staff.affiliation_status`, `assertStaffAssignable` |
| Capabilities (declared / verified / revoked), high-risk verified-only | Implemented and connected | `provider_service_capabilities`, taxonomy, discovery service |
| Pre-purchase inspection, matched path (System A) | Implemented and connected; takes **no payment** | `/api/inspections/*`; `assign()` now enforces eligible provider |
| Pre-purchase inspection, self-chosen booking + M-Pesa (System B) | Implemented and connected | `/api/inspection/*`, booking/payment RPC |
| Report access (owner only) | Implemented and connected | report endpoints, `InspectionReportModal` |
| Vehicle make compatibility | Partially implemented | canonical makes + provider-declared makes/powertrains; no model/year catalog |
| Location | Partially implemented | provider coordinates, county/town, radius, straight-line distance; no geocoder/travel time |
| Repair, diagnostic, roadside **requests**, quotes, scheduling, dispatch, tracking | **Not implemented** | the Phase-22 RPCs are absent from migrations; no provider-side workflow |
| Provider fees/commission/escrow | Partially implemented, undecided | `commission_rate`, `settlementService` exist for System B; no decision to charge |
| Complaints, disputes, refunds for services | Not implemented for non-inspection services; refunds of paid provider cancellations not executed | generic Support cases only |
| Live Supabase / real M-Pesa / real uploads | Environment-blocked | no credentials in this environment |

Payment finding re-verified: System A's old M-Pesa charge remains unsettleable (callback requires `metadata.bookingId`; RPC handles only `inspection_bookings`). It stays removed; nothing reintroduced.

## 2. Frontend-to-backend architecture
Nav (`navConfig.ts`, ids unchanged) → `App.tsx` `handleNavClick` (`services:*`) → `InspectionsView` (hub; matched requests via `/api/inspections/order|my`, bookings via `/api/inspection/...`) and `InspectionMarketplacePage` (finder → `GET /api/inspection/providers`, taxonomy, makes) → `ProviderProfilePage`/`BookingFlow` (System B). Vehicle detail (`VehicleDetailModal` → `onRequestInspection` → `launchInspections`) preselects the vehicle. Provider/admin: `ProviderApplicationModal`, `ProviderServicesModal`, `AdminProviderGovernance` → `/api/inspection/*`, `/api/admin/inspection-governance/*`. No new engine, registry, catalog or booking path.

## 3. Roles and journeys
- **Visitor/owner:** nav "Auto Services" → hub → finder (category, symptom helper, make, location on consent) → profile. Roadside = discovery only.
- **Customer:** matched request (vehicle preselected) or self-booking; "My inspections" shows who carries it out; reports owner-only.
- **Dealer/seller:** dealer dashboard lists inspections of *their* vehicles. Vehicle-detail "Request an inspection" is the existing entry. Sellers get no provider/admin rights and no customer data.
- **Provider:** apply (taxonomy services), evidence, staff invitations/acceptance, "My business and affiliations". No provider job-handling dashboard beyond the existing inspector assignment flow (not built; `ProviderBusinessCenter.tsx` is dormant).
- **Admin:** existing "Providers" module: review, approve (notes required), reject/suspend (reason), alternative-route evidence rule.

## 4. Key discrepancies found (previous implementation vs intended product)
1. Hub said "KAYAD vehicle inspection / Request a KAYAD inspection", implying KAYAD performs it.
2. Nav said "Pre-Purchase Inspection" only; no path to garages/mechanics/roadside although the finder supports them.
3. **Vehicle detail showed a hard-coded "150-Point Technical Inspection Certificate — PASSED & CERTIFIED (100% compression pass, accident-free structure, zero bank encumbrances)" on every vehicle** — an invented report.
4. Dealer profile promised "dispatch certified mechanic before releasing funds", "150-Point Audit Ready", and showed two invented "verified purchase" reviews when a dealer had none.
5. **Dealer inspections API returned the buyer's request notes (phone, location, fee) and `report` to the seller** — a privacy leak.
6. A fixed "150-point" standard and "Inspection Guaranteed" appeared on home, hero, compare, sell and messaging surfaces, contradicting the FAQ position that depth is provider-specific.

## 5. Product and design decisions (made independently)
- **One hub, two lanes, not one overloaded flow.** `nav=inspections` becomes the automotive-services hub: *Inspect a car before you buy* (Get matched / Choose yourself) and *Repairs, diagnostics and roadside help* (finder; stated limits). Reason: the backend really has two inspection paths and a general finder, but only inspection is transactional.
- **"Get matched" replaces "KAYAD inspection".** Reason: A is a platform matching step (admin assigns a verified provider); the performer is the provider, whose business name now appears on the record. Unassigned requests say "KAYAD is matching a provider".
- **Nav renamed "Auto Services"** (id `inspection`, routes unchanged) with four real destinations: inspect, find, roadside, my requests (signed-in only). Roadside is a finder category, described as "KAYAD does not dispatch help".
- **"What verified means here"** panel: identity reviewed, services checked separately (declared vs verified), people linked only when both sides confirmed, no quality guarantee.
- **Vehicle detail:** invented certificate replaced by a truthful panel (flag-aware; always advises own inspection) with the existing request action.
- **Seller view minimised** (see §8). No new seller capability was invented.
- Retired: nothing deleted. Dormant, unmounted and left alone: `VehicleDetailPage.tsx`, `ProviderBusinessCenter.tsx`, `AdminInspectorApplications.jsx`.

## 6. Customer-facing changes and their backend paths
Hub copy/lanes (no new calls); hub→finder deep links carry canonical categories (`pre_purchase_inspection`, `roadside_recovery`) into the existing `GET /api/inspection/providers`; "Get matched" → existing `POST /api/inspections/order`; vehicle detail → existing launch with vehicle preselected; record captions use `businessName` from existing order payload.

## 7. Provider verification, expertise, compatibility, location
Unchanged from the convergence report; surfaced to customers via the hub trust panel and finder badges (verified vs declared). Hybrid/EV shown only when verified; make/powertrain from provider-declared data; location only on user action, rounded, with county/town fallback; no distances/ETAs/ratings invented.

## 8. Dealer/seller and administrator findings
- Seller: `GET /api/dealer/inspections` now returns only id, vehicle, status, dates (no `notes`, `report`). Whether sellers should see reports is an **open business decision**; default is privacy. Dashboard now says so.
- Seller cannot request provider operations; they use the same vehicle entry as buyers.
- Admin: governance module exists and is behind the admin guard. Legacy individual-inspector approval remains an admin-only, audited bypass of the two-route evidence rules (carried over).
- Admin navigation registry (`backend/utils/navigationConfig.js`) gained the two new child ids so admins can hide/reorder them; the 14A validator enforces frontend/backend parity.

## 9. Files changed, added, removed
Removed: none. Added: `servicesHub.test.tsx`, `dealerProfileTruth.test.tsx`, `backend/tests/inspection/dealerInspectionPrivacy.test.js`, `evidence/ux-convergence/*`, this report. Modified: `InspectionsView.tsx`, `RequestInspectionModal.tsx`, `navConfig.ts`, `MobileBottomNav.tsx`, `App.tsx`, `VehicleDetailModal.tsx`, `DealerProfileModal.tsx`, `DealerDashboard.tsx`, `Navbar.tsx`, `Hero.tsx`, `FeaturedVehicles.tsx`, `TrustMetricsBar.tsx`, `TrustBadgeMatrix.tsx`, `CompareModal.tsx`, `useHomePageConfig.ts`, `SellPage.tsx`, `DashboardPage.tsx`, `Support.tsx`, `UnifiedCommunicationHub.tsx`; backend `dealerPlatformController.js`, `utils/navigationConfig.js`; tests updated for intended wording (`InspectionsView.test.tsx`, `MobileBottomNav.test.tsx`, `navigationAuthority.test.ts`); `validate-navigation-convergence.mjs`; e2e scripts; docs.

## 10. Backend, database, API, RLS, security, financial changes
- **No migration, table, RLS or API surface change.**
- `getInspectionOrders`: response narrowed (privacy). `NAVIGATION_REGISTRY.inspection` extended by two ids (admin-config allow-list). Nothing financial changed.

## 11. Tests run and results
- Frontend `npx vitest run`: 65 files, **480 pass / 0 fail / 1 skip**, exit 0 (previous 455/1; +25 new: 23 in servicesHub.test.tsx, 2 in dealerProfileTruth.test.tsx). `tsc --noEmit` exit 0. `npm run build` exit 0.
- Backend Jest: 55 suites, **771 pass / 0 fail** (prev 770, +1 dealer privacy). Vitest 16/16. node:test 1/1.
- Validators: **164 pass / 10 fail, identical set to baseline** (`validate-navigation-convergence.mjs` updated: label and `services:*` ids).
- Browser (Playwright, mocked API, real UI): `automotive_journey.js` **71/71** (was 50; +21 covering hub copy, deep links to roadside and pre-purchase categories, guest sign-in, 44px lane actions, no horizontal scroll at 1440 and 375, nav dropdown and its roadside link); `inspection_journey.js` **66/66** (updated for the new tab/button names).
- Baseline for this task = the delivered state recorded in the previous report (FE 455/1, BE 770, validators 164/10, e2e 50+66), re-run in full above.

## 12. Baseline failures versus regressions
Pre-existing: the same 10 failing validators. Regressions found and fixed in-session: three nav/hub tests asserting old labels (intentional wording change; updated, not weakened), the 14A registry-parity validator (registry updated), unhandled-rejection noise in my own new test (defaults added). No skips added.

## 13. Revert-proof evidence
`evidence/ux-convergence/revert_ux_results.txt`: 14 mutations (KAYAD-performs wording, removed no-dispatch statement, dropped category deep links, removed no-guarantee line, dropped matched-provider caption, nav destination/label, certificate restored, advice removed, action unwired, fake reviews restored, 150-point and dispatch copy restored) — all failed the suite; restored 53/53. Dealer privacy: `revert_dealer_results.txt` (notes and report re-exposure both caught).

## 14. Unsupported, unresolved, environment-blocked
- Not supported: repair/roadside requests, quotes, dispatch, tracking, availability; model/year compatibility; geocoding/travel time; provider job dashboard; complaints/refund process for services.
- Decisions for the owner: whether KAYAD charges for matched inspections; commission/settlement; whether sellers may see reports; escrow (not started).
- Environment-blocked: live Supabase/RLS with real accounts, real M-Pesa and uploads, real geolocation prompts, real-device mobile testing. Browser runs use a mocked backend; backend behaviour is covered by Jest and the earlier PG16 proof.
- Known leftovers outside scope: unmounted `VehicleDetailPage.tsx` still contains old 150-point/"From KSh 4,500" copy; other marketing strings and fixtures (mock data, ThemeStudio preview, architecture report) still mention 150-point; "Guaranteed Safe Transfer"/"100% KAYAD Verified" style badges elsewhere were not audited.

## 15. Remaining work ranked
1. Owner decisions (charging, commission, seller report access).
2. Staging verification on live Supabase + migration order (`20261009120000…` before deploy).
3. Complaint/dispute/refund process for providers; refund execution for paid cancellations.
4. Sweep remaining unsupported trust claims ("Guaranteed", "100% Verified", dormant pages, fixtures).
5. Provider job-handling dashboard once a request workflow exists; repair/roadside requests.
6. Model-level compatibility catalog; geocoding.
7. Individual inspector approval onto evidence rules; retire dead modules; nav-chrome touch targets.
