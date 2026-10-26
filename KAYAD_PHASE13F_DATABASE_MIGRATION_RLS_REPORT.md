# Database, migration and RLS report

Environment: disposable local PostgreSQL (loopback only, database name ending `_disposable`; the scripts refuse any other target), PostgREST v12.2.3. All repository migrations applied in order plus the new one (`db-migrations.log`).

**New migration:** `supabase/migrations/20261025130000_private_seller_listing_visibility_hardening.sql` (additive; replaces one function; adds one nullable column + check, one trigger function, one trigger; revokes EXECUTE from PUBLIC/anon/authenticated).
**Rollback:** `supabase/rollbacks/20261025130000_private_seller_listing_visibility_hardening.down.sql` — [DB] executed: restores the 13E function body, drops the 13F objects; data rows retained.

[DB] `scripts/validate-phase13f-db.sh` — 28/28: lifecycle SQL (43 assertions in one rolled-back transaction), idempotent re-apply, rollback then re-apply, reconciliation of pre-existing suspended sellers, concurrency.
[DB]/[HTTP] RLS: deny-all for anon/authenticated on `private_seller_capabilities` and the events table; direct anonymous PostgREST reads/writes refused (matrix §L).

**Not done:** applying any migration to staging or production — [APPROVAL] required. Baseline note: the shim used to stand in for Supabase auth/storage schemas on the local cluster is documented in `db-shim.log`; real Supabase behaviours (e.g. managed roles, extensions) remain a staging item.
