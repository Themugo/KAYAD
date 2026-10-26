# Rollback and recovery plan

**Application code:** revert to the 13E ZIP (SHA-256 e76dd957…23fc); the 16 modified + 11 added source files are listed in the change ledger. The new Express guard/cache changes are independent of the schema change.

**Database (only after a migration is separately approved and applied):**
1. Run `supabase/rollbacks/20261025130000_private_seller_listing_visibility_hardening.down.sql` — drops `trg_cars_private_seller_visibility_enforce`, `enforce_private_seller_listing_visibility()`, the `restore_outcome` check/column, and restores the 13E trigger function body. [DB] tested on the disposable database, followed by a clean re-apply.
2. No data is deleted: listings, ownership, capabilities and visibility events remain. Listings hidden by policy stay `hidden` until the owner is reinstated (13E behaviour) or an administrator changes them.
3. Dropping the `restore_outcome` column discards the outcome annotations only.

**Cache:** after any rollback flush the public-listing cache families (`cars:list:*`, `vehicle_search:*`, `kayad:search:*`, `cache:GET:/api/cars*`).

**Data-recovery notes:** take a snapshot/PITR marker before applying in staging; the migration's one-time reconciliation hides listings of already-suspended/revoked sellers — verify the count against `private_seller_capabilities` first.
