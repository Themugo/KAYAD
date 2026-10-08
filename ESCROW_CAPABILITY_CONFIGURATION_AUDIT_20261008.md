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

Escrow eligibility today is **role-based, not individually grantable**.
There is no per-seller or per-vehicle admin grant mechanism — see
"Gaps" below.

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
- **No admin endpoint exists to grant/revoke/suspend/restore/modify
  escrow capability for a specific seller or a specific vehicle.**
  Confirmed by: grepping `escrowApproved`/`escrowForced` across every
  route/controller — the only reads are two dead references in
  `paymentController.js:177-180` (`dealerCanEscrow`, which can never be
  true in practice because `car.escrowEnabled` is hard-forced `false`
  for every dealer car); nothing writes these fields anywhere. The
  migration itself documents the retirement of this mechanism
  (`20260907150000_escrow_custody_admin_configuration.sql:40-42`:
  *"Historical dealer escrow approval is no longer a vehicle escrow
  eligibility mechanism... all vehicle escrow creation is server-enforced
  to private sellers only."*).

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

## Future activation path

To reach CBK-certified, admin-grantable, per-seller/per-vehicle escrow
eligibility (as the master prompt's "ADMIN-CONTROLLED ESCROW RIGHTS"
section describes as a target), the architecture would need, at minimum:
a real admin-facing grant/revoke endpoint (e.g. reviving
`users.escrow_approved`/`escrow_forced` with an actual write path, or a
new `escrow_capabilities` join recording `car_id + seller_id +
granted_by_admin_id + granted_at`), and a corresponding update to
`escrowConfiguration.service.js`'s hard-coded role check. **This was not
built this stage** — doing so would be inventing new business
rules/architecture beyond "make the existing trust signals accurate",
which the master prompt's scope boundary explicitly excludes
("DO NOT INVENT NEW BUSINESS RULES", "DO NOT CREATE A SECOND ESCROW
ENGINE"). It is recorded here as the intentionally-deferred path, not a
gap introduced by this stage.

## Gaps (pre-existing, documented, not fixed this stage)

1. No admin-grantable per-seller/per-vehicle escrow eligibility exists —
   eligibility is hard-coded to seller role. Deferred (see above).
2. `users.escrow_approved`/`escrow_forced` and `vehicle.escrowOverride`
   are both inert scaffolding with no write path anywhere in the
   codebase (frontend or backend) — kept as-is (not fabricated into a
   working feature this stage; not removed either, since removing dead
   but harmless type/schema fields is out of this stage's scope and
   carries its own risk of breaking something that reads them
   defensively).
3. `backend/controllers/authController.js:649,667` reads/writes a
   `bankAccount` field on the user profile update endpoint, but no
   migration ever creates a `bank_account` column on `users` — appears to
   be dead/unsupported code. Not escrow-specific (no per-dealer payout
   account concept exists at all today — only the shared platform
   custody account); flagged for a future stage, not touched here.

## Fixes made this stage (escrow-adjacent, not escrow-architecture)

See Finding 2 in `CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md`: the
real backend `escrow_enabled` field is now exposed in the public
marketplace list and auction responses, the frontend mapper now reads
it, and the escrow-badge decision logic can no longer be overridden by a
client-side global policy setting to show a badge for a vehicle the
backend has not actually marked eligible. These are presentation-layer
fixes that make the existing capability visible and accurate — not new
escrow architecture.

## What is intentionally deferred

- Admin-grantable per-seller/per-vehicle escrow eligibility (Gap 1).
- Any live bank/payment integration beyond the existing shared custody
  account configuration (explicitly out of scope — "Do not implement a
  live bank integration merely to satisfy this stage").
- Activating `liveMode` (remains an admin's deliberate, audited decision,
  unrelated to this stage).
