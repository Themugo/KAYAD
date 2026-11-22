# 09 — Numeric listing identification

Implemented in #261 (migration `20261121160000_dealer_listing_lifecycle_and_numbers.sql`); re-verified here by reading the SQL and by the harness (journeys 09 / 11 / 12 PASS).

* `cars.listing_number integer`, shown as **LISTING #n**.
* **Per-owner sequential counter** `dealer_listing_counters(dealer_id, last_number)`; allocation is a single `INSERT … ON CONFLICT DO UPDATE … RETURNING` in a BEFORE INSERT trigger, so concurrent inserts for one owner serialise on the row lock — no duplicates. The first listing of an owner gets **1**.
* Never renumbered: an immutability trigger rejects changes to `listing_number` or the owning `dealer_id`; the counter only moves forward, so numbers are not reused after delete/sold; editing, pause, publish, sold do not touch it; sorting/filtering/pagination display the stored number (not a row index).
* Legacy records: idempotent backfill, oldest first (`created_at, id`), continuing after each owner's existing maximum; unique partial index `(dealer_id, listing_number)`.
* Shown in dealer inventory (`DealerDashboard.tsx`) and `PersonalSellingModule.tsx`; carried by `carController` / `vehicleApi`.

## Not done / owner decision
* **D-17 — scope of the sequence.** The brief says numbering begins at LISTING #1 and does not say whether it is **per owner** (implemented) or **one platform-wide sequence**. Per-owner numbers will collide in meaning across owners (two different "LISTING #1"). A platform-wide number would need a different allocator. Not changed.
* Admin moderation views and public detail pages: whether they display the number was not exhaustively verified (dealer inventory and personal selling confirmed).
* The migration is **not applied to the hosted database** (hosted is behind); the numbering therefore does not exist in production until the migration chain is approved and applied.
* A concurrent-creation stress test exists only through the single-row-lock design and the lifecycle journeys; I did not add a new parallel-insert load test this phase (NOT TESTED).
