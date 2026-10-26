# KAYAD Phase 13E — Completion Follow-up (2026-10-25)

## User-approved listing policy
When a private seller is suspended or revoked, hide already-published listings from public view until an authorized administrator restores approval. Preserve every listing record and its owner. Do not delete or transfer listings.

## Changes implemented locally
- Added `supabase/migrations/20261025113000_private_seller_listing_visibility.sql` and `supabase/rollbacks/20261025113000_private_seller_listing_visibility.down.sql`.
- Added a visibility event table that records the car ID, owner ID, prior public status, transition reason, hidden time, and restoration time.
- Added a database trigger that hides only `available`, approved, non-deleted listings on a capability transition to `suspended` or `revoked`. Existing sold, reserved, pending, draft, manually hidden, unapproved, or deleted listings are not selected for hiding.
- Added restoration on authorized capability reinstatement to `approved`. Only policy-tracked listings that remain `hidden` and still have the same owner are restored to their recorded prior `available` status. Listings whose status has changed to another state are preserved in that state.
- Added migration-time reconciliation for already-suspended/revoked capability rows, because an INSERT backfill does not fire an UPDATE trigger.
- Added public listing cache invalidation after suspension/revocation and reinstatement transitions using the existing cache helper.
- Added `/admin/private-seller-applications` within the existing admin shell, with status filters, application details, approve/reject/suspend/revoke actions, mandatory reasons for reject/suspend/revoke, confirmation before suspend/revoke, and existing `MANAGE_USERS` authorization.
- Added API client methods, sidebar and route registration, UI tests, a service-level legacy-approval sync test, and `validate:phase13e-listing-visibility`.
- Updated the personal seller status panel to explain that public listings are hidden while seller access is suspended/revoked.

## Validation actually run after these changes
- `node scripts/validate-phase13e-listing-visibility.mjs`: **14/14 PASS**. This is a static contract check, not a database test.
- `node scripts/validate-premium-sell-auth-public-convergence-20261012.mjs`: **23/23 PASS**.
- `node scripts/validate-migration-hygiene.mjs`: **PASS**, 186 migration files scanned; no duplicate migration bodies or duplicate table creators.
- `node --check backend/services/privateSellerCapability.service.js`: **PASS**.
- `node --check backend/tests/regression/phase13eSellerCapability.test.js`: **PASS**.
- `node --check scripts/validate-phase13e-listing-visibility.mjs`: **PASS**.
- TypeScript `transpileModule` syntax check: **9/9 TS/TSX files passed**. This checks syntax only, not types or module resolution.

## Not run / not certified
- Full Jest, Vitest, backend Vitest, `node:test`, ESLint, typecheck, production build, and Playwright were not rerun after these changes.
- `npm ci --engine-strict=false --ignore-scripts --no-audit --no-fund` timed out after 120 seconds. Runtime was Node.js 22.16.0, while the project requires >=22.22.2; dependency installation did not complete. Partial `node_modules` was removed before packaging.
- The new SQL migration/trigger/rollback has not been executed on PostgreSQL. RLS, backfill counts, migration re-run behavior, and live public-cache behavior remain unverified.
- No staging or production environment was accessed.

## Safety
- No migration was applied.
- No database rows were modified.
- No source file in protected payment, escrow, auction, ledger, webhook, payout, or Super Admin authentication implementation was intentionally changed.
- No Git commit/push, deployment, production mutation, identity merge, or ownership reassignment occurred.

## Release gate
**PARTIAL — IMPLEMENTATION OR END-TO-END EVIDENCE INCOMPLETE.** The approved listing policy and admin review UI are implemented as local artifacts, but full test suites and database/browser verification are required before calling the phase locally certified or release-ready.

## Pre-existing manifest discrepancy discovered
The uploaded Phase 13E SHA-256 manifest lists 141 historical evidence/log paths that are not present in the uploaded ZIP itself (primarily `evidence/stage3/logs/` and `reports/phase-c1/logs/`). These paths were already absent before this follow-up; they were not deleted by this work. The new change manifest marks them `NOT_PRESENT_IN_UPLOADED_ARCHIVE_BEFORE_FOLLOWUP` rather than representing them as follow-up deletions. The delivered package manifest inventories the actual delivered tree.
