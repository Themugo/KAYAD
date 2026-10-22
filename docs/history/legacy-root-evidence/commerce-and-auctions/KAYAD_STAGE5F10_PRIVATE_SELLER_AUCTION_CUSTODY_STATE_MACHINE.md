# KAYAD Stage 5F.10 — Private-seller auction verification & custody state machine

Single writer: `kayad_psap_apply_event(proposal, event, actor_user, actor_role, payload, idempotency_key)` (SECURITY DEFINER, `service_role` only). Every accepted event appends one row to `private_seller_auction_evidence_events` (append-only; UPDATE/DELETE/TRUNCATE blocked by trigger). Replaying the same `(proposal, idempotency_key)` returns the original result and writes nothing.

## Who is a "private seller" (classification)
`cars.dealer_id → users.id`. A vehicle is **exempt** from the gate only if its owner's `users.role` is `dealer` or `broker`. Every other owner (individual seller, plain user, staff, unknown, NULL) is gated — fail-closed. No exception policy exists (OD-13).

## Eligibility = ALL of the following (evaluated by `kayad_private_seller_gate`, the only definition)
1. A proposal exists for the car, owned by the car's current owner, owner not banned/deactivated.
2. Seller authority verified by an admin (`authority_verified_at`).
3. `proposal_status = approved` **and** `approved_proposal_version = proposal_version` **and** `approved_evidence_version = evidence_version` (a new evidence version invalidates an older approval).
4. Payment: the linked `inspection_bookings` row is `payment_status = 'fully_paid'` with `paid_at`, same vehicle, same customer (the seller), not cancelled/refunded. Payment is set only by the verified M-Pesa callback path; a browser redirect or client payload cannot satisfy it.
5. `verification_status = passed`, report belongs to that booking, inspection assigned to an active+verified inspection provider, and (if the provider set one) `inspection_valid_until` not past.
6. Custody: `custody_status = in_custody` with receipt time, receiving user, VIN **and** registration confirmed against the vehicle on record.
7. Custody partner has an **active** `vehicle_custody_capabilities` row (kind garage/dealer; approved by an admin; insurance not expired; the custody location is in the approved premises; partner still in good standing).
8. No unresolved appeal; custody not on hold / refused / released.

## Proposal lifecycle
```
draft ──evidence_submitted(seller)──▶ draft (evidence_version+1)
draft/changes_requested ──proposal_submitted(seller)──▶ submitted (verification → awaiting_payment)
submitted…changes_requested ──inspection_assigned(seller|admin; booking must be fully_paid, single-use)──▶ verification: assigned
assigned ──inspection_result(assigned inspection provider)──▶ passed  (proposal → under_review)
                                                          ├─▶ failed / inconclusive (proposal → changes_requested)
failed|inconclusive|expired ──reinspection_requested(seller; no pending appeal)──▶ awaiting_payment (new booking required; evidence_version+1)
passed ──inspection_expired(admin)──▶ expired (approval reverts to under_review)
submitted|under_review ──admin_decision(admin)──▶ approved | rejected | changes_requested   (approve needs passed + in_custody + authority + no appeal)
rejected | failed | inconclusive ──appeal_submitted(seller)──▶ appeal submitted
appeal submitted ──appeal_decision(admin)──▶ upheld | overturned   (overturned ⇒ changes_requested; NEVER restores eligibility)
any pre-live ──proposal_withdrawn(seller)──▶ withdrawn   (refused while live or while custody is active)
```

## Custody lifecycle (independent of inspection and of admin approval; escrow is not custody)
```
awaiting_partner ──custody_assigned(admin; partner capability active, premises approved, not the seller)──▶ handover_scheduled
handover_scheduled ──custody_received(assigned partner; VIN+registration match; condition evidence)──▶ in_custody
                                                       └─ VIN/registration mismatch ──▶ incident_hold  (recorded, never accepted)
handover_scheduled|received ──custody_refused(assigned partner, reason)──▶ refused (admin may reassign)
any non-final ──custody_incident(partner|admin, reason)──▶ incident_hold
incident_hold ──custody_hold_released(admin, reason)──▶ back to prior state, approval reverts to under_review, evidence_version+1
in_custody|incident_hold ──release_authorized(admin, reason; auction must not be live)──▶ release_authorized
release_authorized ──vehicle_released(assigned partner; recipient named)──▶ released
```

## Custody capability lifecycle (`kayad_vcc_apply`)
`request` (partner representative only → pending) → `approve` (admin only; approved premises, agreement version, current insurance; not self-approval; partner must be in good standing) → `suspend` / `revoke` (admin, reason) → `approve` with `reinstate`. A suspended or revoked capability makes every proposal using it ineligible **immediately** (the gate reads it, under `FOR SHARE`, in the same transaction as the bid).

## What happens to an auction that is already live when a requirement stops being true
Bids and the paid bid-confirmation path are refused in-database (the paid KES-1 confirmation is still recorded for financial integrity but is not applied to the market, `applied_to_market = false`); the auction disappears from public lists/detail/room/sitemap. It is **not** auto-cancelled (OD-12).

## Hard invariants enforced by CHECK / unique constraints
`in_custody` ⇒ receipt, receiver, partner present; `approved` ⇒ decision recorded; `passed` ⇒ report present; one open proposal per car; capability `active` ⇒ approved by someone.
