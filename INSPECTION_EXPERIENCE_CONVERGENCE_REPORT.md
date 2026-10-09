# KAYAD Pre-Purchase Inspection — Experience Convergence Report
Date: 2026-10-09 · Basis: `KAYAD-FRONTEND-TEST-RECOVERY-20261009.zip` (recovery commit `3df03863`) · Companion: `INSPECTION_PRODUCT_DISCOVERY.md`

## 1. Executive summary
KAYAD has **two real inspection products** on two canonical records, and the public page treated them as one (and mis-described both). This stage keeps both systems, adds no new API or table, and makes the public page tell the truth about each, end to end:

| | A. KAYAD vehicle inspection | B. Verified provider booking |
|---|---|---|
| Record | `vehicle_inspections` | `inspection_bookings` |
| API (reused) | `/api/inspections/order|my` | `/api/inspection/providers|bookings|reports` |
| Who assigns the inspector | KAYAD admin | the provider |
| Payment | **none taken by the request** (see 3.1) | M-Pesa, settled by the verified callback + atomic RPC |

Operational truth fixes (verified by tests): a legacy request no longer starts an M-Pesa charge KAYAD cannot settle; "My inspections" now receives the order projection the client was written against; a failed provider payment is retried against the **same** booking; the page no longer invents verdicts, schedules or reservations.

## 2. Customer journey
**Before:** hero with unsupported claims → one big form with a pre-chosen first vehicle → a "success" screen that said payment "was not created", invented a schedule/verdict and could not be tracked; vehicle context discarded; marketplace retry created a second booking and hit "Time slot not available"; load failure looked like "no providers"; Apply did nothing.

**After:** `Pre-purchase inspection` page → two named routes + a truthful "what happens next" → tabs **Get an inspection / My inspections / Reports** (WAI-ARIA tabs, arrow/Home/End). Entering from a vehicle (any vehicle type) lands on the request form with **that vehicle preselected**. The request confirmation shows the **server** order, its real status and "No payment taken". My inspections merges both sources (independent failure, retry), shows a 4-stage progress list, real statuses/inspector/slot/price/payment, and the actions that are actually valid: **Pay now** and **Cancel** (unpaid bookings only) and **View report**. Reports show only stored facts. Provider application is one accessible modal, authenticated, states that it grants no access.

Design decisions: KAYAD teal kept; no invented data (no verdicts, ratings, fake inspectors, schedules, VIN/logbook checks); the screenshot was treated as symptoms, not a layout spec; every state (guest, loading, empty, partial/total failure, success, offline-ish 401) is explicit; destructive/financial actions are guarded against double submission and aborted on unmount.

## 3. Files
**Backend (1 source file, 1 test):** `backend/inspection/controllers/legacyCompatibilityController.js` — `listMine` returns `legacyOrder` projection (inspector as `{id,name}` only; notes blob and contact details omitted); `createOrder` no longer calls `initiatePayment`; `legacyOrder.overallScore` is `null` when unscored. New `backend/tests/inspection/legacyInspectionListCreate.test.js` (4 tests).
**Frontend added:** `src/features/InspectionsView/{inspectionJourney.ts, RequestInspectionModal.tsx, InspectionReportModal.tsx, BookingActions.tsx, ProviderApplicationModal.tsx}`, `src/features/InspectionMarketplace/services/inspectionPayment.ts`, tests under `src/__tests__/features/inspections/` (5 files), `e2e/inspection-journey/`.
**Frontend changed:** `InspectionsView.tsx` (rewritten, same props + `initialTab`/`launchAction`), `App.tsx` (vehicle-preserving inspection launch; marketplace callbacks), `VehicleDetailModal.tsx` (+test), `BookingFlow.tsx` (shared helper, retry reuses booking, abort on unmount), `InspectionMarketplacePage.tsx` (error panel, confirmation, Apply wiring), `InspectionMarketplace/services/api.ts` (type generics only), `services/inspectionApi.ts` (types), `BuyerPlatform.tsx` (shared status labels), `scripts/validate-inspection-marketplace-activation.mjs` (now checks the shared helper — stricter, 16/16).

### 3.1 Owner decision required (business rule)
The legacy request used to open an M-Pesa STK push, but `paymentCallback.service.js` settles inspection payments only when `metadata.bookingId` exists and the RPC `kayad_process_inspection_payment_atomic` only updates `inspection_bookings`. That charge could therefore **never** be settled, and `createOrder` ignored its result. It is removed. To charge for KAYAD inspections, a `vehicle_inspections` settlement path (RPC + callback branch + migration) must be designed and approved — deliberately **not** done here.

### Boundaries (verified by tree diff against the recovery delivery)
Changed: 1 backend controller (+1 test). **Not changed:** migrations, RLS, payment/callback/escrow/auction/auth/CSRF/rate-limit code, routes, validation schemas, dealer/seller and admin files, navigation. `GET /inspections/my` is still scoped by `requester_id = req.user.id`.

## 4. Security, privacy, accessibility, responsive
* Privacy: the `my` projection drops the raw notes (phone), inspector email/phone; the test asserts none appear. Reports are fetched by the existing owner-checked endpoint; failure copy says so.
* No auth/CSRF/validation changes; client validation is advisory (9–15 digit phone) — server remains the authority. Photo URLs are rendered only if `http(s)`.
* A11y: labelled fields (`htmlFor`, `aria-invalid`, `aria-describedby`), `role=alert/status`, dialog via existing `ui/Modal` (focus trap, Escape, focus restore — verified in browser), tabs with roving tabindex, progress as an ordered list with `aria-current`, 44px action targets, Escape blocked only during an in-flight payment.
* Responsive: no horizontal overflow and dialog fits at 360/375/390/768 and 1440; reduced-motion emulated.

## 5. Verification (all real runs)
| Check | Result |
|---|---|
| Frontend vitest | **419 passed / 0 failed / 1 skipped, 59 files** (baseline 388/0/1, 54 files; +31 tests, +5 files; 0 regressions) |
| New inspection-specific frontend | 5 files, 30 tests (+1 in VehicleDetailModal) |
| Backend Jest | **698/698, 51 suites** (baseline 694/50); Vitest 16; node:test 1 — unchanged |
| `tests/inspection` | 3 suites / 9 tests |
| tsc / build | clean / OK |
| Validators (all 174 `scripts/validate-*.mjs` run on the pre-change tree and on the final tree: 164 pass, 10 fail on both) | identical pass/fail set; 1 validator updated (inspection-marketplace-activation, 16/16). 10 fail identically before and after (4 are package-gated and ENVIRONMENT-BLOCKED: communications-provider, live-runtime, phase6-release, v14-runtime-preflight; 6 are stand-alone legacy validators outside the package gate: communication-event-convergence, escrow-custody-domain, home-hero-premium, lead-crm-domain-end-to-end, local-supabase, production-host-contract) |
| Browser journeys (Playwright/Chromium, mocked backend) | **66/66** — guest, empty, request (single POST on double-click), tracking, total/partial failure + retry, pay (server-confirmed), cancel, KAYAD & provider reports, vehicle→inspection preselect, provider apply, 4 mobile widths, focus trap, reduced motion |

Live-provider certification (real M-Pesa, real Supabase) is **ENVIRONMENT-BLOCKED**; nothing here claims it.

### Revert-proof (surgical, restored after each)
* Backend: `listMine` reverted → FAIL; `initiatePayment` re-added → FAIL; restored → 4/4 PASS (`insp/revert_backend.txt`).
* Frontend: remove double-submit guard → 1 FAIL; treat un-started STK as started → 1 FAIL; one source failure hides the other → 1 FAIL; App drops the vehicle → browser FAIL (`vehicle->inspection`); all restored → 30/30 and 66/66 PASS (`insp/revert_frontend.txt`).

## 6. Known gaps and ranked next steps (none auto-started)
1. **Owner decision (3.1):** whether KAYAD inspections are paid, then a proper settlement path.
2. Provider cancel of a **paid** booking has no refund execution (D13).
3. `ghostCheckFee` has two stores (D12).
4. BookingFlow wizard is covered by the shared-helper unit tests, validator and browser pay/cancel flows, but not by a 5-step wizard walkthrough test.
5. Browser journeys use a mocked backend; run against staging with a provisioned buyer, provider and `ghost_checker`.
6. Inspector (A) and provider-staff work surfaces were not redesigned (out of scope); inspector role confusion (D9) remains documented.

## 7. Package
`KAYAD-PRE-PURCHASE-INSPECTION-CONVERGENCE-20261009.zip` (filename, byte size and SHA-256 are given in the delivery message; a file cannot contain its own hash). Command, run from the project root:
`zip -qr ../KAYAD-PRE-PURCHASE-INSPECTION-CONVERGENCE-20261009.zip . -x 'node_modules/*' '*/node_modules/*' 'dist/*' '*/dist/*' '.git/*' '.env' 'backend/.env' '.env.local' '.env.*.local' 'backend/data/uploads.json' '*.log' 'coverage/*' '*/coverage/*' 'test-results/*' '*/test-results/*' 'playwright-report/*' '*/playwright-report/*'`
Fresh-extract validation (zip extracted to a clean directory, dependencies linked): vitest 419/0/1, tsc clean, build OK, `tests/inspection` 3 suites / 9 tests, activation validator 16/16.

---
## Addendum — Automotive Services convergence (2026-10-09; earlier sections unchanged)
Changes touching this report's surfaces: the marketplace finder is taxonomy- and location-aware and truthful (no rating/price sort, "No reviews yet"); the shipped marketplace API calls had been going to `/api/api/...` and now resolve (guarded by `transportPaths.test.ts`); the provider application modal declares services via the canonical taxonomy; inspection reports show "carried out by {business}". Validators: `validate-inspection-marketplace.mjs` updated to the new code locations (eligibility check is stricter). Counts: FE 455/0/1, BE Jest 770, validators 164/10 (baseline set), browser 66/66 + 50/50.
