# Database migration reconciliation

**Method.** Hosted Supabase project "KAYAD EA" was inspected with **read-only** tools only (`list_migrations` and `SELECT` against `information_schema`, `pg_proc`, `pg_trigger`, `pg_constraint`). Nothing was written, no migration applied, no production row changed. The repository chain (209 files) was applied in order to a **disposable** database in every run of `ci/db-journeys/run.sh` (209/209 OK).

## 1. Where hosted stands
* Hosted migration history ends at **20260922** (`admin_control_schema_effect_capture_20260922`); about 123 entries.
* The repository has **86 migrations dated after 20260922** (20260926100000 … 20261121170000) that are not in the hosted history, including everything the dealer lifecycle depends on.
* Some earlier hosted entries are "schema effect capture" migrations, so hosted may contain objects whose migration names differ from the repository's. Object presence was therefore compared directly (below), not by name alone.

## 2. Objects the dealer work needs (hosted, measured)
| Object | Hosted |
|---|---|
| `cars.listing_number`, `cars.sold_at` | **missing** |
| `dealer_listing_lifecycle_events`, `dealer_listing_counters` | **missing** (created by migration 20261121160000) |
| `personal_listing_lifecycle_events` | **missing** |
| `marketplace_offer_settlements`, `marketplace_offers` | **missing** (the offer / settlement guard is created only if the table exists, so the migration still applies, but the OFFER_SETTLEMENT lock then has nothing to guard until the earlier chain is applied) |
| `purchase_outcomes`, `private_seller_listing_visibility_events` | **missing** |
| `kayad_dealer_listing_lifecycle_atomic`, `kayad_personal_listing_lifecycle_atomic`, `kayad_listing_manually_sold`, `kayad_admin_correct_sold_listing`, `kayad_offer_settlement_outcome` | **missing** |
| triggers `trg_cars_sold_read_only`, `trg_cars_listing_number` | **missing** |
| `cars` status CHECK | `available, sold, pending, reserved, hidden, draft` (**identical** to the disposable DB; there is no stored `rejected`) |
| `lead_activities` columns | `id, lead, type, actor, actor_type, description, metadata, created_at` (identical; confirms the lead-note fix targets the right columns) |
| `dealer_teams` columns | present (the 20261102 custom-roles migration is pending) |
| `platform_config.platform_name` | `KAYARD ` (trailing space; the brand migration 20261121170000 fixes this) |
| data volume | `cars`: **2 rows**, both `available`, 2 distinct dealers. The backfill is trivial and the table lock is negligible |

## 3. Consequence for release
The new application code calls `kayad_dealer_listing_lifecycle_atomic`. Until the pending chain is applied the code **fails closed**: status changes return 503 `LISTING_STATUS_SERVICE_UNAVAILABLE` and the listing is left unchanged. It never changes a listing without the safety checks. A disposable-DB pass is **not** proof that hosted behaves the same; it only proves that the whole chain applies cleanly to an empty schema.

## 4. Ordered plan (staging first, then production)
Prerequisites for both: a fresh backup / point-in-time-recovery marker; a maintenance window; `NOTIFY pgrst, 'reload schema'` after each function-signature change.
1. Create or refresh a **staging** project from a copy of hosted (so the same 22 Sep baseline).
2. Apply, **in file order**, the 86 pending migrations (`ls supabase/migrations | awk '$1>"20260922999999"'`). Stop at the first error and report; do not skip.
3. The two dealer migrations are the last two: `20261121160000_dealer_listing_lifecycle_and_numbers.sql` (idempotent, adds columns / tables / functions / triggers, backfills listing numbers by `(created_at, id)`), then `20261121170000_brand_kayard_ke_normalize_platform_config.sql` (idempotent; changes only exact brand variants, not business names, the domain or reference prefixes).
4. Reload the PostgREST schema cache.
5. On staging run `ci/db-journeys/run.sh`-equivalent read paths manually: pause / publish / mark-sold of a test listing, a funded-escrow refusal, banking save / read-back, listing numbers. Compare with the disposable-DB evidence.
6. Production only after staging passes and the owner approves in writing.

## 5. Rollback and recovery
* Migrations are forward-only and additive. The dealer migration does not drop or rewrite existing columns; it adds `listing_number`, `sold_at`, two tables, functions and triggers.
* **Fast mitigation (no data loss):** drop the guard triggers (`trg_cars_sold_read_only`, the escrow / settlement guards) and revoke execute on the lifecycle function; the old code path is no longer in the application, so this is only for emergencies and should be paired with redeploying the previous release.
* **Full rollback:** restore the pre-migration backup / PITR marker. Listing numbers are display-only (UUIDs unchanged), so dropping `cars.listing_number` and `dealer_listing_counters` loses nothing else.
* The brand migration is reversible by hand only for rows it changed; keep the pre-run `platform_config` row in the backup.

## 6. Owner decisions
D-1 (apply the chain, staging first) and D-2 (brand rows) in OPEN-ISSUES. Nothing in this document has been executed against hosted.
