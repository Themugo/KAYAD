# PHASE5_INSPECTION_HARDENING.md
KAYAD - Phase 5: Vehicle Inspection Workflow Hardening

---

## 0. Headline: A Third Table-Name-Mismatch Bug, This Time Safely Completable

Auditing the inspection lifecycle, found routes/inspectionRoutes.js is genuinely real, well-built application code - confirmed by direct read, not assumed: real per-buyer duplicate-order prevention, real payment integration, real inspector-assignment state machine (paid to assigned to in_progress to completed, each transition checked server-side), real ownership checks on every inspector action ("Not your assignment" for start/submit), real propagation of inspection results onto the vehicle's trust score, and real buyer/inspector/admin access control on the single-inspection endpoint. This is not the same situation as Phase 4's dealerPlatformController.js finding - this code is real.

But its model pointed at a table that doesn't exist. InspectionOrder mapped to "inspection_orders" - zero matches anywhere in the real, authoritative schema (supabase/migrations/). The real table is vehicle_inspections (defined in gari_motors_full_schema.sql.sql), with a narrower column set (car_id/requester_id/inspector_id/status/scheduled_at/completed_at/report jsonb/notes) than the application code expects.

This is the third instance of this exact bug class found this session (after location/location_city in Phase 6, and the deferred escrow_vaults/organizations findings in Phases 8 and 4). Unlike those two deferred cases, this one was judged safe to complete rather than defer - the core identity/status columns already map cleanly via field aliases, and the additional fields the real application code needs are genuinely additive extensions of a correct table, not evidence of two competing designs (there is no second, parallel "inspection" schema anywhere else in this codebase the way escrow_vaults/escrows or the governance schema/model pair were).

### Fixed
1. TABLE_MAP.InspectionOrder corrected to "vehicle_inspections".
2. FIELD_ALIASES.vehicle_inspections added: car -> car_id, buyer -> requester_id, inspector -> inspector_id, inspectorNotes -> notes (reusing the real table's existing notes column rather than adding a near-duplicate).
3. New migration (20260815080000_vehicle_inspections_complete_columns.sql.sql), purely additive: fee, payment (FK to payments), checkout_request_id, location, checklist (jsonb), overall_score, condition_rating, images (jsonb) - every one of these is a field the already-real /order and /submit handlers already read or write; none were invented for this phase, all were already expected by working application code that simply had nowhere real to persist them.

Deliberately not touched: the existing report jsonb column. No code found in this audit reads or writes it. Removing it would be a separate, unrelated cleanup decision outside this phase's "harden the existing architecture" scope - left in place.

---

## 1. A Second Real Bug Found While Verifying the Fix: payment._id

While confirming the new payment column's foreign-key target, checked inspectionRoutes.js's /order handler's own "payment: payment._id" line against initiatePayment()'s actual return shape (services/paymentService.js) rather than assuming it was correct. initiatePayment() returns { success, mode, checkoutID, payment: <the real payment row>, message } - the row itself is nested under a .payment key. The route's own local variable is also named payment (holding this entire return object), so payment._id was reading a field that doesn't exist on the return object at all (only on the nested row, and even there the real payments table uses id, not _id - confirmed in Fusion Phase 7). Every inspection order's payment reference was silently undefined. Fixed to payment.payment?.id.

---

## 2. State Machine, Permissions, Ownership - Confirmed Solid

Per this phase's own requirements:
- Status transitions: paid -> assigned (admin-only, requires paid) -> in_progress (inspector-only, requires assigned and requester === assigned inspector) -> completed (inspector-only, requires in_progress and same ownership check). Each transition checked server-side before any state change - the frontend cannot determine authoritative status, matching this phase's own explicit requirement.
- Immutable finalized reports: confirmed structurally - /submit requires status === "in_progress"; once completed, a second /submit call fails that same check. No route exists to modify a completed order's findings.
- Buyer/seller/dealer/inspector/admin permissions: buyer sees only their own orders (/my, scoped to req.user.id); inspector sees only their own assignments (/my-tasks, same scoping, correctly self-limiting even with no explicit role middleware); admin-only routes (/, /available-inspectors, /:id/assign) correctly gated; single-order access (/:id) explicitly checks buyer-or-inspector-or-admin before returning anything.
- Evidence/report persistence: real, once the schema fix above is applied - checklist/images/overallScore/conditionRating all now have real columns to persist to.
- Result applied to vehicle: confirmed real - /submit updates cars.trustScore based on the inspection score, and inspector stats (completedChecks) on the users row.

Not found in this audit: explicit "rejected"/"failed" or "rescheduling" states or routes. The real status column is free-text (not a CHECK-constrained enum, confirmed against the schema), so these aren't blocked by the database - but no application code in inspectionRoutes.js currently sets or handles them. Not built this phase (would be a new capability, outside "harden the existing architecture"), flagged as a real, named gap rather than assumed to exist.

---

## 3. Vehicle/Auction/Escrow Consumption of the Authoritative Inspection Record

Per this phase's requirement that these workflows "consume the same authoritative inspection record": confirmed GET /car/:carId (public, returns only completed inspections) is the real, intended integration point for a car's detail page - and confirmed /submit's trust-score update means any workflow reading cars.trustScore (already confirmed real and used elsewhere in this backend, e.g. bid-security scoring) already reflects the inspection outcome indirectly. Not verified this phase: whether the auction or escrow domains have any code that reads inspection data directly (as opposed to indirectly via trustScore) - not found in this audit, not confirmed absent either; named as unverified rather than assumed either way.

---

## 4. Mock Inspection Data - Found, Not Removed, Reasoned Explicitly

Per this phase's "remove any mock inspection data from production paths" instruction: found mock inspection fields in src/data/mockVehicles.ts and src/data/mockEnterpriseData.ts (the file this phase's own brief named directly). Not removed. Reasoning: per Phases 2/3/4's own findings, the frontend's vehicle/inspection UI is not connected to any real backend system at all yet - there is currently no "production path" consuming real inspection data for this mock data to leak into or conflict with. Removing this mock data now, with nothing real built to replace it on the frontend, would break the only currently-working (if entirely simulated) inspection experience in the product, violating this program's consistent principle of not discarding a working mock experience before a real replacement exists. This is recorded as a specific, reasoned deferral, not an oversight.

---

## 5. Certification

Per this phase's closing demonstration requirement (Vehicle -> Inspection -> Report -> Buyer visibility -> Transaction decision, using real persistence):

Can now be certified against real persistence, following this phase's fixes: a buyer can order an inspection (real payment integration, real duplicate-order prevention), an admin can assign a real inspector, the inspector can start and submit a real report (checklist/score/condition/images, now with real columns to persist to), the completed report becomes visible to the buyer via /car/:carId or /:id, and the result is reflected on the vehicle via trustScore. This entire chain was previously non-functional against a real database (the table-name bug), is fixed as of this phase, but remains unverified live - no reachable database exists anywhere in this program's environment, the standing constraint restated at every phase. This certification is evidence-based against the real, corrected schema and the real, already-solid application code - not confirmed by an actual live run.

---

## Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation (node --check, all files) | 0 errors |
| Backend unit test suite (npm test, Jest) | 216/216 passing - confirms all fixes introduced no regression |
| Frontend | Not modified this phase |
| Live migration application | Not possible - no reachable database |

---

## What This Phase Deliberately Did Not Do

- Did not build "rejected"/"failed"/"rescheduling" states - not present in the existing application code, and adding them would be a new capability, not a hardening of what exists.
- Did not remove mock inspection data from the frontend - reasoned explicitly in section 4, not an oversight.
- Did not verify auction/escrow domains' direct consumption of inspection data beyond the trustScore mechanism already confirmed real.
- Did not touch the existing, unused report jsonb column - a separate cleanup decision outside this phase's scope.
