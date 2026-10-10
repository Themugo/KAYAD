# KAYAD AUCTION 360 — Stage 9: Escrow Configuration Execution Report
**Date:** 2026-10-08

## 1. What was inspected

The full escrow authority chain end-to-end: the vehicle-level flag
(`cars.escrow_enabled`), the seller/dealer-level authority
(`users.escrow_approved`/`escrow_forced` — confirmed dead-write-path but
live-read), the escrow service/state-machine/controller/routes
(`escrowController.js`, `escrowOperationsController.js`,
`escrowConfiguration.service.js`, `escrowRoutes.js`), admin routes and
authorization (`adminRoutes.js`'s permission regex gate +
`requirePermission`, `rbac.js`'s `PERMISSIONS`/`hasPermission`), ownership
(RLS on `users`/`cars` vs. the service-role connection that bypasses it),
payment (`paymentController.js`'s real escrow-creation decision), bank
account configuration (`escrow_accounts`, `platform_config.escrow_rules`),
the data-mutation mechanics needed to add a new admin-write field
(`backend/models/_base.js`'s `.save()`/`backend/db/index.js`'s
`update()`), and the field-name translation layer
(`backend/utils/fieldMap.js`). Full narrative in
`ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`; the 9-question
design decision in `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md`'s
new Stage 9 section; the operation-by-operation proof table in
`ESCROW_CAPABILITY_MATRIX_20261008.md`.

## 2. What was changed

**Database (1 new migration):**
- `supabase/migrations/20261008120000_escrow_seller_capability_authority.sql`
  — adds `users.escrow_capability_status` (+ 3 metadata columns), with a
  behavior-preserving backfill.

**Backend (5 files new/edited):**
- `backend/services/escrowCapability.service.js` (new) — the single shared
  authority consumed by the badge and the purchase decision.
- `backend/controllers/carController.js` — createCar/updateCar's escrow
  enforcement now derives from the new capability authority instead of a
  role hard-code; `getCar()` live-rechecks the badge.
- `backend/controllers/auctionController.js` — `getAuction()` live-rechecks
  the badge identically.
- `backend/controllers/paymentController.js` — the real escrow-creation
  decision now uses the same authority as the badge.
- `backend/routes/adminRoutes.js` — new
  `GET`/`PATCH /admin/escrow/sellers/:userId/capability`.
- `backend/validation/escrow.schema.js` — new `setEscrowCapabilitySchema`.

**Tests (1 new file, 6 updated):**
- `backend/tests/escrow/escrowCapability.service.test.js` (new, 24 tests).
- `backend/tests/transactions/paymentStatusOwnership.test.js`,
  `paymentInitiateAmountIntegrity.test.js`, `paymentHistory.test.js`,
  `backend/tests/security/carAuctionLockAndUpdate.test.js`,
  `backend/tests/auction/getActiveAuctionsRejectedExclusion.test.js`,
  `auctionResponseLocation.test.js` — each updated to mock the new
  `escrowCapability.service.js` import (none of these test escrow logic
  themselves; this was required purely to keep their existing ESM mock
  module graphs resolvable after the controllers under test gained a new
  transitive dependency).

**Documentation (3 new, 2 updated):**
- `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md` (new)
- `ESCROW_CAPABILITY_MATRIX_20261008.md` (new)
- `ESCROW_CONFIGURATION_EXECUTION_REPORT_20261008.md` (this file, new)
- `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md` (updated — Step 9B
  design decision added; Gap 1 marked closed)
- `AUCTION_360_EXECUTION_LOG_20261007.md` / `AUCTION_360_REMAINING_PLAN_20261007.md`
  (updated — see below)

## 3. Real defects found and fixed (1, found while implementing Stage 9)

1. **`updateCar`'s pre-existing escrow-enforcement block read the
   *editor's* role, not the listing owner's.** While replacing the
   role-hardcode with the new capability check, tracing the exact
   semantics surfaced that the old code (`if (req.user.role === "dealer")
   car.escrowEnabled = false; ...`) used `req.user.role` — correct only
   because, before this stage, *only the owner could ever reach this code
   path with an escrow-relevant role* (staff/admin accounts are never
   `"dealer"`/`"individual_seller"`, so the old lines were silent no-ops
   for a staff edit). Under the new capability-based logic this same
   pattern would have broken: a staff member editing any field on a
   seller's listing would have read *their own* (staff) capability status
   — always `none` — and reset that seller's own `escrowEnabled` to
   `false` on every staff touch, regardless of the seller's actual granted
   capability. **Fixed** by resolving the listing *owner's* role/capability
   (`req.user` when the owner is editing their own listing; a fresh
   `User.findById(car.dealer)` lookup otherwise) before deriving
   `escrowEnabled`. Covered by the existing
   `carAuctionLockAndUpdate.test.js` "staff/admin can still amend auction
   terms" test (which exercises exactly this owner≠editor path) plus the
   updated mock scaffold that would have surfaced a crash/behavior change
   had the fix been wrong.

2. **(Latent inconsistency, fixed as a side effect of unifying the
   authority, not a separately-introduced defect)** Before Stage 9, a
   private seller's (`individual_seller`) transaction always received a
   real escrow record regardless of `cars.escrow_enabled` — the old
   purchase-time check (`isPrivateSeller || dealerCanEscrow`) never
   consulted the vehicle flag for the private-seller branch, while the
   public badge (since Stage 8) already required
   `vehicle.escrowEligible` (sourced from that same flag) to show ESCROW
   at all. This meant a private seller's car with `escrow_enabled=false`
   (an edge case, but reachable from historical data) could have its
   escrow badge correctly hidden while the backend silently created a
   real escrow record anyway on purchase — a badge/purchase disagreement
   in the direction the master prompt explicitly forbids ("badge says
   ESCROW but purchase ignores escrow" and its mirror). The unified
   `computeEffectiveEscrowEnabled()` formula requires the vehicle flag for
   every seller type, closing this inconsistency by construction.

## 4. Regression tests

7 test files touched (1 new, 6 updated to keep existing ESM mock graphs
resolvable), 24 new test cases. Verified via the standard discipline:
- New tests run in isolation: 24/24 pass.
- Full backend suite: 48/48 suites, 644/644 tests (up from Stage 8's
  47/47, 620/620 — +1 suite, +24 tests, 0 regressions; every pre-existing
  test name still present and passing).
- Frontend suite (unchanged this stage, re-run to confirm no regression
  from the backend-only change set): 340 passed / 11 pre-existing
  unrelated failed / 1 skipped / 352 total — identical to the Stage 8
  baseline, confirmed by count.

## 5. Backend test count

**48/48 suites, 644/644 tests** (up from Stage 8's 47/47, 620/620 — +1
suite, +24 tests).

## 6. Frontend test count

**340 passed / 11 pre-existing unrelated failed / 1 skipped / 352 total**
— unchanged from Stage 8 (no frontend files were touched this stage; the
frontend already consumes `vehicle.escrowEligible` from the same backend
field, now live-rechecked server-side rather than requiring any frontend
change).

## 7. Typecheck

`npx tsc --noEmit`: clean, 0 errors (no frontend files changed this
stage).

## 8. Build

`npm run build`: clean, exit 0.

## 9. Validators

17 relevant validators run, all PASS: `validate:marketplace-core` (12/12),
`validate:inspection-marketplace` (37/37),
`validate:auction-transport-convergence` (5/5),
`validate:registration-role-matrix` (32/32),
`validate:domain-lifecycle-integrity` (PASS),
`validate:passport-authorization` (7/7),
`validate:financial-audit-rls-hardening` (PASS),
`validate:inspection-domain-rls-enablement` (PASS),
`validate:payment-gateway-lifecycle` (13/13),
`validate:payment-escrow-domain` (9/9),
`validate:financial-ledger-reconciliation-domain` (13/13),
`validate:high-risk-boundaries` (PASS),
`validate:escrow-live-operations-scenarios` (21/21 source-level, staging
correctly BLOCKED), `validate:auction-phase-a-financial-integrity`
(24/24), `validate:auction-360-hardening-20261007` (28/28),
`validate:auction-domain-integrity` (24/24), `validate:auction-bid-surface`
(6/6).

## 10. Authorization proof

Proven at the service layer (this codebase's established testing
convention — no route/supertest integration tests exist anywhere in it):
**unauthorized FAILS** — self-grant (403), nonexistent target (404),
ineligible target role (400), invalid status (400), and the pre-existing,
unchanged `requirePermission` gate rejects any caller lacking
`CONFIGURE_ESCROW`/`MANAGE_ESCROWS` before the handler is ever reached;
**authorized SUCCEEDS** — a distinct, permitted admin granting/revoking/
suspending/restoring an eligible seller's or dealer's capability succeeds,
writes the new status, and is logged. See
`ESCROW_CAPABILITY_MATRIX_20261008.md` for the full row-by-row proof.

## 11. Idempotency / concurrency proof

Re-applying the same grant/revoke/suspend/restore status twice always
succeeds and never double-cascades the vehicle-flag flip (proven by test).
Every admin write reads the target's current status fresh immediately
before writing (no in-process cache), and every purchase-time read
re-derives the authority fresh at the moment of payment initiation (no
caching of capability status anywhere in this stage's code) — so
sequential admin actions and admin-action-vs-purchase races always resolve
to the last completed write, by construction. Full reasoning in
`ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`'s "Concurrency /
idempotency" section.

## 12. Audit trail

Every grant/revoke/suspend/restore writes `escrow_capability_granted_by`/
`_updated_at`/`_reason` on the target user AND logs via the existing
`logActionFromReq(req, "escrow_capability_changed", {...})` — the same
audit mechanism already used by `escrowController.js`,
`escrowOperationsController.js`, and `carController.js`. No second
audit-log system was created.

## 13. Vehicle/seller/account association result

- **Seller/dealer association**: `users.escrow_capability_status`, scoped
  to a single validated, role-eligible `userId`.
- **Vehicle association**: `cars.escrow_enabled`, derived per-car from its
  owner's capability at create/edit time; cascaded to `false` immediately
  across every one of a seller's vehicles on revoke/suspend.
- **Account association**: unchanged — `escrows.custodian_account →
  escrow_accounts.id`, the shared platform custody account configuration,
  untouched by this stage.

## 14. Badge/purchase-policy agreement result

Both now call the identical `computeEffectiveEscrowEnabled()` with the
same three inputs (platform rules, live seller capability, vehicle flag).
Proven structurally (same function, same call sites) and by test (the
"revoked seller capability overrides a still-true vehicle flag" case
proves the anti-override rule both consume identically).

## 15. Non-escrow launch path result

Fully preserved: `platform_config.escrow_rules.enabled` remains the
platform master switch, default `false`, unchanged. A seller with
`escrow_capability_status='none'` (the default for every role except the
Stage 9 migration's private-seller backfill) behaves exactly as every
seller did before this stage — no escrow badge, no escrow purchase path.

## 16. Existing-transaction-survives-revocation result

Not a new property added by this stage — it was already true by
construction in the pre-existing Stage 6 schema (an `escrows` row's
`status` lives entirely on that row, independent of `cars.escrow_enabled`)
— and Stage 9 adds nothing that writes to or reads from the `escrows`
table at all, so it cannot have been broken by this change. Documented in
detail in `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`.

## 17. Stage 8 carry-forward re-check result

All 5 items re-checked (Step 9Q). Item 5 (admin-grantable per-seller/
per-vehicle escrow eligibility) — the primary Stage 9 requirement — is
closed. Items 1, 2, and 4 are unchanged, re-confirmed, not touched. Item 3
(`escrowOverride`/`escrow_approved`/`escrow_forced`) has an explicit,
documented disposition: the two legacy columns are superseded (no longer
read by any live code path) but not dropped; the frontend `escrowOverride`
field remains intentionally unconnected scaffolding, to avoid creating a
second, per-sale authority path below the new per-seller one. Full detail
in `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`'s "Stage 8
carry-forward re-check" section.

## 18. Environment-blocked items

Live Postgres migration execution, live Supabase/RLS behavior under a
real (non-service-role) connection, and real concurrent-request execution
— no reachable staging database or concurrency-capable runtime exists in
this sandbox. Unchanged from every prior stage; nothing here is claimed as
executed against live infrastructure.

## 19. Exit-criteria checklist (29 items)

- [x] Authorized admin can grant escrow capability.
- [x] Authorized admin can revoke escrow capability.
- [x] Authorized admin can suspend/restore capability where supported.
- [x] Capability is server-authoritative.
- [x] Capability is associated with the actual seller/dealer/user.
- [x] Capability can be associated with the actual vehicle/listing.
- [x] Vehicle with escrow capability displays ESCROW badge.
- [x] Vehicle without capability does not display ESCROW badge.
- [x] Badge and purchase-policy decision use the same authority.
- [x] Admin cannot accidentally create a second escrow engine.
- [x] User cannot self-grant escrow (self-grant check is role-eligibility
      + an independent self-target guard).
- [x] Dealer cannot self-escalate (dealers have no `CONFIGURE_ESCROW`
      permission; the route is behind the existing admin-only chain).
- [x] Existing escrow transactions survive capability revocation.
- [x] Future transactions respect current capability.
- [x] Escrow rules remain configurable where safely supported (platform
      rules untouched).
- [x] Financial destination remains server-authoritative (unchanged;
      `escrow_accounts` untouched).
- [x] Approved escrow/bank account configuration is protected (unchanged
      `CONFIGURE_ESCROW` gate).
- [x] Browser cannot select financial destination (unchanged — never was
      client-selectable).
- [x] Non-escrow launch path remains fully functional.
- [x] No live escrow activation is required for completion (`liveMode`/
      `escrow_rules.enabled` untouched, both still default off).
- [x] Existing Stage 6 escrow state machine remains canonical (untouched).
- [x] Existing Stage 8 badges remain intact (AUCTION/INSPECTION unchanged;
      ESCROW badge logic improved, not replaced).
- [x] Auction badge remains intact.
- [x] Inspection badge remains intact.
- [x] Stage 7 sold-vehicle moderation protection remains intact (not
      touched this stage; full suite re-run confirms no regression).
- [x] RLS/API authorization are aligned (documented: RLS bypassed by
      service role for every query in this codebase, including this new
      surface; Express is the real and consistent boundary).
- [x] Sensitive configuration changes are auditable.
- [x] Grant/revoke operations are idempotent.
- [x] Typecheck passes.
- [x] Backend tests pass.
- [x] Frontend tests do not regress.
- [x] Build passes.
- [x] Relevant validators pass.
- [x] Environment limitations are disclosed.
- [x] No duplicate architecture introduced.

## 20. Whether a new ZIP is required

**Yes** — source files changed (1 migration, 5 backend source files, 1 new
+ 6 updated test files, 2 updated docs, 3 new docs).
