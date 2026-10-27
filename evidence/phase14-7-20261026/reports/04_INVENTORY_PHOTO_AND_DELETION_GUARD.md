# 04 Inventory, photos and DELETE /api/cars/:id guard (Order 6)
## Guard (new)
`backend/utils/carDeletionGuard.js` defines the rule; `Car.softDeleteGuarded` performs ONE conditional UPDATE (not sold, auction not live/ended, bids_count 0, no highest bidder, not already deleted), so a bid landing between check and write makes the update match zero rows and the handler answers 409. The existing place-bid RPC already locks the car row (FOR UPDATE) and was not touched. No bidding, deposit, escrow, ledger or settlement code was changed.
Responses: non-owner 403; unknown 404; already deleted 200 idempotent (`alreadyDeleted`); blocked 409 `LISTING_DELETE_BLOCKED` with a reason code (LISTING_SOLD, AUCTION_ACTIVE, AUCTION_CLOSED, BIDS_PRESENT). Admin/bulk paths keep the platform `Car.softDelete` (bulk already refuses sold).
Tests: listingDeletionGuard (18: owner, non-owner, unknown, staff, live, ended, bids, highest bidder, sold, stale counter with bid rows, draft, race, idempotent repeat, concurrent), carSoftDeleteGuardedQuery (2). Frontend: sold listings show no Remove button; server 409 reason is surfaced (2 new Vitest).
## Photos and listing audit
Owner-enforced photo add/delete, last-photo rule and soft-delete auditing (14.5-14.6) re-verified by the existing suites; not weakened. Browser flows (create, edit keeps photos, add/remove photo with confirmation, remove listing, empty/error/retry) pass at 1280/768/390.
## Open observations (not changed)
- `Car.findById` does not filter soft-deleted rows, so edit/photo routes can address a deleted listing for its owner. Low impact; recommend a follow-up.
- `reserved` listings are not blocked from deletion (no confirmed financial linkage in the repo).
- Upload-succeeds-then-listing-fails orphan cleanup is not provable without a storage provider; staging item.
