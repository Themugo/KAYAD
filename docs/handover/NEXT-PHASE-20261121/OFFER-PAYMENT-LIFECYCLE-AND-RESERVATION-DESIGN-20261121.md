# Accepted-offer payment lifecycle and reservation — design and verification (2026-11-21)

Supersedes `P2-ACCEPTED-OFFER-TO-PAYMENT-DESIGN.md` (kept for history). Migration: `supabase/migrations/20261121110000_offer_settlement_binding.sql` — **LOCAL-ONLY / UNRELEASED. Do not apply to hosted without separate approval** (it depends on the offer chain and purchase-outcome objects that hosted lacks; see the hosted plan).

## 1. Binding decisions → implementation
| # | Decision | Implementation | Evidence |
|---|---|---|---|
| 1 | 48 h payment window from authoritative acceptance | `kayad_offer_settlement_open` sets `expires_at = now() + interval '48 hours'` **in the database transaction that accepts the offer**; no client clock. Expiry is enforced lazily, with no background job: `kayad_offer_settlement_sweep` runs inside `open` (so a new offer on the vehicle lapses an overdue one first); `begin_payment` lapses an overdue settlement itself; the `payments` guard trigger treats an expired `awaiting_payment` settlement as not binding; and `attachReservations` ignores expired rows when marking a listing reserved. A row can therefore stay `awaiting_payment` in the table after 48 h until the next open/begin_payment/cancel touches that vehicle, but it can no longer reserve, block or bind anyone. | journey 05: window = 48h ± seconds; sweep lapses an overdue settlement |
| 2 | Agreed price binding even if listing price changes | `agreed_amount BIGINT` copied from the accepted offer; immutable trigger (`UPDATE` of amount/buyer/vehicle/offer rejected). Payment amount comes only from the settlement. | journey 05: seller edits `cars.price`, payment still uses agreed amount; direct UPDATE of agreed_amount refused |
| 3 | Accepted offer reserves the vehicle for buyer + settlement | Partial unique index `uq_offer_settlement_active_vehicle` on `vehicle_id` where status in (`awaiting_payment`,`paid`); open is performed inside the accept transaction (atomic with the offer status change). | journey 05: concurrent accepts → exactly 1 active settlement |
| 4 | While reserved: visible, status shown, no competing purchase/settlement, no concurrent acquisition | **Reservation is derived, not stored**: `cars.status` stays `available`; `attachReservations()` adds `reservation:{reserved,state,expiresAt?}` (no buyer identity) to list, detail and search responses; `VehicleDetailModal` shows "Reserved". `paymentController` returns 409 `VEHICLE_RESERVED_BY_ACCEPTED_OFFER` / `OFFER_SETTLEMENT_ALREADY_PAID` for other buyers; `payments` BEFORE INSERT trigger rejects a purchase payment from anyone but the bound buyer for the agreed amount. | journey 05: listing public with `reservation.reserved`, no buyer id; competing payment refused at API and at DB |
| 5 | On payment, advance through the existing lifecycle | The existing `kayad_settle_purchase_payment_atomic` / `purchase_outcomes` chain is reused; `trg_offer_settlement_outcome` marks the settlement `paid` when the payment settles. **No new financial state was added.** Settlement status (`awaiting_payment`/`paid`/`cancelled`/`lapsed`) is a reservation state, not a money state. | journey 05 |
| 6 | Valid cancel or expiry releases and permits renegotiation | `kayad_offer_settlement_cancel` (buyer/seller/staff before payment) and sweep both set the terminal status, free the partial-unique slot and let a new offer be opened; refused once `paid`. | journey 05 + 12 race rounds |
| 7 | Whole KES; reject fractions before acceptance | `offerNegotiation.schema.js` refines both amount schemas to integers (HTTP 422, "whole number of Kenyan shillings"); `kayad_offer_action` re-checks on submit and counter (SQLSTATE 22023); `agreed_amount` is BIGINT. | journey 05: API and DB rejections |

## 2. State machine
`awaiting_payment` → `paid` (payment settled) | `cancelled` (valid cancel) | `lapsed` (48 h elapsed unpaid). `paid` is terminal and can never be released. A payment that arrives **after** lapse/cancel is not discarded: if nobody else holds the vehicle the sale is committed (settlement → `paid`, event `paid` with reason `late_payment`); otherwise the money is flagged with event `refund_required` for staff — never silently dropped.

## 3. Safeguard checklist (directive §3)
| Safeguard | Status | How |
|---|---|---|
| Atomic accept + reserve | VERIFIED (DB) | single `kayad_offer_action` transaction |
| Concurrent offers → one active settlement | VERIFIED | partial unique index; parallel accepts via `qAsync` |
| Accepted amount immutable | VERIFIED | immutability trigger |
| Seller price edit cannot change it | VERIFIED | |
| 48 h server-side | VERIFIED | DB `now()` |
| Expiry/cancel cannot release after payment | VERIFIED | `paid` terminal; 12 race rounds of settle vs cancel vs sweep vs begin_payment, invariant asserted, 0 deadlocks (lock order fixed to car → settlement) |
| Idempotent / duplicate / delayed / out-of-order callbacks | VERIFIED | duplicate and concurrent callbacks, late payment after lapse |
| Only the bound buyer can pay | VERIFIED | API (403) and DB trigger |
| Client amount cannot override | VERIFIED | schema is phone-only (strict) |
| Panic Room payments freeze | VERIFIED | route classified in `featureFreezePolicy`; journey toggles `system_status.isPaymentsActive=false` and observes refusal, then recovery (disposable DB only) |
| Auditable transitions | VERIFIED | `marketplace_offer_settlement_events` (append-only): type, actor, `actor_role` (buyer/seller/system/other), `reason`, timestamp, settlement id |
| Release safe under concurrent cancel/expiry/callback | VERIFIED (see caveat) | race rounds |

Result: `ci-run4/05_offer_payment.log` — **74/74** checks, DB-backed (PG16 + PostgREST + real backend).

## 4. Limitations and residual risks (stated, not hidden)
1. **Seller removal of a reserved listing.** A seller can soft-delete/hide a reserved vehicle; `begin_payment` then cancels the settlement with an audit event. Hard delete is blocked by the FK. A `carDeletionGuard` extension to refuse removal while `awaiting_payment` was considered and **not implemented** — needs an owner decision (a buyer holding an agreed price vs seller's right to withdraw).
2. **Race-test validity not mutation-tested.** The race rounds pass on the fixed lock order, but I did not revert the fix to prove the test fails without it. Treat the deadlock-freedom claim as *observed*, not *proved*.
3. **Real provider path not exercised.** STK push and the real M-Pesa callback are BLOCKED (no sandbox credentials); settlement was driven through the same DB functions the callback invokes. See the provider matrix.
4. **Reservation is derived at read time** (batch lookup, fail-soft): if the lookup errors, the listing shows no reservation flag (the DB trigger still protects the money path).
5. Hosted database lacks the whole offer chain, so none of this runs in production until the migrations are approved and applied in order.

## 5. Files
Backend: `services/offerSettlement.service.js`, `controllers/offerNegotiationController.js`, `routes/leadRoutes.js`, `controllers/paymentController.js`, `controllers/carController.js`, `controllers/searchController.js`, `utils/publicVehicleProjection.js`, `validation/offerNegotiation.schema.js`, `config/featureFreezePolicy.js`, `openapi.yaml`. Frontend: `src/components/VehicleDetailModal.tsx`. Tests: `backend/tests/regression/offerSettlementService.test.js` (9), `ci/db-journeys/05_offer_payment.mjs` (74), guard `scripts/validate-offer-settlement-binding.mjs`.
