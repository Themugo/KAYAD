# KAYAD AUCTION 360 — Stage 5: Inspection Architecture Convergence
**Date:** 2026-10-08
**Scope:** Map every inspection-related backend/frontend surface, resolve the
"legacy vs canonical inspection system" question the Stage 2–4 carried-forward
list has flagged since Stage 2, and state plainly whether any production
journey crosses an unsafe boundary between systems.

## 1. The critical question, answered directly

**There is no dangerous, accidental split between two divergent
implementations of the same feature.** There are two genuinely **distinct
products** that both use the word "inspection," co-located under one Express
router file and under the single `/api/v1/inspections` + `/api/inspection(s)`
route prefixes. Confirmed by reading the routers, controllers, services,
models and the project's own `validate:canonical-architecture` script
directly — not inferred from naming.

| | **"Ghost Check" pre-purchase inspection** | **Inspection Marketplace / Provider Operations** |
|---|---|---|
| What it is | KAYAD's own buyer-protection inspection, tied to one specific marketplace/auction listing | A third-party inspection-provider booking marketplace (any certified provider, identified by vehicle VIN/registration, not necessarily a KAYAD listing) |
| Canonical table | `vehicle_inspections` (`InspectionOrder` model) | `inspection_bookings`, `inspection_providers`, `inspection_packages`, `inspection_staff`, `inspection_reports`, `inspection_status_history`, `inspection_checklist_items`, `inspection_disputes`, `inspection_reviews`, `inspection_quality_audits`, `inspection_report_amendments` |
| Controller(s) | `backend/inspection/controllers/legacyCompatibilityController.js` | `backend/inspection/controllers/providerController.js` (+ `phase22Controller.js` for a later payments/disputes extension) |
| Service layer | inline in the controller + RPCs (`kayad_bridge_inspection_execution`, `kayad_get_or_create_inspection_chat`) | `bookingService.js`, `reportService.js`, `providerService.js`, `settlementService.js`, `workforceService.js` via `dbAdapter.js` |
| Mounted at | `/my`, `/order`, `/confirm-payment`, `/available-inspectors`, `/car/:carId`, `/:id`, `/:id/assign`, `/:id/start`, `/:id/submit` (all inside `backend/inspection/routes/inspectionRoutes.js`, under its own "LEGACY API COMPATIBILITY" section) | `/providers`, `/providers/:providerId[...]`, `/bookings[...]`, `/categories`, `/reports/:reportId`, `/provider/:providerId/...` (same router file, different section) |
| Frontend consumer | `src/services/inspectionApi.ts` → `src/features/InspectionsView.tsx`, `src/pages/inspector/*` | `src/features/InspectionMarketplace/*` (own `services/api.ts`) |
| Identity key | `car_id` (hard-bound to a KAYAD listing) | `vehicle_vin`/`vehicle_registration` (free text, no KAYAD listing FK) |

Both route sections live in the **same** file,
`backend/inspection/routes/inspectionRoutes.js`, and both are reached through
the exact same three mount points in `backend/server.js`/`backend/routes/v1.js`.
That router-file co-location is itself the only real finding here: it is a
clarity/maintainability risk (an engineer skimming "inspection routes" sees
one undifferentiated list), not a live correctness defect — the two systems'
path spaces do not currently collide (verified by reading every route
registration in order; the generic legacy `/:id` catch-all is registered
**after** every Marketplace-specific path, so no shadowing is possible), and
`validate:canonical-architecture` already asserts and passes "no second
inspection router implementation is mounted" / "single canonical inspection
router import" — i.e. a prior stage already collapsed what would have been
the actually-dangerous version of this split (two different Express routers
competing for the same paths) into one file. **Recommendation, not
executed this stage** (no master-prompt requirement forces it, and splitting
files is a pure refactor with no behavior change): split
`backend/inspection/routes/inspectionRoutes.js` into
`legacyGhostCheckRoutes.js` and `providerMarketplaceRoutes.js`, re-exported
from the current file, so the next engineer sees two products instead of one
undifferentiated 160-line list. Filed as a documentation/clarity
recommendation in the remaining-plan, not a defect.

## 2. "Legacy" naming does not mean a legacy data model

`backend/inspection/controllers/legacyCompatibilityController.js`'s own
in-code comment states plainly: *"These aliases preserve existing client
contracts while delegating to the canonical `vehicle_inspections` execution
record. No legacy model or digital-inspection storage is used."* Confirmed
true by reading every function in that file — every read/write goes through
`vehicle_inspections`. The dead `Inspection`/`InspectionPackage`/`Inspector`
models in `backend/models/` map to bare `inspections`/`inspection_packages`/
`inspectors` tables that **no controller imports** (`grep` across
`backend/controllers`, `backend/inspection`, `backend/inspectionBusinessCenter`
confirms zero controller-level references); the only live readers of the bare
`inspections` table name are `reminderAutomationService.js` and
`intelligenceService.js`, both of which the Stage 3/4 passes already left
untouched and which read-only aggregate across it for reminders/analytics —
not a write path, and not reachable from any customer or provider surface.
These three dead models are the actual "legacy" artifact in the strict sense
(unused code pointing at tables with no live writer); they are not fixed or
removed this stage because doing so is out of this stage's scope (dead-code
removal, zero customer impact, no regression risk either way) and because
`inspection_packages`/`inspectors` as table *names* collide with the
Marketplace system's own `inspection_packages`/`inspection_staff` naming only
coincidentally — confirmed by schema (`inspection_packages` the Marketplace
table is defined with `provider_id`/`is_active`/pricing columns in
`backend/db/inspection.schema.sql`; the dead `InspectionPackage` model has no
schema file backing it at all — it is an orphaned model with no real table
behind it in this checkout).

## 3. Evidence / cross-boundary risk

Checked explicitly per the master prompt's own concern: can evidence,
documents, or identity ever leak from one system into the other, or between
two unrelated parties within the same system?

- **Ghost Check evidence** (`checklist`, `evidence`/images, `inspector_notes`,
  `overall_score`) lives on the `vehicle_inspections` row itself, gated by
  `assertAccess()` (admin, the requester, or the assigned inspector only) on
  every read (`getById`) and by role/ownership checks on every write
  (`assign`/`start`/`submit`). No cross-read into the Marketplace tables
  exists anywhere in this controller.
- **Marketplace evidence** (`inspection_reports`, `inspection_checklist_items`,
  PDF artifacts) is gated by `reportService.getReportDetails()`'s
  `isAdmin`/`isCustomer`/`isProvider` check against `booking.customer_id`/
  `booking.provider_id`, and provider-side routes additionally require
  `requireProviderOwnership` (a Stage-prior fix; re-verified this stage — see
  `backend/inspection/middleware/requireProviderOwnership.js`'s own
  documented rationale and confirmed still applied to every
  `:providerId`-parameterized route in the router file). PDF delivery itself
  is already covered by the existing, passing
  `validate:high-risk-boundaries` checks ("private Cloudinary uploads use
  authenticated delivery" / "signed delivery URLs").
- **Chat bridging**: the Ghost Check flow's `kayad_get_or_create_inspection_chat`
  RPC and `server.js`'s `joinInspection` socket handler both re-check
  `[inspection.requester_id, inspection.inspector_id]` membership before
  allowing a socket to join an inspection's chat room — re-verified this
  stage by reading `server.js` lines ~702–718 directly; this is the same
  participant-authorization the already-passing
  `validate-inspection-chat-realtime-e2e.mjs` script asserts ("inspection
  socket room is participant-authorized" — PASS).
- Two real, fixable gaps **were** found in the Ghost Check boundary itself
  (not a cross-system leak, but a same-system authorization gap) — see
  `INSPECTION_PROVIDER_OPERATIONS_AUDIT_20261008.md` §2 for both, fixed and
  tested this stage.

## 4. Conclusion

No "ARCHITECTURE MIGRATION REQUIRED" declaration is warranted. The two
systems are intentionally distinct products, already correctly isolated at
the table, model, service, RLS (`validate:inspection-domain-rls-enablement`:
8/8 tables PASS) and router-mounting level (`validate:canonical-architecture`:
10/10 PASS), with no production journey crossing between them. The one
dead-code remnant (bare `Inspection`/`InspectionPackage`/`Inspector` models)
is carried forward as a documented, zero-risk cleanup item, not a migration.
