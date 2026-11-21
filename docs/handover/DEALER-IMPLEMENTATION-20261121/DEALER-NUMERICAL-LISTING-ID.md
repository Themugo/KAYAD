# Permanent per-dealer listing numbers (DA-07)

* Storage: `cars.listing_number integer`, `dealer_listing_counters(dealer_id, last_number)`, unique partial index `(dealer_id, listing_number)`.
* Allocation: BEFORE INSERT trigger runs `INSERT … ON CONFLICT DO UPDATE SET last_number = last_number + 1 RETURNING` — the upsert row lock serialises concurrent inserts for one dealer. Verified with 20 concurrent inserts: 21 distinct contiguous numbers.
* Never reused: the counter only moves forward; soft-deleted and hard-deleted listings do not give numbers back (verified).
* Stable: an immutable trigger refuses any change of number or owner once set. Edit, pause, publish and sell never touch it.
* Backfill: idempotent, continues after the owner's existing maximum, orders by `(created_at, id)`, includes soft-deleted rows so their numbers stay reserved. Applied twice on the disposable DB with no change on the second run.
* API: `/api/cars/my-listings` and `/api/dealer-platform/inventory` return `listingNumber`; personal accounts use the same column (falls back to the previous derived number where the column is absent).
* UI: `#n` chip on every row (desktop and mobile) and in the Sold list; rows without a number show "—" (no invented numbers); numbers do not change with search, filter, sort or paging.
* Security: the number is display-only. UUIDs, slugs and public references are unchanged and no endpoint accepts the number as an identifier.
