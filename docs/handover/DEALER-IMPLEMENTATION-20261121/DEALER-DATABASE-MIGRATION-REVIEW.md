# Database and migration review

New forward-only migrations (both sort after `20261121150000_brand_kayard_ke_seeded_customer_content.sql`):

1. `20261121160000_dealer_listing_lifecycle_and_numbers.sql`
   * Adds `cars.listing_number`, `cars.sold_at`; tables `dealer_listing_lifecycle_events`, `dealer_listing_counters` (RLS on, no policies, `service_role` only).
   * Functions: `kayad_dealer_listing_lifecycle_atomic`, `kayad_admin_correct_sold_listing`, `kayad_cars_assign_listing_number`, `kayad_cars_listing_number_immutable`, `kayad_cars_sold_read_only`, `kayad_listing_manually_sold`, `kayad_escrow_listing_sale_guard`, `kayad_settlement_listing_sale_guard`. Execute rights: `service_role` only.
   * Triggers: `cars` (BEFORE INSERT numbering, BEFORE UPDATE immutability and sold read-only), `escrows` (BEFORE INSERT / UPDATE OF status), `marketplace_offer_settlements` (created only if the table exists).
   * Idempotent: applied twice on the disposable DB; the backfill only fills missing numbers. Backfill takes `SHARE ROW EXCLUSIVE` on `cars` for its duration (short on current volumes; schedule outside peak).
2. `20261121170000_brand_kayard_ke_normalize_platform_config.sql` — exact-variant brand normalisation (see branding report).

Verified on disposable PostgreSQL 16: the whole chain applies cleanly (209/209 files), journeys 03, 05, 06, 07, 08, 09, 10 and the ten legacy journeys pass (`evidence/run-sh-full.log`, `evidence/journeys/`). The first full run caught a regression in my first draft (the settlement guard blocked the normal payment-driven `paid` transition, journey 05); the guards were narrowed to owner-completed sales only and the run repeated.

**Prerequisites on hosted (read-only reconciliation from the earlier audit):** hosted lacks `marketplace_offer_settlements`, `purchase_outcomes`, `personal_listing_lifecycle_events` and the earlier lifecycle migrations (`20261116…`, `20261117…`, `20261121110000`, `…140000`). Migration 1 creates the settlement trigger only when the table exists, but the lifecycle function reads `purchase_outcomes` and `marketplace_offer_settlements` at run time, so **apply the pending chain in order**; do not apply migration 1 alone to a schema that lacks them (a mark-sold call would fail closed with 503 `LISTING_STATUS_SERVICE_UNAVAILABLE`, never silently succeed).
Rollback: drop the triggers and functions listed above and the two tables, then drop the two columns; no existing column is altered or dropped.
Tenant isolation: every function takes the dealer id from the server-resolved business (staff are rewritten to the business id by `dealerWorkspaceAccess`); journey 09 verifies another dealer receives 404 and nothing changes.
Hosted: **no migration applied, no production row read for writing, no branding change.**
