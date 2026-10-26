# KAYAD Phase 13E — Remaining Risks and Staging Gaps
**No staging/production/database access was used. Nothing below is verified live.**

## Open decisions / not implemented
| ID | Item | Status |
|---|---|---|
| R1 | Live listings on suspension/revocation | **Decision implemented locally:** hide only currently public (`available`), approved, non-deleted listings; preserve records/ownership and record prior status; restore only policy-hidden listings still hidden and still owned by the same user when an authorized admin restores approval. Migration/trigger not applied or DB-tested. |
| R2 | Role-`user` approved sellers have no escrow capability, no private-seller-auction proposals and no `/api/dealer/*` caller-scoped routes (earnings, bids, mark-sold, payouts) | protected financial domain → separate approval; `individual_seller` accounts keep them |
| R3 | `POST /api/leads` still `dealerOnly` (an approved role-`user` seller cannot create a manual lead; legacy sellers can) | existing test pins current behaviour; adjust with product decision |
| R4 | Other `individual_seller` role checks (registration, escrowCapability, rbac, chat, payment, announcements, sitemap, reminders, auction services) were classified but not changed | they still serve legacy sellers; converting them is a follow-up with product rules |
| R5 | Registration with role `individual_seller` still exists (policy `privateSellerRegistration`); it creates the legacy model, not the capability model | kept for compatibility; decide whether to route new sellers through apply-after-register |
| R6 | A dedicated admin UI page for reviewing applications is not built (API and RBAC exist; the existing admin approve endpoint is kept in sync) | follow-up |
| R7 | Dealer-profile/team-member checks and historical dealer rows from pre-13D behaviour (unchanged, report-only) | as in 13D |
| R8 | Legacy admin approval synchronization | Added a service-level regression test for `syncLegacyApproval`; the full test runner could not be executed in this environment, and the route handler is not yet covered end-to-end. |

## Staging evidence required before any release
1. Read-only queries Q1–Q7 from 13C plus `SELECT status, count(*) FROM users WHERE role='individual_seller' GROUP BY 1` (sizes the backfill).
2. Dry-run the migration on a copy; compare counts; verify constraints, RLS (no policies, grants revoked) and idempotent re-run.
3. Playwright journeys against a staging stack with seeded test accounts (buyer, pending, approved, rejected, suspended seller, dealer, admin), desktop and mobile.
4. Cookie/CSRF on the real domain; email verification (required to apply) with a test mailbox.
5. Separate explicit approval to apply the migration.


## Phase 13E completion follow-up (2026-10-25)
- The product decision for suspension/revocation is now fixed: hide already-published listings from public view until an authorized administrator restores approval; preserve records and ownership.
- Added `supabase/migrations/20261025113000_private_seller_listing_visibility.sql` and matching rollback. The trigger records each affected listing's prior `available` status, hides only approved, non-deleted public listings, and restores only those still `hidden` and still owned by the same user. A migration-time reconciliation covers accounts already suspended/revoked when the migration is applied.
- The capability service invalidates public listing cache families after suspension/revocation and restoration transitions. Cache invalidation is best-effort under the existing cache helper contract.
- Added a dedicated admin review page at `/admin/private-seller-applications`, existing-shell navigation, `MANAGE_USERS` route gating, frontend API methods, UI tests, and a migration/route static contract validator.
- Static contract validator: 14/14 checks passed. Backend JavaScript syntax and seven affected TypeScript/TSX source/test files transpile without syntax diagnostics.
- Full application tests, typecheck, build, and browser tests were **not re-run** after these follow-up changes: this environment has Node.js 22.16.0, below the repository requirement `>=22.22.2`; `npm ci --engine-strict=false --ignore-scripts --no-audit --no-fund` timed out and did not complete. Partial `node_modules` was removed before packaging. No live database, staging, RLS, or Playwright check was performed.
