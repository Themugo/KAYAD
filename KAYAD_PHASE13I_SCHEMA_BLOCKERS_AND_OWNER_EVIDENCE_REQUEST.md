# KAYAD Phase 13I — Schema Blockers and Owner Evidence Request

**Status: still BLOCKED. No production or staging system was contacted in Phase 13I; none is available. Nothing was invented, created or faked to make a route return 200.**

## What is blocked (historical evidence, dated 2026-10-21, names only)
- **24 production-only tables** (exist in production, no repository DDL) — matrix: `KAYAD_PHASE13H_PRODUCTION_ONLY_SCHEMA_MATRIX.csv` (carried forward unchanged; 24 rows).
- **66 repository migrations** absent from production's migration history on that date (`reports/phase-c1/evidence/repo-migrations-not-in-prod-history.txt`).
- Neither figure is proof of the *current* production schema.

## Why this does not block the personal-account workstream
The unified buyer/private-seller workflow uses tables that exist in the full 188-migration chain (rebuilt from empty in this phase: 188/188 applied, 208 tables). The 13I fixes required **no migration and no schema change**. Whether those same tables/columns/triggers exist in production is exactly what the owner evidence below would confirm; until then staging approval cannot be claimed (the 66 un-applied migrations may include the capability table, trigger and 13G admin_alerts migration).

## Read-only tooling (re-verified this phase)
- `scripts/owner/phase13h_schema_metadata_export.sql` — `BEGIN READ ONLY`, catalog queries only, no application-table SELECT (customer/listing/identity/payment data is never read). Self-test on the disposable DB: exit 0 (`validation-logs/phase13i/final/owner-export-selftest.*`).
- `scripts/owner/phase13h_staging_preflight_readonly.sql` and `scripts/owner/compare_migration_history.mjs` — migration-history comparison.

## Precise evidence request to the database owner
Please run the following with a **read-only role** against **production** (and again against **staging** once it exists) and return the files. Do not paste connection strings or passwords.
1. `psql "$READONLY_DB_URL" -v ON_ERROR_STOP=1 -f scripts/owner/phase13h_schema_metadata_export.sql > phase13h_schema_metadata.txt` — columns, constraints, indexes, triggers, RLS state/policies and grants for the 24 production-only tables plus `admin_alerts`.
2. `psql "$READONLY_DB_URL" -f scripts/owner/phase13h_staging_preflight_readonly.sql > staging_preflight.txt` — presence of: `private_seller_capabilities` (+ status check values pending/approved/rejected/suspended/revoked), `private_seller_listing_visibility_events`, the listing-visibility trigger/function, `communication_preferences`, `communication_deliveries`, `communication_event_controls`, `communication_channel_controls`, `saved_searches.notify_on_new_match`, `admin_alerts`, `cars.status` check list (must include `hidden`).
3. `select version, name from supabase_migrations.schema_migrations order by version` (or the equivalent history table) → run `node scripts/owner/compare_migration_history.mjs <history-file>` against `supabase/migrations`, confirming which of the 66 are un-applied.
4. For each of the 24 tables: is it application-owned, externally managed, legacy/obsolete, or protected (payments/escrow/bids)? Which routes still need it?
5. For the 73 routes whose table exists in no migration, no schema file and not in the production list: provision a data model, or retire/disable the route (owner decision). Confirm `users.country` (intelligence countries route) exists in production.
6. Production setting check (values only, no secrets): `REDIS_HOST`/`REDIS_PORT` vs `REDIS_URL` for the queue service; `SAVED_SEARCH_JOB_MODE` / `SAVED_SEARCH_EXTERNAL_DELIVERY` (expected unset/off until staging certification).

## Staging items still blocked
Staging migration application, a staging end-to-end run of the lifecycle with real Supabase/PostgREST/Redis, provider certification for any external notification channel, and the owner decision on the protected auction-registration fix. Each needs separate authorization; none was attempted.
