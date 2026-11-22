# Inventory lifecycle (dealer) — state-transition matrix

One status vocabulary, shown identically in the inventory list, filters and notices (`dealerStatusLabel`):

| Stored value | Label shown |
|---|---|
| `draft` | Draft |
| `pending` | Under review |
| `available` | Active |
| `hidden` | Paused |
| `sold` | Sold |
| `rejected` | Rejected |
| `reserved` | Reserved (set by the sale / escrow flow, never by the dealer) |

There is no second status system: the stored column `cars.status` is the only state, and the label map only changes the words.

## Transitions

| From → To | Action | Who | Enforced by | Result when refused |
|---|---|---|---|---|
| Active → Paused | Pause | Owner (`/api/dealer/cars/:id/pause`), staff with `canEditCars` (bulk `/api/dealer-platform/inventory/bulk`) | `kayad_dealer_listing_lifecycle_atomic` (row lock) | 409 `ALREADY_PAUSED`, `LISTING_NOT_PUBLISHED`, `TRANSACTION_LOCK`, `OFFER_SETTLEMENT_LOCK`, `AUCTION_OR_BID_LOCK`, `ALREADY_SOLD`, `LISTING_STATE_LOCKED` |
| Paused → Active | Republish | same | service pre-check (complete listing) + same atomic function | 422 `LISTING_INCOMPLETE` (lists what is missing), 409 `ALREADY_PUBLISHED`, plus the locks above |
| Draft → Active | Publish | same | same | same |
| Under review → Active | (not a dealer action) | — | pre-check | 409 `LISTING_UNDER_REVIEW` |
| Active / Paused / Draft / Under review → Sold | Mark sold | Owner (`/mark-sold`), bulk | atomic function, one audit/sale row | 409 locks; `ALREADY_SOLD` |
| Sold → anything | — | nobody through the app | service guard + DB trigger `trg_cars_sold_read_only` | 409 `ALREADY_SOLD` / `LISTING_SOLD_READ_ONLY`; only `kayad_admin_correct_sold_listing` (admin, reason ≥ 10 chars, audited) |
| Rejected / Reserved → anything | — | nobody (dealer) | atomic function | 409 `LISTING_STATE_LOCKED` |

## What publication requires
`brand`, `model`, a year ≥ 1950, a price > 0 and at least one photo (`missingForPublication`). Account eligibility is the existing `sellerMayPublishDirectly` check. Approval / moderation: per-listing admin approval is retired in this codebase, so a dealer can publish their own complete listing; an *Under review* or *Rejected* listing cannot be published by the dealer.

## What is preserved
Pause and republish only change `status` (and `updated_at`). Photos, the permanent listing number, views, leads and enquiries are untouched. Each change writes one row to `dealer_listing_lifecycle_events` (who: `actor_user_id`, owner vs staff; when: `created_at`; from / to status).

## Tests
Journey `11_dealer_publish_pause.mjs` (real HTTP, disposable DB), journey 09 (sold, locks, bulk), `DealerPauseRepublish.test.tsx`, `DealerSoldReadOnly.test.tsx`.
