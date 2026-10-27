# Phase 14.8 - Soft-deleted listings and deletion-state protection
Evidence: `logs/softdelete-probe-before.json` vs `logs/softdelete-probe-after.json`, `logs/db-e2e-inventory-team.txt`.

## Exposures confirmed on the real DB (before) and fixed
| Surface | Before | After |
|---|---|---|
| `/api/cars/my-listings`, `/api/cars/dealer/my-cars`, `/api/dealer/cars` (+ counts/top/wholesale), `/api/dealer-platform/inventory`, dashboard | returned soft-deleted rows | excluded |
| Owner edit / add photo / remove photo of a deleted listing | 200 (could change deleted rows) | 404, nothing written (staff keep access) |
| Favorite / click on deleted listing | accepted | 404 |
| `POST /api/dealer/cars/bulk-delete` | **hard-deleted** rows, bypassing every guard | guarded soft delete; blocked rows reported in `skipped`; 409 `LISTING_DELETE_BLOCKED` when none deletable |
Public list/detail/search/sitemap/auction detail already excluded deleted rows (verified, 404). Admin `Car.softDelete` and historical admin access are unchanged. Phase 13K public allowlist untouched.

## "Reserved"
`status='reserved'` is set by the sale/escrow flow and released only by that flow (this phase does not change it). Deleting a reserved listing would orphan a buyer's commitment, so the dealer delete path now refuses it: 409 `{code:"LISTING_DELETE_BLOCKED", reason:"LISTING_RESERVED"}`; admin/staff soft-delete unchanged. Sold, live/ended auction and bid protections preserved; the conditional write includes `reserved` so a reservation committed during the delete causes a 409 (tested with a real row-lock race, as is a bid counter). Repeat delete is idempotent 200; non-owner 403 without revealing state; unauthenticated 401; missing CSRF 403; 10 concurrent deletes -> one deletion stamp.
No auction/bidding/deposit/payment/escrow/ledger/settlement code was modified. Release of reservation by an owner/admin is not implemented: **product decision needed** if dealers should be able to cancel a reservation themselves (it belongs to the escrow flow, a protected area).
The dashboard already shows the server's 409 message and hides Remove for sold; no frontend change was needed for server authorization.
