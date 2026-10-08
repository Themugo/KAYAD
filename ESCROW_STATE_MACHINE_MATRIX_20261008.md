# KAYAD AUCTION 360 — Stage 6: Escrow State Machine Matrix
**Date:** 2026-10-08
**Source:** `backend/services/escrowStateMachine.js` (canonical in-process guard)
+ `kayad_transition_escrow_atomic` (canonical Postgres RPC — the actual
financial authority; the JS module's `validateTransition` is a fast,
duplicate pre-check used by `closeEscrow`, not a second source of truth).

States (actual repository values, not invented): `pending`, `funded`,
`vehicle_confirmed`, `delivered`, `disputed`, `refunded`, `released`,
`closed`. Terminal: `refunded`, `closed`.

| Current | Action | Next | Actor | Authorization | Idempotent | Evidence |
|---|---|---|---|---|---|---|
| (none) | `createEscrow` | `pending` | System (payment-initiation controller) | internal call only, no client-facing creation route | Not applicable — see Phase 7 findings below | `escrow.service.js::createEscrow` |
| `pending` | `fundEscrow` | `funded` | System (payment-success callback) | `role: "system"` only in the state-machine's role table | Yes — idempotent ledger posting by external reference (`recordEscrowDeposit`); re-run converges on one deposit, not a duplicate | `escrow.service.js::fundEscrow`, `escrowStateMachine.js` TRANSITION_ROLES |
| `funded` | `confirmVehicleHandler` → `confirmVehicle` | `vehicle_confirmed` | Buyer (or admin) | `isEscrowBuyer`/`canActAsEscrowAdmin` at the route; `role: "buyer"`/admin in the state machine | Yes — DB-level FROM/TO guard rejects a repeat from a non-`funded` state | `escrowController.js::confirmVehicleHandler` |
| `funded` | auto-release | `released` | System (cron) | `role: "system"`; GUARD requires `autoReleaseEligibleAt` set and in the past | Yes — keyed `auto-release:<escrowId>` | `escrow.service.js::autoReleaseEscrow`, `escrowCron.js` |
| `vehicle_confirmed` | `confirmDelivery` → `deliverEscrow` | `delivered` | Seller (or admin) | `isEscrowSeller`/`canActAsEscrowAdmin` at the route; `role: "seller"`/admin in the state machine | Yes — DB-level FROM/TO guard | `escrowController.js::confirmDelivery` |
| `vehicle_confirmed` | auto-release | `released` | System (cron) | Same auto-release guard as above | Yes | `escrow.service.js::autoReleaseEscrow` |
| `delivered` | `releaseEscrow` (controller) → `releaseEscrow` (service) | `released` | Admin only | `canActAsEscrowAdmin` at the route; `role: "admin"` hardcoded in the service, re-checked by the DB function | **Yes, explicitly re-verified this stage** — `idempotencyKey` passed through; a repeat admin release request for the same escrow resolves against the same cached response, and the DB transition itself is a FROM/TO guard too, so a double-release cannot post a second seller-settlement/commission ledger entry even without the idempotency cache | `escrow.service.js::releaseEscrow` ("the database transition is the sole financial authority for release... do not post a second application-side ledger event") |
| `funded`/`vehicle_confirmed`/`delivered`/`pending` | `disputeEscrow` | `disputed` | Buyer, seller, or admin | role check in state machine; route-level check in `escrowController.js::disputeEscrow` | Yes by construction (DB FROM/TO guard) | `escrow.service.js::disputeEscrow` |
| `disputed` | `refundEscrow` (controller) → `refundEscrow` (service) | `refunded` | Admin only | `canActAsEscrowAdmin`; reason required (min 10 chars) at the route | Yes — `idempotencyKey` passed through; DB FROM/TO guard additionally rejects a repeat from a non-`disputed` state | `escrowController.js::refundEscrow` |
| `disputed` | admin resolves in seller's favor | `released` | Admin only | same as the direct release path | Yes | `escrowStateMachine.js` TRANSITION_ROLES |
| `released` | `closeEscrowHandler` → `closeEscrow` | `closed` | Admin (or system) | role check; re-verified via `validateTransition` *and* the atomic DB transition (explicitly chosen over a direct document update specifically to avoid a race with a concurrent release/dispute — see the in-code comment) | Yes | `escrow.service.js::closeEscrow` |
| `released` | re-dispute | `disputed` | Admin only | role check | Yes by construction | `escrowStateMachine.js` TRANSITION_ROLES |
| `refunded`, `closed` | (terminal) | — | — | — | Yes — `TERMINAL` set checked first in `validateTransition`, and the DB function's own FROM/TO table has no exit rows for these two statuses | `escrowStateMachine.js::TERMINAL` |

## Companion: Purchase-outcome / ownership-completion state machine

Escrow release triggers a second, cooperating state machine
(`purchase_outcomes`, driving fulfilment/collection/ownership transfer),
kept deliberately separate from escrow's own states (escrow tracks the
*money*; purchase_outcomes tracks the *vehicle and its paperwork*).

| Current | Action | Next | Actor | Authorization | Idempotent | Evidence |
|---|---|---|---|---|---|---|
| `payment_received` | escrow released (sync) | `ready_for_collection` | System (escrow-release sync hook) | n/a (system-to-system) | Yes — `kayad_transition_purchase_outcome_atomic` row-locks the outcome and checks an explicit FROM/TO allow-list | `marketplaceFulfilment.service.js::syncPurchaseOutcomeFromEscrow` |
| `ready_for_collection`/`payment_received` | `markCollection(collected)` | `collected` | Seller (or admin) | `assertSeller` | Yes — DB allow-list rejects a repeat from a non-eligible state | `marketplaceFulfilment.service.js::markCollection` |
| `collected` | `markTransfer(initiated)` | `transfer_pending` | Seller (or admin) | `assertSeller`; precondition `collection_status==='collected'` | Yes | `marketplaceFulfilment.service.js::markTransfer` |
| `transfer_pending` | `markTransfer(completed)` | `completed` | Seller (or admin) | `assertSeller` | **Yes, explicitly re-verified this stage** — both at the application level (`existing` lookup before creating a second `owner_vehicles` garage row for the same buyer/VIN) and at the DB level (`completed -> completed` is an explicit allowed no-op transition; `transferred_at`/`completed_at` are set only once via `IS NULL` guards) | `marketplaceFulfilment.service.js::markTransfer`, `kayad_transition_purchase_outcome_atomic` |
| `completed` | (terminal for the happy path) | — | — | — | Yes | same migration |
| any non-terminal | dispute/refund | `disputed`/`refunded` | System (escrow-driven) or admin | same sync hook | Yes | `syncPurchaseOutcomeFromEscrow` |

**Fixed this stage:** the `payment_received`→released sync step did not
previously touch the `cars` row at all. See
`ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md` §2, Finding 2.
