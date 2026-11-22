# Dealer workflow matrix (updated)

Status vocabulary (UI) ← stored `cars.status`: Draft ← draft; Active ← available; Paused ← hidden; Under review ← pending; Reserved ← reserved; Sold ← sold. (No stored Rejected.)

| From | Publish | Pause | Mark sold | Edit | Delete |
|---|---|---|---|---|---|
| Draft | → Active if complete (else 422) | 409 already not published | n/a (not published) | yes | per existing rule |
| Active | 409 already published | → Paused | → Sold | yes | per existing rule |
| Paused | → Active ("Republish") if complete | 409 already paused | → Sold | yes | per existing rule |
| Under review | 409 `LISTING_UNDER_REVIEW` (owner decision D-13) | 409 | no | limited | n/a |
| Reserved / auction / bid / transaction / offer settlement | blocked with a lock code (409) | blocked | blocked | per guard | blocked |
| Sold | 409 `ALREADY_SOLD`; read-only (trigger); admin-only correction | 409 | 409 | refused | refused |

Actors: owner via `/api/dealer`; permission-scoped staff via `/api/dealer-platform` (bulk only for pause / publish, D-15). All transitions run in `kayad_dealer_listing_lifecycle_atomic` (row lock). Verified by DB journeys 09, 11, 12 and 34 node:test unit tests. Other workflow rows (leads, offers, escrow, banking, team, inspections) are unchanged from the earlier matrix in `../DEALER-IMPLEMENTATION-20261121/`.
