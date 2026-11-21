# Dealer listing lifecycle

Canonical states use the existing `cars.status` values: **Draft** `draft` → **Active** `available` → **Paused** `hidden` → **Sold** `sold` (terminal, read-only). `pending`, `reserved` and `rejected` stay owned by their own workflows (verification, sale / escrow, moderation).

| Action | From | To | Writer | Refused when |
|---|---|---|---|---|
| Publish | draft, hidden | available | `kayad_dealer_listing_lifecycle_atomic(..,'publish')` | sold, reserved, rejected, removed, auction / bids, escrow, purchase outcome, accepted-offer settlement |
| Pause | available | hidden | same, `'hide'` | not published, plus the same locks |
| Mark sold | available, hidden, draft, pending | sold (`sold=true`, `sold_at=now()`) | same, `'mark_sold'` | already sold (`ALREADY_SOLD`), funded escrow or active purchase (`TRANSACTION_LOCK`), accepted offer awaiting payment or paid (`OFFER_SETTLEMENT_LOCK`), auction / bids (`AUCTION_OR_BID_LOCK`), reserved / rejected |

All checks and the write happen under `SELECT … FOR UPDATE` on the car row in one transaction; the audit and sale record (`dealer_listing_lifecycle_events`: actor, actor type owner / staff, previous and next status, sale price, buyer name, notes) is part of it.
Race protection: the other side (a new escrow, a new offer settlement) takes `FOR SHARE` on the same car row in a trigger and refuses when the owner has already sold the listing. Payment-driven sales (purchase flow) are not blocked.
Sold is read-only: API (409 `LISTING_SOLD_READ_ONLY`) and database (`trg_cars_sold_read_only`). Only `kayad_admin_correct_sold_listing` (admin, reason required, audited) can reopen.
Draft / pending are set by the bulk endpoint with direct, guarded updates (never on sold, reserved, rejected or foreign rows).
**Not done:** a Pause / Publish button in the dealer dashboard UI (the backend and bulk API support it; see OPEN-ISSUES D-3).
