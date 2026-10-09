# Automotive Services Marketplace — Convergence Report (2026-10-09)

Companion to `AUTOMOTIVE_SERVICES_PRODUCT_DISCOVERY.md` (written before implementation). Evidence files are in `evidence/automotive-services/`.

> Note: no standalone "business-model correction" document exists in the repository; the corrected model is recorded in §1–3 here and in the addenda to `INSPECTION_PRODUCT_DISCOVERY.md` and `INSPECTION_EXPERIENCE_CONVERGENCE_REPORT.md`.

## 1. Unified business model
KAYAD is a **technology platform** that lists independent automotive businesses, helps customers find the right one, and records the relationship between customer, vehicle and provider. Independent verified providers perform every service. One provider network (`inspection_providers`) carries distinct per-service **capabilities**. Two business lines share it:
- **Vehicle trust services** (pre-purchase inspection; the only bookable service today).
- **Automotive services discovery** (diagnostics, mechanical/electrical repair, hybrid/EV, tyres, body, detailing, roadside/recovery, etc.: 12 categories in `backend/inspection/config/serviceTaxonomy.js`). These are *find a verified business* only. `requestable:false` for all of them; KAYAD does not take, dispatch or fulfil these requests.

## 2. KAYAD versus independent businesses
Copy and data model never say KAYAD performed a service. The finder, provider profile and credentials panel carry an independent-business notice; the inspection report and "My inspections" show **"carried out by {business}"** from authoritative data (`inspection_providers.trading_name/company_name` via the inspector's user id). No KAYAD guarantee, warranty or insurance is claimed anywhere.

## 3. The two business lines
| | Pre-purchase inspection | Other automotive services |
|---|---|---|
| Customer action | Book a provider (system B) or request a KAYAD-assigned inspection (system A) | Find a verified business; contact them directly |
| KAYAD role | Records booking, tracking, report | Directory + verification only |
| Roadside | n/a | Directory only. UI states there is no dispatch, tracking or guaranteed response; shows 999/112 |

## 4. Architecture reused (nothing parallel)
`inspection_providers`, `inspection_staff`, `inspection_credentials`, the registration RPC, `/api/inspection/*`, `adminRoutes` global `protect, adminOnly` + path-regex permission (`inspection` → `MANAGE_INSPECTIONS`), `inspection_status_history` for audit, `POST /api/upload` (private `documents`), `GET /api/config/vehicle/makes`. New: one table (`provider_service_capabilities`), three columns on staff (affiliation), a governance sub-router mounted under the existing admin guard.

## 5. Verified provider and staff-affiliation model
- Business eligibility (single source): `lifecycle_stage='ACTIVE'`; trigger `trg_sync_provider_status` derives `status`/`verification_status` (DB proof T1–T4). Every search, profile, assignment and listing re-checks `status='active' AND verification_status='verified' AND lifecycle_stage='ACTIVE'`, in the query and again on the returned row.
- Mechanics: `inspection_staff.affiliation_status` pending → confirmed → ended, with **two-sided consent** (business invites / mechanic requests; the other side confirms). New rows are never assignable or matched until `confirmed`. Ended affiliations drop out of matching and the public team list immediately. Business verification does **not** certify employees; the public profile says so.
- Suspension/revocation changes backend eligibility (search returns nothing; assign returns 409), not only a badge.

## 6. Alternative verification route
For businesses without customer-facing premises: a recorded `verification_route`, evidence uploaded as credentials (private documents), and the **same admin decision** (approve needs notes; reject/suspend need a reason; optimistic concurrency). It is not a shortcut: nothing is auto-approved and credentials start `unverified`. "For Real Kenya" is *not* marked verified anywhere; it is only an example in the mission and no seed/row exists for it.

## 7. Taxonomy and qualification controls
One backend-served taxonomy (`GET /api/inspection/service-taxonomy`), consumed by the application modal, finder filters and admin screen; no hardcoded duplicate lists in the frontend. Capabilities are `declared → verified → revoked`; the public side shows **declared vs verified** distinctly. High-risk categories (`hybrid_ev`) never match unless **verified** (admin approval + evidence), even with `verifiedOnly` off. Symptom helper maps symptoms to categories and states "not a diagnosis".

## 8. Vehicle compatibility
Makes come from the canonical `/api/config/vehicle/makes`; providers declare `vehicle_makes`/`all_makes`/`powertrains` per capability. Matching filters on these. Labelled as provider-declared; no model-level claims are made (no model catalog exists, see §18).

## 9. Location and roadside
Real provider coordinates and `service_radius_km` only. Straight-line distance (haversine; null/blank coordinates are rejected, a bug caught and fixed in testing: `Number(null)=0` had produced 4096 km). Location is requested only on user click with a manual county/town fallback, rounded to 0.01° and never stored. "Within service radius" is claimed only for mobile providers with a stored radius and computable distance. No ETAs, no availability or coverage invented. Empty results explain why and offer a broader search.

## 10. Customer protection
Honest limits only: verified-only filter, declared-vs-verified labels, credentials shown only when admin-verified and unexpired, private documents and internal notes never public, public inspector/provider payloads no longer contain email/phone. No guarantee/warranty/escrow is invented. **Gap (document, not solved):** there is no dispute, refund or complaint process specific to non-inspection services.

## 11. The two inspection systems reconciled
- A (`vehicle_inspections`, `/api/inspections/*`) and B (`inspection_bookings`, `/api/inspection/*`) remain; no third engine.
- Reconciliation done at the identity and attribution layers: both now resolve the performing business from `inspection_providers`; A's `assign` and `availableInspectors` use the same eligibility rule as B's search; B's staff assignment enforces confirmed affiliation + eligible provider.
- Preserved: vehicle preselection, tracking, truthful payment (A has no payment; B pays via the booking), cancellation, report access.

## 12. Payment/fee behaviour and unresolved decisions
Re-verified: A's legacy M-Pesa charge is unsettleable (callback `paymentCallback.service.js` requires `metadata.bookingId`; RPC `kayad_process_inspection_payment_atomic` handles only `inspection_bookings`). A therefore takes no payment (`createOrder` records the fee only). **Nothing was changed and no charge was reintroduced.** Unresolved business decisions: (1) whether KAYAD charges for A-inspections; (2) `inspection_providers.commission_rate` (default 15) and `settlementService` exist for B: whether KAYAD takes commission at all is undecided, and nothing here assumes it; (3) whether any escrow is wanted (explicitly not started).

## 13. Files changed, added, removed
Removed: none. Added: migration; `serviceTaxonomy.js`; `providerDiscoveryService.js`; `providerGovernanceService.js`; `governanceController.js`; `adminInspectionGovernanceRoutes.js`; `automotiveServices.schema.js`; `AdminProviderGovernance.tsx`; `ProviderServicesModal.tsx`; `CapabilityBadges.tsx`; tests (`fakeSupabase.js`, `automotiveServices`, `automotiveWiring`, `legacyEligibility`, 4 frontend files in `__tests__/features/automotive/`); `e2e/automotive-services/automotive_journey.js`; `evidence/automotive-services/*`; the two docs. Modified (backend): `inspectorApplicationController`, `legacyCompatibilityController`, `providerController`, `inspectionRoutes`, `bookingService`, `providerService`, `workforceService`, `adminRoutes`. Modified (frontend): `AdminView`, `ProviderCard/Filters`, `InspectionMarketplacePage`, `ProviderProfilePage`, `services/api.ts`, `types/inspection.ts`, `InspectionReportModal`, `ProviderApplicationModal`, `inspectionJourney`, `InspectionsView`, `services/inspectionApi.ts`. Modified tests/validators: `onboardingFlow.test.js` (mock gained `.is`), `legacyInspectionAssign.test.js` (supplies an eligible provider), `legacyInspectionListCreate.test.js` (inspector now carries `businessName`), `validate-inspection-marketplace.mjs` (see §16).

## 14. Backend, DB, API, RLS, authorization and financial changes
- **DB (one idempotent migration, applied twice on PG16 with all prior migrations):** `provider_service_capabilities` (RLS on; anon/authenticated privileges 0; service_role only, T9–T11); `inspection_staff.affiliation_status` + check constraint (T8), default `pending`; unique capability scope (T6); status check (T7); fixes credential/registration column drift the old service wrote against.
- **API:** `GET /service-taxonomy` (public); `GET /provider-me`; capabilities and staff routes with ownership middleware; `/affiliations/*`; admin `/api/admin/inspection-governance/*` behind the existing guard. All zod-strict. Public search ignores client-supplied `status/verified`.
- **Authorization:** owner scoped by user id; admin decisions audited in `inspection_status_history` plus admin auto-audit; `assign()` 409 for ineligible inspectors; `availableInspectors` rebuilt from the provider network (the old query used a non-existent `isInspector` column).
- **Privacy:** removed email/phone from the public inspector list; ratings are `null` (not 0) with no reviews; acceptance rate `null`.
- **Financial:** none changed.

## 15. Exact tests and results
- Frontend `npx vitest run`: 63 files, **455 pass / 0 fail / 1 skip** (baseline 419/0/1; +36 new).
- Backend Jest (`node --experimental-vm-modules jest --forceExit`): 54 suites, **770 pass / 0 fail** (baseline 698; +72). Vitest 16/16. node:test 1/1.
- `tsc --noEmit`: exit 0. `npm run build`: exit 0.
- Validators: **164 pass / 10 fail, identical set to baseline** (the 10 pre-existing failures are unchanged).
- Browser (Playwright, built against vite dev server): `automotive_journey.js` **50/50** at 1440 and 375 (registration modal, taxonomy filters, empty state, error+retry, roadside notice, consent location, profile, affiliation request, admin governance incl. non-admin hiding, a11y checks, no page errors); `inspection_journey.js` **66/66**.
- DB proof (`db_proof.sql`/`db_proof_output.txt`): trigger derivation, suspension removes from eligible set, constraints, RLS/privileges.

## 16. Baseline failures versus regressions
Baseline (captured first): FE 419/0/1, BE 698/16/1, validators 164/10, e2e 66. **One regression was found by the final run and fixed:** three validators (`inspection-marketplace`, `marketplace-phase10`, `release`) string-matched implementation I replaced. Disposition: not a behaviour break for the first and third (shape `{items,total,page…}` retained; eligibility is now *stricter*: status+verification+lifecycle in the query). The price-sort check: the **price/rating sort controls were intentionally removed** (ordering is distance → verified capability → name; rating sorts would rank by non-data). The validator now asserts the surviving invariant (starting price is real and null-safe). This is a deliberate feature removal, listed in §19. After the update: identical to baseline.

## 17. Revert-proof evidence
Mutate → fail → restore → pass, all in `evidence/`: backend **16/16** mutations caught (`revert_backend_results.txt`), frontend **15/15** (`revert_frontend_results.txt`), legacy controller **6/6** (`revert_legacy_results.txt`), plus the transport-path test (`stripApiPrefix` removal fails it). Initial survivors (backend: row-level eligibility, query-level lifecycle, ended-staff; legacy: the availableInspectors single-field filters) were closed by adding single-field-different fixture rows; no assertion was weakened.

## 18. Unsupported capabilities, risks and environment-blocked checks
- **Not supported (stated in UI):** repair/roadside *requests* (the Phase-22 RPCs are absent from migrations), dispatch, live tracking, ETAs, guaranteed response, real-time availability for non-inspection services.
- **ENVIRONMENT-BLOCKED:** live Supabase/Auth/RLS with real accounts, real M-Pesa, real uploads to storage, real geolocation permission prompts; the DB proof used a local PG16 built from migrations. Browser tests ran against mocked API routes (anchored regexes), not the real backend.
- **PARTIAL:** no model-level compatibility catalog (only make/powertrain); distance is straight-line, not travel time.
- **Risks:** individual-inspector approval through the legacy admin path (`approveApplication`) predates the two-route rules (admin-only, audited; it now stamps verification and creates a verified `pre_purchase_inspection` capability); `ProviderBusinessCenter.tsx` and `AdminInspectorApplications.jsx` are unmounted/unreachable (left alone); nav chrome has some buttons under 40 px (existing, out of scope).

## 19. Remaining work ranked
1. Owner decisions: charging for A-inspections; commission/settlement posture (`commission_rate`); any escrow.
2. Staging run with real accounts, storage and RLS against a live Supabase; apply the migration in order before deploying the code.
3. Refund/dispute/complaint process for providers (customer-protection gap).
4. Build real repair/roadside request journeys only after a provider-side workflow exists.
5. Model-level compatibility catalog; geocoding / travel-time.
6. Re-introduce a price sort if wanted (`starting_price` is real; null last).
7. Bring the legacy individual-inspector approval onto the evidence rules; retire dead modules.
8. Raise nav-chrome touch targets to 40 px.


> Update 2026-10-09 (UX convergence): customer-facing naming, hub, navigation and the seller-view privacy fix are in `KAYAD_AUTOMOTIVE_SERVICES_UX_CONVERGENCE_REPORT.md`. Counts above are as of that earlier delivery (FE 455, BE 770); current: FE 480, BE 771, browser 71/71.
