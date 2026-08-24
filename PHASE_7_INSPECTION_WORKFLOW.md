# KAYAD HARDENING — PHASE 7: PRE-PURCHASE INSPECTION WORKFLOW

Scope per instructions: no new inspection features, use the existing domain and business model, one canonical implementation. Everything below was reproduced against a real, migrated PostgreSQL database with a real PostgREST instance in front of it, calling the actual backend code directly - not assumed from reading it.

---

## Resolving "one canonical implementation" - four inspection systems found, one is real

Confirmed by tracing actual imports, not by name alone:

1. **`backend/routes/inspectionRoutes.js` + `InspectionOrder` model → `src/services/inspectionApi.ts` → `src/features/InspectionsView.tsx`** - this is the one, real, canonical, reachable implementation. `InspectionsView.tsx` is the component `App.tsx` actually renders for the `inspections` nav destination (confirmed by this project's own Phase 4 work, which resolved the flat-vs-nested duplicate for this exact domain).
2. **`backend/inspection/` (the "marketplace" system - providers, bookings, reports, settlements, 13 tables)** - real, mounted at `/api/inspection-marketplace`, built and activated in earlier work on this project, but confirmed this phase: the real, canonical `InspectionsView.tsx` never calls it. Zero real frontend consumer exists for it anywhere in the current codebase.
3. **`backend/inspectionBusinessCenter/`** - already confirmed dead in this project's own earlier work; not re-verified this phase, no new information changes that finding.
4. **`src/features/InspectionMarketplace/`** - a complete, previously undocumented frontend feature folder (its own pages: `ProviderBusinessCenter`, `InspectionMarketplacePage`, `BookingFlow`, its own API client) discovered this phase. Confirmed by direct repository-wide search: not imported by `App.tsx` or any other reachable component - completely orphaned from navigation, the same pattern as several findings in this project's own Phase 4 work.

**This phase's work is scoped entirely to system 1** - the one real, reachable, canonical implementation - per the explicit instruction not to add or expand additional inspection products. Systems 2 and 4 are named here as real, substantial, unreachable work, not touched or judged further.

---

## CRITICAL FINDING — the entire real inspection workflow was broken by a single wrong table name

**Reproduced:** the `InspectionOrder` model (used by every one of `inspectionRoutes.js`'s 9 endpoints - order, confirm-payment, my, my-tasks, assign, start, submit, and both single-order lookups) maps to a table named `inspection_orders`. Confirmed directly against the real, migrated database: no such table exists at all. The real table, with the exact matching shape this model expects (car_id, requester_id, inspector_id, status, fee, payment, checklist, overall_score, condition_rating, images, etc.), is named `vehicle_inspections`. Every one of the 9 endpoints would fail with "relation does not exist" on every real request - buyers could not request an inspection, inspectors could not see assignments, admins could not assign anyone, nothing in this entire domain could function.

**A second, related bug in the same fix:** the field-alias table for this model also had 2 wrong entries - `buyer` was aliased to `requested_by` (the real column is `requester_id`), and `payment` was aliased to `payment_id` (the real column is simply `payment`, no suffix).

**Fix:** updated `InspectionOrder`'s table mapping from `inspection_orders` to `vehicle_inspections`, and corrected the 2 wrong field aliases. Not creating a new `inspection_orders` table to match the wrong name - the real, correctly-shaped table already exists; this was a pure naming-mismatch bug, not a missing-schema one, consistent with this phase's own "do not redesign the database" instruction.

**Verified:** reproduced a real `create` and `find` against the real database after the fix - both succeed, returning real, correctly-shaped rows.

---

## State-transition matrix - built and verified against the real, running route logic

Per this phase's explicit instruction to build a state-transition matrix and confirm every invalid transition fails safely. The real route handlers' own transition logic (assign/start/submit in inspectionRoutes.js) was exercised directly against the real, now-fixed database.

| # | Transition attempted | Expected | Actual (verified) |
|---|---|---|---|
| 1 | start while status is paid (before assignment) | fail | 403 "Not your assignment" (no inspector assigned yet, so ownership check itself fails first) |
| 2 | submit while status is paid | fail | 403 "Not your assignment" |
| 3 | assign while status is paid | succeed to assigned | 200, real state change confirmed |
| 4 | assign again on the now-assigned order | fail | 400 "Order must be in 'paid' status" |
| 5 | start by a different inspector than the one assigned | fail | 403 "Not your assignment" - real ownership enforcement, not just status |
| 6 | submit while status is assigned (before start) | fail | 400 "Order not in progress" |
| 7 | start by the correct, assigned inspector | succeed to in_progress | 200, real state change confirmed |
| 8 | start again on the now-in_progress order | fail | 400 "Order not in assigned status" |
| 9 | submit by a different inspector | fail | 403 "Not your assignment" |
| 10 | submit by the correct, assigned inspector | succeed to completed | 200, real state change confirmed |
| 11 | submit again on the now-completed (terminal) order | fail | 400 "Order not in progress" |
| 12 | start on a completed (terminal) order | fail | 400 "Order not in assigned status" |

Result: 12/12 behaved correctly. Once the table-name bug was fixed, the state machine's own logic was already correct and safe - every invalid transition (wrong status, wrong owner, terminal state) is rejected with an appropriate 400/403, and no invalid write reaches the database. This is a genuinely well-built piece of business logic that simply could not run at all before this fix.

---

## Ownership and access control - verified as part of the same trace

- **Buyer ownership** (GET /my): filters strictly by buyer: req.user.id - confirmed via the same, now-working query path.
- **Inspector ownership** (start/submit): confirmed directly in the transition matrix above (tests 5 and 9) - a non-assigned inspector is rejected with 403, not merely a status check.
- **Single-order access control** (GET /:id): real, explicit three-way check (isBuyer/isInspector/isAdmin) before returning any data - not re-executed live this phase (the logic was read directly, matches the same real req.user.id comparison pattern already confirmed working via the transition matrix, but not separately reproduced against the database).
- **Duplicate-request protection** (POST /order): checks for an existing order on the same car by the same buyer in any active status (pending_payment, paid, assigned, in_progress) before allowing a new one - read directly, uses the same $in query-translation path already confirmed correct elsewhere this session (Phase 5's bid-filtering work); not independently re-executed against the database this phase given time.

---

## Not verified or fixed this phase - named directly

- **The real, canonical InspectionsView.tsx frontend makes no real backend calls at all.** Confirmed by direct search: no fetch, no reference to inspectionApi or /api/inspections anywhere in this file. This matches the identical pattern found in this project's own Phase 5 (bidding UI) and Phase 6 (seller listing UI) work - a real, substantial UI with no wiring to the now-confirmed-working backend. Not fixed this phase: this is the same scale of integration work as those two prior findings, and this phase's own critical database-level bug (which would have made any such wiring fail regardless) took priority given the time available.
- **150-point report structure, evidence/media handling, report locking, and rating** - the real, canonical inspectionRoutes.js/InspectionOrder system has none of this: it has a simple checklist/overallScore/conditionRating/images shape with no locking mechanism and no rating field at all. This is not a bug to fix - it is the real, existing business model for the one canonical implementation (system 1 above), and per this phase's own "use the existing inspection domain" instruction, no report-locking or rating capability was added, since doing so would be new functionality, not a fix to something broken. If richer reporting/locking/rating is actually intended, that capability already exists, fully built, in the orphaned system 2 (backend/inspection/) - reconnecting or replacing the canonical system with it is a real, separate architectural decision, not something this phase's "fix existing gaps only" instruction authorizes deciding unilaterally.
- **Payment status vs. inspection status reconciliation**: confirm-payment updates status from pending_payment to paid - read directly, matches the intended flow, but the real M-Pesa callback path that would call it in production was not independently reproduced this phase (the same real, expected boundary found in this project's own Phase 5-continued work - no real Daraja credentials available in this sandbox).
- **Cancellation**: no cancellation endpoint exists anywhere in inspectionRoutes.js - confirmed by direct search. Not a bug fixed here (there is no broken cancellation logic to repair), named as a real gap in the existing business model as implemented.

---

## Files changed this phase

- backend/models/_base.js — fixed InspectionOrder's table mapping (inspection_orders -> vehicle_inspections).
- backend/utils/fieldMap.js — renamed and corrected the field-alias entry for this table (buyer/payment aliases fixed).

No database schema was changed - vehicle_inspections already existed with the correct shape. No frontend files were changed - the frontend disconnection (found, not fixed) is a separate, larger piece of work named directly above, not silently patched over.

---

## Verification

| Check | Result |
|---|---|
| Real InspectionOrder.create()/.find() against a real database | Confirmed working after the fix (was failing with "relation does not exist" before) |
| State-transition matrix (12 cases: valid transitions, invalid status, wrong owner, terminal states) | 12/12 behaved correctly |
| Backend unit test suite | 216/216 passing, unchanged |
| Frontend TypeScript | 0 errors, unchanged |

STOP per instructions — no new inspection features or additional dashboards were added; the existing, single canonical workflow was traced, its blocking defect fixed, and its remaining real gaps (frontend wiring, cancellation) documented rather than expanded upon.
