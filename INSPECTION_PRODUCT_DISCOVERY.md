# KAYAD Pre-Purchase Inspection — Product Discovery (written before implementation)

Date: 2026-10-09 · Baseline tree: Frontend Test Recovery delivery (commit `3df03863` on `frontend-test-recovery`).
Method: traced every customer action from the public UI to the controller, service, RPC and table, and back. A capability is listed as *working* only where the whole execution path was read; nothing is inferred from labels or type definitions.

> Honest limits of this discovery: the sandbox has no database, no M-Pesa sandbox and no live Supabase. Everything below is **source-level tracing plus unit/browser execution against mocked transports**. It is not live certification.

---

## 1. Actual architecture — there are two inspection products

Both share one router file (`backend/inspection/routes/inspectionRoutes.js`, mounted at `/api/inspection` **and** `/api/inspections`, `backend/server.js:794-796`). `INSPECTION_ARCHITECTURE_CONVERGENCE_20261008.md` (Stage 5) already established that they are *distinct products*; this discovery confirms it and adds new defects.

| | **A. KAYAD vehicle inspection** ("Ghost Check", legacy `/order` API) | **B. Provider booking** (marketplace) |
|---|---|---|
| Identity | `car_id` → a real KAYAD listing | free-text make/model/year/VIN; **no listing link** (`inspectionBookingSchema`, `backend/validation/phase22.schema.js:76`; `bookingService.createBooking` never sets `vehicle_id`) |
| Tables | `vehicle_inspections` (canonical execution record) | `inspection_bookings`, `inspection_providers`, `inspection_packages`, `inspection_staff`, `inspection_reports`, `inspection_status_history`, … (`20260816180000_inspection_marketplace_activation.sql`) |
| Who is inspector | admin assigns a `ghost_checker` user (`legacy.assign`, `requireRole(['admin','superadmin'])`) | the provider assigns its own staff (`requireProviderOwnership`) |
| Price | flat fee, `system_settings.ghostCheckFee` else 2500 (`createOrder`) | server-computed `package.price + provider.mobile_inspection_fee` (`bookingService.createBooking`) |
| Payment | **cannot settle — see D1** | M-Pesa STK via `POST /bookings/:id/payment/initiate` → callback → `kayad_process_inspection_payment_atomic` (works by source trace; live M-Pesa ENVIRONMENT-BLOCKED) |
| Customer list | `GET /my` (`legacy.listMine`) | `GET /bookings` (`getCustomerBookings`) — **no customer UI consumed it before this stage** |
| Report | on the same row: `overall_score`, `condition_rating`, `inspector_notes`, `checklist`, `evidence` | `inspection_reports` (+checklist items, PDF, share token); `GET /reports/:id` (owner/provider/admin) |
| Link between A and B | columns `vehicle_inspections.inspection_booking_id` / `inspection_bookings.vehicle_inspection_id` exist (`20260921232000_…execution_link.sql`) but **no application code ever populates them** (grep over `backend/**/*.js`) |

Frontend consumers: A → `src/services/inspectionApi.ts` → `src/features/InspectionsView.tsx` (route `/?nav=inspections`). B → `src/features/InspectionMarketplace/*` (route `/?nav=inspection-marketplace`). Navigation (`src/components/navigation/navConfig.ts:93-98`) offers "Request an inspection" and "Find an inspection provider" — the two products — correctly.

## 2. Lifecycle states (source of truth)

**A (`vehicle_inspections.status`)**: `requested → assigned → in_progress → completed` (`createOrder`, `assign`, `start`, `submit`). `legacyOrder()` projects these to `pending_payment | assigned | in_progress | completed`; any other value (e.g. `cancelled`) is silently shown as `pending_payment`. No customer cancel endpoint exists for A.
**B (`inspection_bookings.status`)**: `booked, confirmed, inspector_assigned, travelling, inspection_started, inspection_complete, report_generated, customer_reviewed, closed, cancelled, no_show`; payment: `pending, deposit_paid, fully_paid, refunded` (`types/inspection.ts:238-255`). Provider transitions are allow-listed (`validTransitions`). Customer cancel exists (`POST /bookings/:id/cancel`, owner-checked).

## 3. Responsibilities and authorization boundaries (verified)

| Audience | What exists | Boundary evidence |
|---|---|---|
| Customer | request A; book B; list own A (`/my`, `requester_id = req.user.id`); list own B (`customer_id`); read own report | `requireAuth`; `assertAccess`; `getBookingDetails` owner check; `getReportDetails` owner/provider/admin check |
| Provider | apply (`/api/v1/phase22/providers/register`), operate bookings/reports/settlements | `requireProviderOwnership`; settlement payout admin-only |
| Inspector (A) | `start`, `submit` own assignment | ownership or admin; status preconditions (Stage 5) |
| Dealer / seller | dealer dashboard "Inspections" reads dealer operations data (`DealerDashboard.tsx:864`); chat room per inspection (`kayad_bridge_inspection_execution`) | the public page has no dealer/seller controls and must not gain any |
| Admin | assign inspector (admin UI `src/pages/admin/AdminInspections.jsx` calls `inspectionApi.availableInspectors()` / `assign()`; no customer-facing caller), command-centre counts, `ghostCheckFee` in platform config | `adminRoutes.js` permission router (`MANAGE_INSPECTIONS`) |

RLS: `20260918130000_inspection_domain_rls_hardening.sql` enables buyer/inspector/provider-scoped policies; service-role RPCs are `REVOKE … FROM PUBLIC; GRANT … service_role`. **Not re-certified live** (no database in this environment).

## 4. Capability status

| Capability | Status | Evidence |
|---|---|---|
| Browse verified providers, profile, slots | WORKING (source+unit) | `providerController.searchProviders/getProviderProfile/getAvailableSlots` |
| Book a provider with server-side price, slot collision, mobile/workshop enforcement | WORKING (source) | `bookingService.createBooking` |
| Pay a provider booking by M-Pesa, atomic settlement | WORKING by trace; **ENVIRONMENT-BLOCKED** live | `initiateInspectionPayment` → `paymentCallback.service.js:291-316` → RPC |
| Request A for a KAYAD vehicle | **PARTIAL / DEFECTIVE** — D1, D2 | `createOrder` |
| Customer "My inspections" for A | **BROKEN** — D3 | `listMine` vs `mapBackendOrderToBooking` |
| Customer tracker for B | **ABSENT in UI** (API existed) — G1 | `inspectionApi.getCustomerBookings` had no caller |
| View report for A | **BROKEN in UI** — D3/D4 | reports gated on `order.overallScore !== undefined`, never true for raw rows |
| View report for B in UI | **ABSENT** (API existed) — G1 | `inspectionApi.getReport` had no caller |
| Provider workspace reachable | **PARTIAL** — `ProviderBusinessCenter` is exported but not routed (`App.tsx` has no route); marketplace page says so honestly (`InspectionMarketplacePage.tsx:342`) | gap, documented, out of scope |
| Public configuration of inspection content | NONE. `ghostCheckFee` is writable via `PUT /admin/config` (`adminRoutes.js:654`) but `createOrder` reads `system_settings.ghostCheckFee` — a different store, **never written by application code** → the admin fee setting has no effect — G3 | grep `ghostCheckFee` |

## 5. Defects found (before any change)

**D1 (P0, money safety) — Request A starts an M-Pesa charge that can never settle.** `createOrder` calls `initiatePayment({ type:'inspection', metadata:{ service:'inspection', canonical:true } })` (`legacyCompatibilityController.js:101`). The callback's inspection branch requires `payment.metadata.bookingId` and otherwise `releaseClaim(); throw new Error('Inspection payment is missing its booking reference')` (`paymentCallback.service.js:291-296`); the settlement RPC operates only on `inspection_bookings`. So the customer's phone is charged by Safaricom while KAYAD cannot attribute or settle it.
**D2 (P1) — `createOrder` ignores a failed payment initiation.** `initiatePayment` returns `{success:false}` for an invalid number or an in-flight payment; `createOrder` does not check it and still inserts the inspection and replies success. The duplicate-active check then blocks any retry (409).
**D3 (P1) — "My inspections"/"My reports" cannot show real data.** `listMine` returns raw `vehicle_inspections` rows (`res.json({orders: data})`) whereas `createOrder/getById/…` return `legacyOrder(...)`. The page's mapper reads `order.car.title`, `order.fee`, `order.overallScore`, `order.notes` — all absent on raw rows. Result: every order shows title "Vehicle", empty location, fee "Not returned", no report ever; the summary reads a field (`notes`) that `legacyOrder` does not even expose (it exposes `inspectorNotes`).
**D4 (P1, truthfulness) — claims the system does not support.** Review step: "Submitting this request does not mean payment has been completed"; confirmation: "Payment — Not created by this request" (a payment *was* created, D1). Report verdict labels ("Passed (Clean Certification)", thresholds 80/50) are invented in the frontend; the backend stores `condition_rating`. "Schedule" column: `scheduled_at` is only set when the inspector *starts* (`legacy.start`) — there is no customer scheduling for A.
**D5 (P1) — vehicle context lost.** `VehicleDetailModal` calls `onRequestInspection(vehicle)` but `App.tsx:676` discards it: `onRequestInspection={() => setActiveNav('inspections')}`, and `initialSelectedVehicle` is never passed. The request form defaults to `vehicles[0]` — a customer inspecting vehicle X can silently submit vehicle #1.
**D6 (P2) — no submit-in-flight guard.** The Submit button stays enabled during the request; the backend duplicate check is read-then-insert (Stage 5 documented the race), so double taps can create two orders. Errors are toasts that vanish after 3.5 s and the wizard steps lose their place on failure.
**D7 (P2) — marketplace dead ends.** (a) After a failed/timed-out payment, `BookingFlow.handleSubmit` calls `createBooking` again on retry → the first (unpaid) booking still holds the slot → "Time slot not available": the customer is stuck. (b) `onComplete` silently returns to the provider list: no reference, no confirmation, no route to the booking. (c) Provider search failure is only `console.error` — the list renders empty (reads as "no providers"). (d) The polling loop has no unmount guard.
**D8 (P3) — dead code in `InspectionsView.tsx`:** unused filters, ratings, helpful-votes, payments state, county/specialisation lists, `buyerName/Email`, `packageType`, `inspectionPackages` (≈ 150 lines) remnants of a removed fake mechanic directory.
**D9 (P3) — role confusion:** Navbar "Inspection Portal" for `mechanic` and DashboardHub `ghost_checker` actions send inspectors to the public page, which has no inspector tooling (`src/pages/inspector/*` components are only imported by each other). Documented, not changed.

## 6. Tests and baseline (captured before changes)

* Frontend full suite (tree identical to the verified recovery delivery): **388 passed / 0 failed / 1 skipped**, 54 files; `tsc --noEmit` clean; `npm run build` OK; 95/97 runnable validators pass (2 ENVIRONMENT-BLOCKED: provider credentials, Node 22.22.2).
* Inspection-specific frontend (5 files): 48 passed — `inspectionApi.test.ts`, `VehicleDetailModal.test.tsx`, `MobileBottomNav.test.tsx`, `supportFaqTrustClaims.test.ts`, `navigationAuthority.test.ts`. **No test covered `InspectionsView`, `BookingFlow` or `InspectionMarketplacePage`.**
* Backend inspection-specific: `tests/inspection` 2 suites / 5 tests passed (assign, start/confirm-payment). Full backend Jest baseline recorded in the report.
* No `.git` in the working tree (ZIP delivery); `git status` is therefore replaced by a byte-diff of the tree against the recovery delivery at the end (report §Files).

## 7. Security-sensitive boundaries to preserve

Ownership checks in `assertAccess`/`getBookingDetails`/`getReportDetails`; `requireProviderOwnership`; CSRF + idempotency + `paymentLimiter` on `payment/initiate`; server-side price authority; service-role-only RPCs. The redesign adds **no** privileged action to the public page; the only backend edits are the narrowly scoped D1–D3 corrections listed in the report, none of which widens access (D3 in fact *narrows* the payload: raw rows exposed the `notes` blob containing the phone number; `legacyOrder` does not).

## 8. Design consequence (what the discovery says the page must be)

1. Two honest routes, named for what they are: **KAYAD vehicle inspection** (for a KAYAD listing; KAYAD assigns the inspector; no payment taken by the request) and **Book a verified provider** (choose provider/package/slot; price and payment shown by the server).
2. Vehicle context must follow the customer from the vehicle page.
3. One "My inspections" for both products, with real statuses only, empty/error/partial-failure states, and report access gated by the same ownership checks.
4. Never present an invented verdict, schedule, price or payment state.


## Addendum — findings made during implementation (2026-10-09)

* **D10 — dead marketplace "Apply" event.** The marketplace page dispatched a window event nobody handled on that route; the Apply button did nothing. Fixed by an explicit `onApplyAsProvider` prop (App routes to the single provider-application modal). The legacy event listener is retained for older entry points.
* **D11 — second consumer of `GET /inspections/my`.** `OwnershipPlatform/pages/BuyerPlatform.tsx` read `status` and `overallScore` from the raw rows. Moving `listMine` to the `legacyOrder` projection would have shown "0/100" for unscored orders; `legacyOrder.overallScore` is now `null` when unscored and `BuyerPlatform` uses the shared status labels. `DashboardHub` only counts orders (unaffected); `scripts/certify-v14-live-api.mjs` is a live-only script and reads `orders` (unaffected).
* **D12 — fee has two stores.** The KAYAD request fee is read from `system_settings.ghostCheckFee` (order notes), while the admin config surface exposes `ghostCheckFee` separately. Not changed (backend/admin scope). The UI labels it "Quoted fee" and states that no payment is taken.
* **D13 — provider cancel only computes a refund.** `POST /bookings/:id/cancel` marks the booking cancelled and returns a policy refund figure; it does not execute a refund. The customer UI therefore offers cancel for **unpaid** bookings only.
* **D14 — vehicle detail offered no inspection route for auction, private-seller and escrow-active vehicles.** "Book Inspection & Reserve" (a false reservation claim) existed only in the fallback branch. Renamed "Request an Inspection" and added the same action as a secondary button for the other branches.

---
## Addendum — Automotive Services convergence (2026-10-09; earlier sections unchanged)
Superseded/extended facts: the performing provider is now identifiable on System A records (`businessName` from `inspection_providers`); A's `assign` and admin inspector list enforce the same ACTIVE+verified eligibility as B; the provider network gained per-service capabilities and two-sided staff affiliation. The A/B split, A's lack of payment, and the unresolved charging decision stand. See `AUTOMOTIVE_SERVICES_MARKETPLACE_CONVERGENCE_REPORT.md` §11–12.

---
## Addendum 2 — UX convergence (2026-10-09; earlier text unchanged)
Customer-facing naming changed: System A is presented as "Get matched with an inspector" (KAYAD assigns a verified independent provider; their business is named on the record), System B as "Choose a provider". The hub now also covers general automotive-service discovery. A seller-facing leak (buyer notes/report in `GET /api/dealer/inspections`) was found and closed. See `KAYAD_AUTOMOTIVE_SERVICES_UX_CONVERGENCE_REPORT.md`.
