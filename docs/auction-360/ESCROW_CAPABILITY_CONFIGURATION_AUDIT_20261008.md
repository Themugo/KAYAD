# KAYAD AUCTION 360 — Stage 8: Escrow Capability Configuration Audit
**Date:** 2026-10-08

## Current escrow capability architecture

Escrow is, and remains, **optional platform-wide**. Nothing in this
stage made it mandatory or activated live escrow (`liveMode` stays
`false` by default — the platform is not yet CBK-certified).

The single real "escrow capability" field is `cars.escrow_enabled`
(migration `20260710045100_...car_listing_flow.sql`). It is:
- traceable to the vehicle/listing (it is a column on `cars`);
- traceable to the seller (it is server-enforced purely by
  `seller.role`: `true` for `individual_seller`, hard-forced `false` for
  `dealer`, re-applied on both create and update regardless of client
  input — `backend/controllers/carController.js:379-381, 613-616`);
- enforced again at escrow-creation time
  (`escrowConfiguration.service.js::validatePrivateSellerEscrow` throws
  unless `seller.role === 'individual_seller'`).

This satisfies the master prompt's "escrow must not hang in the air"
requirement: the capability has a clear, traceable relationship
vehicle → seller → policy, with no floating/global flag.

## Seller/dealer assignment

**Updated in Stage 9.** Escrow eligibility is no longer purely role-based.
Every seller (individual_seller or dealer) carries an admin-controlled
`escrow_capability_status` (`none|granted|suspended|revoked`). A migration
backfill set every existing `individual_seller` to `granted`, preserving
today's exact production behavior with no regression; dealers remain
`none` (not granted) until an admin deliberately grants one — also
preserving today's exact behavior (no dealer has ever had working vehicle
escrow). See `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md` for the
full mechanism and `ESCROW_CAPABILITY_MATRIX_20261008.md` for the verified
operation matrix.

## Admin rights (what exists today)

- `GET /admin/escrow/config`, `GET/POST/PATCH/DELETE /admin/escrow/accounts`
  (`backend/routes/adminRoutes.js:2166-2183`, `VIEW_ESCROW`/`CONFIGURE_ESCROW`
  permissions) — configures the **platform-level custody account(s)**
  (`escrow_accounts` table: bank name, account number, branch, currency,
  active/primary flags) and the global `platform_config.escrow_rules`
  policy JSON (`enabled`, `privateSellerRequirement`, `fundingMethods`,
  `releaseDays`, `commissionPct`, `futureWalletEnabled`). This is real,
  already-built, and left unchanged this stage.
- Escrow case operations (confirm/deliver/release/refund/dispute/close/
  reconcile/payout) operate on an **already-created** escrow record —
  these are case-management actions, not eligibility grants. Unchanged,
  re-confirmed correctly authorized (Stage 7).
- **Stage 9: CLOSED.** `PATCH /admin/escrow/sellers/:userId/capability`
  (`requirePermission(PERMISSIONS.CONFIGURE_ESCROW)`) now grants/revokes/
  suspends/restores a specific seller's escrow capability, with a
  corresponding `GET` for the current status. See
  `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`.
  (Historical context, pre-Stage-9: confirmed by grepping
  `escrowApproved`/`escrowForced` across every route/controller — the only
  reads were two dead references in `paymentController.js:177-180`
  (`dealerCanEscrow`, which could never be true in practice because
  `car.escrowEnabled` was hard-forced `false` for every dealer car);
  nothing wrote these fields anywhere. Both fields are now superseded by
  `users.escrow_capability_status` and are no longer read by any live code
  path — the columns are left in place, unused, rather than dropped.)

## Revoke behavior

Not applicable today — there is nothing to revoke (no grant mechanism
exists). If/when one is built, the existing Stage 6 canonical state
machine already distinguishes transaction state from eligibility
correctly by construction: an escrow's `status` lives entirely on the
`escrows` row, independent of `cars.escrow_enabled`, so flipping the
latter in the future would naturally affect only *future* eligibility
and could never retroactively alter an existing escrow record. This
property comes for free from the current schema design and needs no
new code to preserve it.

## Vehicle association / account association / purchase decision

- Vehicle association: `cars.escrow_enabled`, as above.
- Account association: `escrows.custodian_account → escrow_accounts.id`
  (migration `20260907150000_escrow_custody_admin_configuration.sql`) —
  already links a created escrow to a real configured custody account;
  unchanged.
- Purchase decision: `escrowConfiguration.service.js::validatePrivateSellerEscrow`,
  server-side, not reachable or overridable from the browser. The
  frontend's escrow badge (this stage's fix — see
  `CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md` Finding 2) now reflects
  this exact same decision instead of a separate, client-only approximation.

## Launch-disabled behavior

Fully supported today: `platform_config.escrow_rules.enabled: false` by
default, and the frontend's `liveMode: false` default independently
labels every escrow badge "(Preview)" until an admin deliberately
activates it (an action recorded in the admin audit log). Both gates are
independent and both default to off — launching with escrow disabled
requires no code change.

## Future activation path (updated — Gap 1 closed in Stage 9)

Stage 8 recorded, as the deferred future-activation path, exactly what
Stage 9 has now built: a real admin-facing grant/revoke endpoint and a
corresponding update to the escrow-eligibility check so it is no longer a
hard-coded role check. See `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`
for the full design and `ESCROW_CAPABILITY_MATRIX_20261008.md` for the
verified operation matrix. What remains genuinely deferred (unchanged from
Stage 8, not touched this stage): live bank/payment integration beyond the
existing shared custody account, and activating `liveMode`.

## Gaps (updated after Stage 9)

1. ~~No admin-grantable per-seller/per-vehicle escrow eligibility exists~~
   — **CLOSED this stage.** `users.escrow_capability_status`,
   `escrowCapability.service.js`, and
   `PATCH /admin/escrow/sellers/:userId/capability`.
2. `users.escrow_approved`/`escrow_forced` — **superseded, no longer
   read by any live code path** (paymentController.js's purchase decision
   now reads `escrow_capability_status` exclusively via
   `escrowCapability.service.js`). The two legacy columns are left in
   place, unused, rather than dropped — removing columns something may
   still read defensively is a separate, riskier change out of this
   stage's scope. `vehicle.escrowOverride` (frontend-only) remains
   unconnected scaffolding — see Stage 9's carry-forward re-check,
   item 3, in `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`.
3. `backend/controllers/authController.js:649,667` reads/writes a
   `bankAccount` field on the user profile update endpoint, but no
   migration ever creates a `bank_account` column on `users` — appears to
   be dead/unsupported code. Not escrow-specific (no per-dealer payout
   account concept exists at all today — only the shared platform
   custody account); still flagged for a future stage, not touched here
   (re-confirmed, unchanged, in Stage 9's carry-forward re-check).

## Fixes made this stage (escrow-adjacent, not escrow-architecture)

See Finding 2 in `CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md`: the
real backend `escrow_enabled` field is now exposed in the public
marketplace list and auction responses, the frontend mapper now reads
it, and the escrow-badge decision logic can no longer be overridden by a
client-side global policy setting to show a badge for a vehicle the
backend has not actually marked eligible. These are presentation-layer
fixes that make the existing capability visible and accurate — not new
escrow architecture.

## Stage 9 — Step 9B design decision (written before any code changed)

**1. What is the current escrow authority?**
Before Stage 9: none, per-seller — eligibility was a hard-coded function
of `seller.role` (`backend/controllers/carController.js` createCar/updateCar),
duplicated in two places, with no admin override possible. The purchase-time
gate (`paymentController.js`'s inline `isPrivateSeller || dealerCanEscrow`)
read `users.escrow_approved`/`escrow_forced`, which had a live read path but
zero write path anywhere — i.e. an authority that could never actually be
granted by anyone.

**2. What is the current vehicle-level flag?**
`cars.escrow_enabled` (real Postgres column, migration
`20260710045100_..._car_listing_flow.sql`). Before Stage 9, set purely by
the role-hardcode at create/update time; never independently admin-settable
per vehicle.

**3. What is the current seller/dealer-level authority?**
`users.escrow_approved` / `users.escrow_forced` — read in
`paymentController.js`'s `dealerCanEscrow` branch, but with no write path
anywhere in the codebase (reconfirmed by grep). Functionally inert: could
only ever evaluate falsy.

**4. What admin role can configure escrow?**
Today, only the *platform custody account* and the *global policy*
(`platform_config.escrow_rules`), via `requirePermission(PERMISSIONS.CONFIGURE_ESCROW)`
/ `PERMISSIONS.VIEW_ESCROW` on `/admin/escrow/config` and
`/admin/escrow/accounts` (`backend/routes/adminRoutes.js`). No admin role
could configure a specific seller's or vehicle's eligibility — that is
exactly the gap this stage closes, reusing the identical
`CONFIGURE_ESCROW`/`VIEW_ESCROW` permissions (no new permission invented).

**5. Where are escrow rules stored?**
`platform_config.escrow_rules` JSON (global, platform-wide — `enabled`,
`privateSellerRequirement`, `fundingMethods`, `releaseDays`, min/max amount,
`commissionPct`, `futureWalletEnabled`), read via
`escrowConfiguration.service.js::getEscrowRules()`. Unchanged this stage.

**6. Where are bank/settlement accounts stored?**
`escrow_accounts` table — a shared, platform-level custody account (bank
name, account number, branch, currency, active/primary flags), not
per-dealer. Unchanged this stage; no live banking integration added.

**7. What RLS protects them?**
`ALTER TABLE users ENABLE ROW LEVEL SECURITY` / `ALTER TABLE cars ENABLE ROW
LEVEL SECURITY` are both present, but the backend connects to Supabase with
`SUPABASE_SERVICE_ROLE_KEY` (`backend/utils/supabase.js`), which bypasses
RLS entirely for every server-side query. Confirmed no `CREATE POLICY` on
`users` exists beyond the enable statement itself; `cars` has real
owner-scoped policies (`select_published_cars`/`insert_own_cars`/
`update_own_cars`/`delete_own_cars`) that likewise do not apply to the
service-role connection. **RLS is therefore not the real authorization
boundary for this feature, nor for any other admin surface in this
codebase** — the real and only enforcement is the Express middleware chain
(`protect` → `adminOnly` → the path-based permission regex gate → the
route-local `requirePermission(PERMISSIONS.CONFIGURE_ESCROW)`). This is a
pre-existing architectural characteristic, not a gap introduced or widened
by this stage.

**8. What is missing?**
A per-seller (individual_seller or dealer) admin-grantable escrow
capability that (a) has a real write path, (b) is consumed by *both* the
public ESCROW badge and the real purchase-time decision so they can never
disagree, and (c) cannot be weakened by a stale vehicle-level flag once the
seller-level capability is revoked/suspended.

**9. What is the smallest canonical addition?**
Four new columns on `users` (`escrow_capability_status` enum
`none|granted|suspended|revoked`, plus `granted_by`/`updated_at`/`reason`
metadata for auditability), one new shared service
(`backend/services/escrowCapability.service.js`) exposing a single pure
authority function (`computeEffectiveEscrowEnabled`) and one admin
write operation (`setSellerEscrowCapability`), and one new admin route
(`PATCH /admin/escrow/sellers/:userId/capability`, reusing the existing
`CONFIGURE_ESCROW` permission). No new table, no new permission, no new
audit-log system (reuses `logActionFromReq`), no new bank/financial
infrastructure, no new engine. See
`ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md` for the full design
rationale and `ESCROW_CAPABILITY_MATRIX_20261008.md` for the verified
operation-by-operation matrix.

## What is intentionally deferred

- ~~Admin-grantable per-seller/per-vehicle escrow eligibility~~ — built
  in Stage 9 (no longer deferred).
- Any live bank/payment integration beyond the existing shared custody
  account configuration (explicitly out of scope — "Do not implement a
  live bank integration merely to satisfy this stage").
- Activating `liveMode` (remains an admin's deliberate, audited decision,
  unrelated to this stage).
