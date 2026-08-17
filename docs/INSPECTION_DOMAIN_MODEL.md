# KAYAD INSPECTION DOMAIN MODEL - MAPPING AND CORRECTIONS

Companion document to migration 20260816200000_inspection_domain_model_corrections.sql.sql.
Every one of the 20 required domain concepts mapped against the real schema before any change was made.

---

## Mapping Table

| # | Concept | Existing table/model | Extend or new? |
|---|---|---|---|
| 1 | Provider | inspection_providers | Exists - KEEP |
| 2 | Provider credentials/verification | provider_credentials + inspection_providers.verification_status | Exists - KEEP |
| 3 | Provider specialization | inspection_providers.inspection_types/vehicle_types | Exists - KEEP |
| 4 | Provider service area | inspection_providers.county/town/latitude/longitude/service_radius_km | Exists - KEEP |
| 5 | Provider availability | inspection_providers.business_hours/weekend_available/same_day_available, computed against existing bookings by bookingService.js's real slot-generation logic | Exists - KEEP |
| 6 | Inspection service | inspection_packages | Exists - KEEP |
| 7 | Provider-defined pricing | inspection_packages.price/currency | Exists - KEEP |
| 8 | Inspection request | Gap found: inspection_bookings.provider_id was NOT NULL - no way to represent "buyer wants an inspection, hasn't picked a provider yet" | EXTENDED - provider_id made nullable, new 'requested' status, CHECK constraint enforces the rule |
| 9 | Inspection booking | inspection_bookings | Exists - KEEP (same table as #8, different lifecycle stage) |
| 10 | Inspection transaction | inspection_transactions | Exists - KEEP |
| 11 | Inspection | No separate entity - inspection_bookings.status carries the execution lifecycle (inspection_started, inspection_complete) as later stages of the same row | Deliberately not duplicated - see reasoning below |
| 12 | Inspection checklist | inspection_checklist_items | Exists - KEEP |
| 13 | Inspection findings | inspection_reports.findings/critical_issues/recommendations (JSONB) | Exists - KEEP |
| 14 | Inspection evidence | inspection_reports.photos + inspection_checklist_items.photos (JSONB URL arrays) | Exists - KEEP (sufficient for the locked business model's requirements; a dedicated chain-of-custody table would be over-building beyond what was asked) |
| 15 | Inspection report | inspection_reports | Exists - KEEP |
| 16 | Inspection report version/history | Confirmed gap (already flagged in the forensic audit, re-verified directly here) - no locking or version columns existed | EXTENDED - is_locked/locked_at/locked_by/version added to inspection_reports; new inspection_report_amendments table for the controlled-amendment half of business rule #15 |
| 17 | Provider payout | inspection_settlements | Exists - KEEP |
| 18 | Refund | inspection_transactions could record a transaction_type: 'refund', but had no dedicated, attributed, auditable workflow | NEW TABLE - inspection_refunds (see reasoning below) |
| 19 | Dispute | Confirmed still missing - re-verified directly, no inspection-scoped dispute table exists anywhere | NEW TABLE - inspection_disputes |
| 20 | Provider review | inspection_reviews | Exists - KEEP |
| 21 | Inspection review | Same table as #20 (inspection_reviews already links both provider_id and booking_id) | Not a duplicate - one review of a specific booking/inspection, which rolls up to the provider's aggregate rating |
| 22 | Report access | inspection_reports.share_token/share_expires_at/is_shared | Exists - KEEP (sufficient for the named concept; the locked business model does not name access-audit-logging as a requirement, so none was added) |
| 23 | Inspection audit events | inspection_status_history | EXTENDED - generalized with nullable entity_type/entity_id columns so it can audit reports/refunds/disputes/settlements, not only bookings |

(Numbering above follows the order concepts were listed in the request; some numbers do not map 1:1 to the 20 count since "Inspection request"/"Inspection booking" and "Provider review"/"Inspection review" are each one real table serving two named concepts.)

---

## Why "Inspection" Was Not Given Its Own Table

The locked business model lists "Inspection" as a concept distinct from "Inspection booking." Considered directly, not assumed: a physical inspection event has a 1:1 relationship with exactly one booking - it doesn't exist independently, isn't created before a booking exists, and isn't referenced by anything that isn't already reachable via booking_id. Splitting it into a separate table would mean every report/checklist-item/transaction/review either duplicates the booking reference or requires an extra join to a table that adds no real information beyond "this booking reached its execution phase" - already fully expressed by inspection_bookings.status values inspection_started/inspection_complete. Per this task's own "do not create duplicate entities" instruction, this was documented as a deliberate non-change, not silently skipped.

## Why Refunds Got a Dedicated Table

inspection_transactions already has a transaction_type column broad enough to record 'refund' as a ledger entry. That satisfies "a refund happened" but not business rule #11 ("financial records must be auditable") for the refund process specifically - who requested it, who approved it, why, and what state it's currently in (pending/approved/rejected/processed) aren't representable in a single ledger-entry row without overloading that table's purpose. inspection_refunds is the dedicated record of the refund decision and its approval trail; inspection_transactions gained a nullable refund_id so the resulting ledger entry (once processed) links back to the refund that caused it, rather than the two being merged into one overloaded table.

## Confirmed: Commission Is Genuinely Configurable (Business Rule #12)

Checked directly, not assumed: every commission calculation in settlementService.js reads provider.commission_rate from the real inspection_providers table, falling back to a 15% default only when a specific provider's rate is genuinely unset. This is correct, intentional behavior (a sensible default, not a hardcoded rule) - confirmed real, no change needed.

## Confirmed: No Vehicle-Purchase Escrow Coupling (Business Rules #13/14)

Re-verified directly against every new table added this pass: none references escrows or any vehicle-purchase-payment table. inspection_disputes and inspection_refunds are both scoped exclusively to inspection_bookings - the boundary already confirmed clean in the prior activation migration remains clean here.

---

## Schema Changes Made

Extended (no data loss, no existing row affected beyond newly-nullable columns defaulting correctly for existing rows):
- inspection_bookings.provider_id: NOT NULL to nullable, with a new CHECK constraint (chk_inspection_bookings_provider_required) enforcing it can only be null when status = 'requested'.
- inspection_reports: added is_locked, locked_at, locked_by, version.
- inspection_status_history.booking_id: NOT NULL to nullable; added entity_type, entity_id.
- inspection_transactions: added nullable refund_id.

New tables (purely additive):
- inspection_report_amendments - one row per controlled amendment to a locked report (who, when, why, what changed).
- inspection_refunds - the refund request/approval/processing workflow.
- inspection_disputes - inspection/booking-scoped disputes, explicitly separate from any vehicle-purchase-escrow concept.

Application code:
- backend/inspection/services/bookingService.js: two new methods, createRequest() (creates a 'requested'-status booking with no provider, satisfying business rule #9's "must belong to a buyer and vehicle" without requiring rule #4's provider selection yet) and selectProviderForRequest() (the request to booking transition, writing a real inspection_status_history audit row). No existing method in this file was changed - createBooking() (the direct provider-already-chosen path) remains exactly as it was.

Not changed, deliberately: no new controller endpoints or routes were added to expose createRequest/selectProviderForRequest over HTTP. Per this task's "implement the minimum necessary" instruction, this pass focused on correcting the domain model itself (schema + the service-layer methods that operate on it); wiring a new request-flow UI/API surface on top of it is a distinct, larger scope than a domain-model correction pass, and is named here as the natural next step rather than attempted in this same commit.

---

## Verification

| Check | Result |
|---|---|
| Migration applied against a real, running PostgreSQL 16 database (reusing this program's existing test infrastructure) | Success - 0 errors, table count went from 47 to 50 |
| CHECK constraint (chk_inspection_bookings_provider_required) tested directly | Confirmed: a 'requested' booking with no provider inserts successfully; any other status with no provider is correctly rejected |
| Backend syntax validation (node --check, every file) | 0 errors |
| Backend unit test suite (Jest) | 216/216 passing - confirms no regression |
| Existing data | Preserved - every change is additive (new nullable column, new table, or a loosened not tightened constraint); no row was deleted or transformed |
