# KAYAD PRE-PURCHASE INSPECTION - FORENSIC AUDIT AND IMPLEMENTATION MAP

No code changed this pass, per this task's own "do not implement major changes yet" instruction. This is audit only.

---

## HEADLINE FINDING: Three Separate, Non-Communicating Backend Systems Exist for the Same Concept

This is the single most important fact in this audit, and everything else below should be read in light of it.

1. backend/routes/inspectionRoutes.js (real, mounted at /api/inspections, already hardened in earlier work on this codebase) - a simple "buyer orders an inspection, admin assigns an inspector" flow. No provider profiles, no commission, no geographic matching, no settlement.
2. backend/inspection/ (2,711 lines: providerController.js, providerService.js, reportService.js, settlementService.js, bookingService.js) - never imported or mounted anywhere in server.js. Architecturally, this is a close, well-designed match for the locked business model: real provider profiles with latitude/longitude/service_radius_km (geographic matching), commission_rate (configurable commission), weekend_available/same_day_available (availability), inspection_types/vehicle_types (specialization/capability), verification_status (verification), a dedicated SettlementService with per-provider commission calculation (provider payout). Confirmed zero coupling to vehicle-purchase escrow anywhere in these files - correctly respects the "escrow is out of scope" rule. Its target tables (inspection_providers, inspection_bookings) do not exist in the real schema - so even if mounted today, it could not persist anything.
3. backend/inspectionBusinessCenter/ (2,104 lines: engineerService.js, dashboardService.js, customerService.js, businessAnalyticsService.js, reportReviewService.js) - also never mounted. Uses yet a third terminology ("engineer") for what the other two call "inspector"/"provider".
4. backend/controllers/inspectorApplicationController.js (real, mounted at /api/inspector-applications) - a genuine, working application/approval workflow that creates a real user with role: "ghost_checker". But it reads/writes isInspector, inspectionSpecialty, locationCity fields on the users table that do not exist in the real schema - confirmed directly. This means listActiveInspectors (the public provider-discovery endpoint) would always return an empty list in production, even after successfully approving inspectors, because the field it filters on (isInspector: true) is never actually persisted.

The frontend (InspectionsView.tsx) connects to none of these four. It runs entirely on mock data (mockInspections.ts), except for the Bookings/Reports tabs connected to system #1 in a prior session, which - per this finding - is the system with the least alignment to the locked business model.

Direct consequence for the "do not create duplicates" rule: the right target to extend is very likely backend/inspection/ (system #2), not system #1 or a new build. It already has the correct shape. It needs its tables created, its routes mounted, and its terminology reconciled with the rest of the codebase - not a rewrite.

---

## A. Existing Architecture

Four parallel, non-integrated inspection-adjacent systems (above). Only two are reachable at all (/api/inspections, /api/inspector-applications); both have real functional gaps. The two most business-model-aligned systems (inspection/, inspectionBusinessCenter/) are entirely dormant.

## B. Existing Inspection Data Model

Real, confirmed-existing tables: vehicle_inspections (car_id, requester_id, inspector_id, status, scheduled_at, completed_at, report jsonb, notes, fee, payment, checkout_request_id, location, checklist jsonb, overall_score, condition_rating, images jsonb), users (has bio/rating/inspections_completed but not isInspector/inspectionSpecialty/locationCity), InspectorApplication (real table, backs the application workflow).

Referenced-but-missing tables: inspection_providers, inspection_bookings (system #2's targets) - confirmed absent from every real migration.

No table anywhere ties an inspection to a review, a dispute, or a settlement/payout record.

## C. Existing Frontend

src/features/InspectionsView/components/InspectionsView.tsx (1,893 lines) - a five-tab "Independent Inspector Marketplace" UI (Marketplace/Packages/Reports/Bookings/Reviews/Coverage). Built entirely around a Mechanic type (name, company, specializations, rating, reviews) with no backend equivalent that's both real and populated. Bookings and Reports tabs connected in a prior session to system #1 (/api/inspections/my) - functional, but honest about missing fields (no categoryScores, no commission, no mechanic company/specialization, since none of that exists on system #1). A separate PrePurchaseInspectionPortal.tsx component also exists, imported but its own scope not traced in this pass.

## D. Existing Backend

Covered in the headline finding. inspectorApplicationRoutes.js also has a genuine admin surface (GET /, GET /:id, POST /:id/approve, POST /:id/reject, all adminOnly) - real, but downstream of the same missing-column issue.

## E. Existing Payment Architecture

System #1 (/api/inspections/order) uses the real, already-hardened initiatePayment() (M-Pesa) - genuinely real payment integration, no commission calculation. System #2's settlementService.js has real, well-designed commission/settlement logic (getProviderCommission, processPayment with commission-rate deduction) but is entirely unreachable and its tables don't exist. No code in any of the four systems touches vehicle-purchase escrow - confirmed directly, the "escrow out of scope" rule is correctly respected everywhere in this domain today.

## F. Existing Admin Architecture

inspectorApplicationController.js's approve/reject/list functions are real and admin-gated. No admin surface exists for system #2/#3's provider or settlement concepts, since neither is reachable.

## G. Existing Provider Architecture

The most fragmented area. Three different data shapes for "who performs an inspection": (1) system #1's bare inspector: {id, name, email} with no profile at all, (2) system #2's rich, unused inspection_providers schema (company, geo, commission, availability - closest to the locked business model), (3) the users.isInspector approach that's real code but non-functional due to missing columns.

## H. Existing Report Architecture

System #1: real checklist/images/overall_score/condition_rating columns on vehicle_inspections, no fixed category schema, no explicit "locked/immutable once submitted" enforcement found in this pass (not exhaustively verified - flagged as MISSING/UNCONFIRMED, not assumed either way). System #2's reportService.js (643 lines) not read in depth this pass, given time - flagged as a specific follow-up before any implementation decision, since it may already contain the durable-report/locking logic the locked business model requires.

## I. Problems Discovered

- Duplicated inspection logic: four parallel systems for one concept (headline finding).
- Conflicting business rules: system #1 has no commission concept; system #2 has real, configurable commission. Only one of these can be authoritative.
- Hardcoded prices: the frontend's three "Inspection Packages" (Ksh 7,500/12,000/15,000) are hardcoded in the UI, not sourced from any backend - conflicts with "providers define their own prices."
- Hardcoded providers: the frontend's 4 named mechanics (Eng. David Kamau, Sarah Ochieng, etc.) are mock data, not real accounts.
- Frontend-only state: the entire Marketplace/Reviews/Coverage tabs.
- Missing backend validation: not exhaustively re-checked this pass beyond what earlier work already confirmed for system #1 (real, server-enforced state machine - still holds).
- Insecure authorization: none newly found this pass; system #1's authorization was already confirmed correct in earlier work.
- Orphaned/dead code: inspection/ (2,711 lines) and inspectionBusinessCenter/ (2,104 lines) - both substantial, both completely unreachable.
- Inconsistent terminology: "mechanic" (frontend) / "inspector" (system #1, #4) / "provider" (system #2) / "engineer" (system #3) - four names for what should likely be one concept.
- Conflicting database models: InspectorApplication + users.isInspector (system #4) vs. inspection_providers (system #2, doesn't exist) are two incompatible designs for "who is a provider."
- Fake/demo data mistaken for production: not found as an active risk - the mock data is clearly separated in mockInspections.ts, not intermixed with real data paths.
- Payment assumptions: system #1 assumes no commission; system #2 assumes a per-provider commission rate. The locked business model requires the latter.
- Vehicle escrow code that should stay out of scope: confirmed correctly absent from all four systems - no violation found.
- Missing relationships: no inspection-to-review link, no inspection-to-dispute link, no inspection-to-settlement link anywhere real.
- Incomplete workflows: listActiveInspectors (system #4) is reachable but structurally guaranteed to return empty results in production, due to the missing-column issue.

## J. KEEP / EXTEND / CORRECT / REMOVE / MISSING Matrix

| Component | Classification | Reasoning |
|---|---|---|
| vehicle_inspections table + system #1 routes/state machine | KEEP | Real, working, already hardened. Order/assign/start/submit lifecycle is sound. |
| inspection/ directory (providerService, settlementService, bookingService, reportService, providerController) | EXTEND | Architecturally the closest match to the locked business model. Needs real tables and route mounting, not a rewrite. |
| InspectorApplication model/routes/controller | CORRECT | The approval workflow logic is real and good; the users.isInspector/inspectionSpecialty/locationCity field usage needs to be corrected to either real columns or redirected to system #2's provider table. |
| inspectionBusinessCenter/ | REMOVE (pending 9-step verification) | Third parallel, unreachable system. Likely genuinely obsolete once #2 is activated - not deleted this pass, since confirming zero real dependents is required first, not assumed from a single pass. |
| InspectionsView.tsx's Marketplace/Packages/Reviews/Coverage tabs | MISSING (backend) | No real backend exists for these yet - correctly left on mock data until system #2 (or its replacement) is real. |
| InspectionsView.tsx's Bookings/Reports tabs | CORRECT | Currently wired to system #1; would need rewiring to system #2 once that's activated, to gain commission/provider-profile data these tabs are missing today. |
| Report locking/immutability | MISSING (unconfirmed) | Not found in system #1 this pass; system #2's reportService.js not yet read in depth - genuine follow-up needed before concluding either way. |
| Dispute/refund handling for inspections | MISSING | No inspection-specific dispute or refund code found in any of the four systems. |
| Inspection-specific reviews | MISSING | The real reviews table is exclusively for dealers (dealer_id NOT NULL) - no inspection/provider review concept exists anywhere. |
| Geographic/availability matching | MISSING (functionally) | Real schema design exists in system #2's dormant provider table; nothing live implements it today. |

## K. Recommended Implementation Order

Not started this pass - a recommendation only, per this task's own "do not implement major changes yet."

1. Read inspection/services/reportService.js and bookingService.js in full (not yet done this pass) - confirm whether they already solve report-locking and scheduling before assuming they need to be built.
2. Decide, as a product decision (not a unilateral code choice): should system #2 (inspection/) become the one real provider/settlement system, with system #1's simpler order-flow either merged into it or retired? This audit's evidence points that direction, but the decision itself belongs to whoever owns the product.
3. If system #2 is chosen: design and add its missing tables (inspection_providers, inspection_bookings or equivalent) via a new, purely additive migration - matching the pattern already used successfully elsewhere in this codebase for a similar missing-table gap.
4. Reconcile InspectorApplication's approval flow to write to the real provider table instead of the non-existent users.isInspector fields.
5. Mount inspection/routes/inspectionRoutes.js (or its corrected equivalent) in server.js.
6. Only then reconnect the frontend's remaining three tabs (Marketplace/Reviews/Coverage) to the now-real backend - the same honest, hybrid pattern already used for Bookings/Reports.
7. Build the missing pieces confirmed genuinely absent: inspection-specific reviews, disputes/refunds, report locking (pending step 1's finding).
8. Run the 9-step dead-code verification on inspectionBusinessCenter/ before any removal.

---

## Build Verification

No source files were modified this pass - audit only. Confirmed the repository still builds and passes its existing checks:

| Check | Result |
|---|---|
| Frontend TypeScript (`tsc --noEmit`) | 0 errors |
| Frontend production build (`npm run build`) | Succeeds |
| Backend syntax validation (`node --check`, every `.js` file including the two dormant `inspection/`/`inspectionBusinessCenter/` directories examined in this audit) | 0 errors |

