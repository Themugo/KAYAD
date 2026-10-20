# KAYAD Stage 5F.10 — Identity, permission and approval matrix

Rule that governs everything here: **authority comes from the database row and the verified session, never from the JWT body, a request body, a header, a cookie value or browser state.** The token carries only a user id; `protect` re-reads ban/deactivation/verification/role on every request (5F.5, unchanged). Stage 5F.10 adds that the *claimed capacity* of a request is decided by which endpoint it hits, and PostgreSQL then independently verifies the user really holds it.

## Identities and what each may do on a private-seller auction case

| Identity | How it is established (server/DB) | Create case | Add evidence / submit / withdraw | Link paid booking | Request reinspection / appeal | Inspection result | Custody receive / refuse / release | Authority verify / approve / reject / hold / assign custody | Approve custody capability | Bid |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Private seller (owner of the car, role not dealer/broker) | `cars.dealer_id = users.id` | ✅ own car | ✅ own case, not while live | ✅ own paid booking | ✅ own case | ❌ | ❌ | ❌ | ❌ | ❌ own vehicle |
| Other seller / buyer / plain user | — | ❌ (not owner) | ❌ (404) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ only if gate passes |
| Inspection provider owner / confirmed inspector | `inspection_providers.user_id` or confirmed `inspection_staff`, provider `active` + `verified` | ❌ | ❌ | ❌ | ❌ | ✅ only for the provider on the booking | ❌ unless also the custody partner | ❌ | ❌ | ✅ as buyer if gate passes |
| Custody partner (approved garage or dealer) | provider/dealer identity above **and** an `active` custody capability | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ only for cases assigned to it | ❌ | ❌ (request only) | — |
| Dealer / broker (selling own stock) | `users.role` | exempt from the gate (own stock) | — | — | — | — | — | — | — | ✅ |
| Admin / superadmin | `users.role` re-read by the DB function | ❌ | ❌ | ❌ (DB allows it; API does not expose it) | ❌ | ❌ | ❌ | ✅ (not on a case where they are the seller) | ✅ (not for a partner they own) | — |
| Staff with `manage_auctions` but not admin | role | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (blocked by route role guard and by the DB) | ❌ | — |
| Owner (webhoist) | 5F.4/5F.5 owner mechanism | acts as superadmin | | | | | | ✅ | ✅ | — |
| Anonymous | none | ❌ 401 | | | | | | | | public view only if gate passes |

## Separation of duties actually enforced (all in the database)
* The seller can never approve, verify authority for, or hold their own case; a user who is both seller and admin cannot review their own case (`SELF_REVIEW_FORBIDDEN`).
* A custody partner cannot approve its own capability (`SELF_APPROVAL_FORBIDDEN`); the seller cannot be the custodian (`SELLER_CANNOT_BE_CUSTODIAN`).
* **Admin approval ≠ inspection ≠ custody ≠ escrow.** Each is its own state with its own actor; the gate requires all of them. Escrow capability does not grant custody capability.
* Only the gate-defined approved custodians (approved garages, approved dealers with explicit active capability) can hold vehicles. Inspection-only partners cannot (tested with a "rogue" inspect-only garage).

## Approval invalidation
A new evidence version, a lifted custody hold, an expired inspection, a new inspection assignment, or an overturned appeal returns the case to review and the stored `approved_*_version` no longer matches — the gate fails until an admin approves again.

## What this stage deliberately did not decide (still open)
OD-1…OD-7 (5F.5) and OD-8…OD-16 (see the defect register). In particular no maker-checker requirement between two different admins was invented (OD-6/OD-15), and no refund rule was invented (OD-10).
