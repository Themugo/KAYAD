# KAYAD Phase 13E — Schema and Migration Review
**Created locally only. Not applied anywhere. No staging/production access. No migration certification is claimed.**

Files: `supabase/migrations/20261025100000_private_seller_capability.sql` (forward), `supabase/rollbacks/20261025100000_private_seller_capability.down.sql` (rollback).

## Why a new table
Existing records could not safely represent the lifecycle: `users.status` is the buyer/account gate (and for legacy sellers doubled as approval); `dealers`/`dealer_verifications` are dealership records; `private_seller_auction_proposals` / `vehicle_custody_capabilities` are per-auction and per-provider. A single additive table keeps one source of truth without touching any of them.

## Design
- PK `user_id` → `users(id)` (one application per identity; duplicate submits fail closed), `status` CHECK, `source` (`application | legacy_backfill`), contact fields, reviewer columns, timestamps, status/date index.
- `ENABLE ROW LEVEL SECURITY` with **no policies** and `REVOKE ALL FROM anon, authenticated`: only the backend service role can read/write, so a user cannot update their own approval through any client path. (The backend itself uses the service role, which bypasses RLS: the protection against a user approving themselves is the route/RBAC code, tested.)
- Backfill: existing `role='individual_seller'` users only, status copied from `users.status` (approved/rejected/suspended, else pending). Deterministic, idempotent (`ON CONFLICT DO NOTHING`), reviewable (`source='legacy_backfill'`). Nobody is converted, merged or re-roled; dealer rows are not read.
- Rollback drops only the new table; export `source='application'` rows first.

## Verified vs not verified
| Item | Status |
|---|---|
| Service/guard/routes against an in-memory model of the table | verified locally |
| `npm run validate:supabase-migrations` | see regression report (static check) |
| SQL executed on real Postgres, constraint/RLS behaviour, backfill row counts | **NOT verified** — no database available |
| Live `users.status` values used by the backfill mapping | **NOT verified** — needs staging query Q4 |
| Interaction with live RLS/grants on `users` | **NOT verified** — needs Q3 |

## Required before any apply
1. Read-only staging queries (13C Q1–Q7, plus `SELECT status,count(*) FROM users WHERE role='individual_seller' GROUP BY 1`).
2. Dry-run the migration on a copy; compare backfill counts to Q4.
3. Separate explicit approval.


## Additive live-listing visibility migration (not applied)
File: `supabase/migrations/20261025113000_private_seller_listing_visibility.sql`; rollback: `supabase/rollbacks/20261025113000_private_seller_listing_visibility.down.sql`.

The approved policy is to hide currently public (`available`), approved, non-deleted listings when a capability changes to `suspended` or `revoked`. An event table records car ID, owner ID, prior status and timestamps. On authorized reinstatement to `approved`, the trigger restores only records still `hidden` and still owned by the same user; sold/reserved/pending/draft/unapproved/deleted listings are not hidden by this policy, and records/ownership are never reassigned. Migration-time reconciliation covers existing suspended/revoked capability rows. Public inventory cache families are invalidated after the service reports these transitions.

**Static-only evidence:** 14/14 contract checks passed. The trigger, event table, RLS/revokes, restoration predicates and rollback have not been executed on PostgreSQL. Do not apply this migration until the read-only staging queries, migration dry-run, RLS checks, and explicit migration approval are complete.
