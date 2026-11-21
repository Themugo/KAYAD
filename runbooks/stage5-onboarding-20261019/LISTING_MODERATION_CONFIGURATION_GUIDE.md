# Listing moderation — configuration guide

## Setting
Settings → Onboarding → **Listing moderation**: `hold_for_review` (launch default) or `auto_publish`.

| Event | hold_for_review | auto_publish |
|---|---|---|
| New listing by approved seller account | `pending` | `available` |
| New listing by unapproved seller account | `pending` | `pending` |
| Policy unreadable/damaged | `pending` | `pending` (treated as hold) |
| Dealer approved | pending listings stay pending; dealer flagged verified | pending listings published; sold untouched |
| Seller sets own listing to `available` (bulk status / inventory bulk) | refused 403 `LISTING_PUBLICATION_REQUIRES_REVIEW` | allowed only if the seller account is approved |
| Duplicate-listing action | new copy `pending` | new copy `available` only for approved sellers |
Owner and staff moderators are not subject to the self-publication block.

## Status interaction (from `cars_status_check` and every writer/reader)
Allowed today: `available, sold, pending, reserved, hidden, draft`. **`rejected` is not allowed by the database** (decision D3). Consequences, unchanged by Stage 5 and documented:
- `POST /admin/cars/:id/moderate` with `reject` writes `rejected` → fails the database constraint until the migration is applied. Bulk reject writes `hidden`, which **is** a different status from an explicit rejection. Rejection is therefore not yet a fully explicit, auditable status; it becomes one when D3 option A is approved and the prepared candidate is applied.
- The candidate migration `03B_G2_CANDIDATE_cars_status_rejected_LOW_LOCK_NOT_APPLIED.sql` **was rehearsed on a throwaway copy of a local disposable database only** (applies cleanly, re-run is idempotent: `evidence/stage5-20261019/pg/candidate_03B_rehearsal.log`). It is **not applied, not in the migration chain, and not authorized.**
- Sold listings are protected from single moderation (409) and from bulk moderation (skipped with a reason) and cannot be removed by duplicate-handling.

## Who may decide
`Who decides listings` = `owner_only` (default) or `admins`. Applied to single (`/admin/cars/:id/moderate`) and bulk (`/admin/bulk/cars/moderate`) moderation. When settings are unreadable only the verified owner may decide.

## Operating the queue
Admin → Car moderation lists `pending`. Approve → `available`. Reject → see D3 above. Hide → `hidden` (reversible).

## Not changed
Auction, bidding, escrow and payment flows; sold-listing protections; moderation audit records.
