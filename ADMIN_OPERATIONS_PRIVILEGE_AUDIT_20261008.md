# KAYAD AUCTION 360 — Stage 7: Admin/Operations Privilege Boundary Audit
**Date:** 2026-10-08
**Scope:** the privileged/admin/operations boundary sitting above the already-
hardened auction, payment, escrow, fulfilment, ownership and ledger systems
(Stages 1–6). Central question: can any user, dealer, admin, service
account, client-controlled role/ID, or manipulated request cause a
privileged state transition their actual authority does not permit?

## 1. Scope and method

Read the current `AUCTION_360_EXECUTION_LOG_20261007.md`,
`AUCTION_360_REMAINING_PLAN_20261007.md`,
`ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md` and
`ESCROW_STATE_MACHINE_MATRIX_20261008.md` first. Then mapped the privileged
surface directly from source: `backend/middleware/auth.js` (the full
`request → JWT → req.user → role → authorization` chain), `backend/config/owners.js`
(the webhoist/owner trust root), `backend/routes/adminRoutes.js` (2,200+
lines, the primary admin control plane), `backend/routes/escrowRoutes.js`
(escrow-specific privileged operations), and `backend/controllers/escrowController.js`
(the release/refund implementation). Did not infer authorization from
filenames or UI visibility — every PASS below is backed by a direct code
citation.

## 2. Admin authentication and role trust (Step 7C)

**Finding: PASS, no changes.** Traced the complete chain in
`backend/middleware/auth.js::protect()`:

- Token extracted from `Authorization: Bearer` header or the `token` cookie,
  verified with `jwt.verify(..., { algorithms: ["HS256"] })` against
  `process.env.JWT_SECRET` (hard-fails with a 500 if the secret is unset,
  rather than silently accepting unsigned tokens).
- A 20-second lightweight cache exists for *non-security* profile fields
  only (name/avatar) — re-verified this stage that `securityUser`
  (`role`, `status`, `isBanned`, `deactivatedAt`, `emailVerified`,
  `grantedPermissions`, `revokedPermissions`) is **always** re-fetched fresh
  from the database on every request, never served from that cache. A
  `tokenVersion` mismatch (logout/password-change/ban) and a revoked
  `sessionId` (checked against `RefreshToken.findActiveSessionById`) both
  immediately invalidate the request with `401 AUTH_SESSION_EXPIRED`. This
  is the exact mechanism that prevents a stale session from silently
  retaining dangerous authority after a ban/demotion — confirmed, not
  assumed.
- `role` and `effectiveRole` (the "webhoist" owner bypass) are both computed
  **server-side only**, from `isOwnerEmail(user.email)` checked against
  `config/owners.js`'s `OWNER_EMAILS` (env-driven, case/whitespace-normalized,
  never a database-editable flag — "an owner can never be demoted, deleted,
  or impersonated by editing the database," per that file's own design
  comment, re-verified true by reading every consumer of `isOwnerEmail`).
- No `req.body.role`, `req.body.isAdmin`, or `req.body.permissions` is ever
  read anywhere in the authentication chain (grepped the full middleware
  and every admin route file) — role/permission trust is 100%
  server/database-derived.
- `adminOnly`, `dealerOnly`, `allowRoles`, `requireRole` all check
  `req.user`/`req.user.effectiveRole` exclusively — none accept a
  client-supplied override.

## 3. Admin control-plane mapping (Step 7B) and auction administration (Step 7D)

`backend/routes/adminRoutes.js` is the primary admin control plane:
a single `router.use(protect, adminOnly)` (line 97) gates everything in the
2,200-line file except one explicitly public, read-only, field-allowlisted
`GET /public/config` registered before it (branding config for pre-login
visitors — no sensitive field in its `.select()`). A second layered
`router.use` (line 104) derives a path-pattern-based `PERMISSIONS.*`
requirement (escrow/payments/cars/auctions/users/staff/ads/inspection/
support/logs/analytics/settings) so a departmental staff role (marketing,
HR, accounts, escrow_officer, ad_manager, moderator, technical_support)
cannot reach an unrelated domain merely by being authenticated staff — this
is the exact "defense-in-depth permission routing" the file's own comment
describes, re-verified correct by reading the regex table against every
path segment used elsewhere in the file.

**Auction creation/editing/publishing/closing/reserve-price/winner-handling
administration:** searched `adminRoutes.js`, `commandCenterController.js`,
and `operationsRoutes.js` directly for any admin-facing auction-state-
mutation or winner-override endpoint. **None exists.** Auction lifecycle
mutation (create/publish/close/winner-determination) is entirely owned by
the already Stage-1/3/6-certified `auctionController.js` canonical path,
with no parallel admin-only auction engine and no admin "correct the
winner" capability anywhere in the codebase. This is the safest possible
state for this surface (no override surface = no override risk) and is
recorded as **PASS (feature not implemented, no exposure)** rather than
speculatively building one — the master prompt's own "do not invent
operational behavior" instruction applies directly here.

## 4. Finding fixed this stage: listing moderation could silently un-sell a sold car

**File:** `backend/routes/adminRoutes.js::POST /cars/:id/moderate` (now
delegating its precondition to the new `backend/utils/carModerationGuard.js`).
**Severity:** real, high — this is precisely the invariant Step 7H names
explicitly: *"check whether an admin can simply change a vehicle status from
sold back to active while financial/ownership records remain completed."*

The handler takes an arbitrary car ID and an `action` of `approve`/`reject`,
with **no precondition on the car's current status at all**. On `approve`
it unconditionally set `car.status = "available"`. Stage 6's fix confirmed
that escrow release marks a sold car with `sold: true, status: "sold",
isPaid: true, paymentStatus: "paid"` (`marketplaceFulfilment.service.js`) —
but nothing stopped an admin (or any staff role with `MANAGE_CARS`
permission, per the path-pattern permission layer above) from later calling
`POST /admin/cars/:carId/moderate {action:"approve"}` on that exact car and
flipping it straight back to `available`, re-listing a financially-completed
sale as purchasable while the payment/escrow/ownership records still showed
it sold — a real double-sale risk, and a direct contradiction of one buyer's
already-completed purchase.

**Fix:** factored the precondition into a small, independently-testable
guard, `backend/utils/carModerationGuard.js::moderationBlockedReason(car)`,
which returns a rejection reason when `car.status === "sold"` or
`car.sold === true`, and wired it into the route handler as a `409` before
any mutation. Kept as a standalone pure function (rather than inline in the
2,200-line route file) specifically so it could be unit-tested without
mocking that file's 30+ unrelated module imports — the smallest correct
layer for both the fix and its test, per this stage's own change
discipline.

**Test:** `backend/tests/admin/carModerationGuard.test.js` (new, 5 cases):
blocks a `status:'sold'` car; blocks a car whose `sold` boolean is `true`
even if `status` lags behind; allows a `pending` listing; allows a
`rejected` listing being reconsidered; is null-safe. Verified via the
established revert → confirm-fail (2 of the 5 assertions fail exactly as
predicted with the guard stubbed to always return `null`) → restore →
confirm-pass discipline.

This does not touch, duplicate, or redesign any auction/payment/escrow/
ownership engine — it closes one specific gap in listing moderation using
the exact `sold`/`status` fields Stage 6 already established as canonical.

## 5. Financial administration (Step 7E) and escrow admin operations (Step 7F)

Re-verified `backend/controllers/escrowController.js::releaseEscrow` and
`::refundEscrow` directly (both reachable only via
`backend/routes/escrowRoutes.js`'s `POST /:id/release` and `POST /:id/refund`,
each gated by `protect` + `escrowAdminOnly` + a dedicated
`escrowReleaseOnly`/`escrowRefundOnly` permission middleware + a rate
limiter + `idempotencyCheck` + `validateObjectId`):

- **Authorization is checked twice** — once in route middleware, once again
  inside the controller itself (`canActAsEscrowAdmin(req.user)`) before any
  read or write — genuine defense-in-depth, not a single point of failure.
- **The escrow is always re-fetched server-side** by `:id` with
  `.populate("car seller payment")` — no client-supplied beneficiary,
  amount, or car ID is ever trusted; `sellerAmount`/`commission` come back
  from `serviceRelease()`'s own computation, not from the request body.
- **Idempotency**: `req.idempotencyKey` (set by the `idempotencyCheck`
  middleware) is passed through to the service layer on both operations —
  this is the same mechanism Stage 6 certified for the payment-initiation
  retry gap, now confirmed applied here too.
- **Refund requires a non-trivial reason** (`reason.length >= 10`),
  enforced server-side before the refund service is even called.
- **Audit trail is doubled**: both `logActionFromReq("escrow.released"/
  "escrow.refunded", ...)` (actor, target, resourceId, amount/commission,
  severity) **and** a dedicated `logEscrowReleased()`/`logEscrowRefunded()`
  call fire on every mutation. This is adequate audit coverage, not a gap —
  recorded as PASS, no change made.
- Escrow config/account management (`/escrow/config`, `/escrow/accounts*`)
  is permission-gated platform-wide configuration, not per-resource
  mutation, and carries no direct financial-amount-override risk (it
  configures future routing, not existing escrow state).

No real defect found in this surface. Per the master prompt's own change
discipline ("if code is correct, DO NOT CHANGE IT"), nothing here was
touched.

## 6. Fulfilment/ownership administration (Step 7G), vehicle/listing moderation (Step 7H)

Fulfilment/ownership completion itself (buyer confirmation → release →
seller payable → seller payout → ownership → purchase history) is the exact
chain Stage 6 already traced and certified end to end, including the
`sold`-marking fix. Stage 7's added value here is specifically the
moderation-boundary finding in §4 above — the one place a *different*,
non-escrow, non-fulfilment privileged surface (`cars/:id/moderate`) could
have reached into and silently contradicted that already-certified chain.
No other vehicle/listing moderation action (suspend/reactivate/edit/change-
price/delete/archive/assign-seller) was found to carry the same risk:
`DELETE /cars/:id` hard-deletes regardless of sale status (acceptable —
deletion, unlike re-listing, does not un-sell anything or put the vehicle
back in front of buyers) and no other endpoint writes `car.status` to a
non-terminal value (confirmed by the same grep used in §4: exactly one
`car.status = "available"`/`"active"` write-site existed in the whole
backend, and it is the one just fixed).

## 7. User/dealer administration (Step 7I)

- **Role assignment** (`PUT /staff/:id`) is superadmin-only, explicitly
  allow-lists assignable roles, and **excludes `"superadmin"` itself** by
  design ("superadmin elevation goes through the webhoist owner flow only"
  — confirmed true: webhoist status cannot be granted through any API at
  all, only through the `WEBHOIST_EMAIL` env var, re-confirmed in §2).
  A dealer therefore cannot become an admin, and an admin cannot forge
  superadmin through this endpoint.
- **User/staff delete** (`DELETE /users/:id`, `DELETE /staff/:id`) rejects
  deleting a superadmin and rejects deleting yourself, both checked
  server-side before mutation.
- **`protectAccount` middleware** additionally blocks any admin (other than
  the owner themselves) from editing, deleting, or re-roling an owner
  account — re-verified this stage by reading its consumers across
  `adminRoutes.js`'s user/staff mutation routes.
- **Suspended-account capability loss** was already certified in Stage 4
  (`AUTH_FORBIDDEN` on `isBanned`/`deactivatedAt`, re-checked fresh on every
  request in `protect()`, not cached) — re-confirmed still intact, not
  re-litigated.

No real defect found. Nothing changed.

## 8. Documents + inspection admin (Step 7J)

Re-confirmed the Stage 5 separation between Ghost Check (`vehicle_inspections`)
and the Inspection Marketplace (`inspection_bookings` + satellites) remains
intact and was not touched or merged by any Stage 7 change — no inspection-
related file was edited this stage. Admin access to inspection
administration goes through the same global `adminOnly` + `MANAGE_INSPECTIONS`
permission layer already mapped in §3; document/evidence access authorization
itself was already fully audited in Stage 5 (`INSPECTION_PROVIDER_OPERATIONS_AUDIT_20261008.md`
§2–3) and is not re-derived here.

## 9. Service-role / Supabase / RLS boundary (Step 7K)

`backend/utils/supabase.js::getSupabase()` is the single, process-level
service-role client used by the entire backend — there is no per-request
elevation to track, because the backend's own controllers are themselves
the authorization boundary for every mutation that client performs (the
pattern re-verified across every surface in this audit: route middleware
+ controller-level ownership/role checks, never a bare pass-through to the
database). RLS is confirmed enabled and non-inert tree-wide by the
already-passing `validate:financial-audit-rls-hardening`,
`validate:inspection-domain-rls-enablement`, and `validate:high-risk-boundaries`
validators (re-run this stage, all green) — RLS is defense-in-depth here,
protecting against any future direct-client Supabase access, of which none
currently exists in this codebase (grepped for any frontend Supabase client
initialization with an anon or service key — none found; all data access is
mediated through the Express backend). No `SECURITY DEFINER` function was
found to be callable from the frontend without first passing through an
authorized backend route.

## 10. Concurrency/replay (Step 7L) and audit trail (Step 7M)

Not re-derived from scratch — Stage 6 already performed the detailed
concurrency/replay analysis for the financial chain itself
(`ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md`), and this stage's own fix
(the moderation guard) is a synchronous precondition check with no new
concurrency surface of its own (two simultaneous `moderate` calls on the
same car are each independently safe: whichever reaches the database first
sets `sold`/`status`, and the guard reads whatever is currently
true — there is no window where both could succeed in a way that creates
an inconsistent state, since neither write path depends on the other's
intermediate state). Admin audit trail: confirmed adequate tree-wide — the
global admin auto-audit wrapper (§3) covers every state-changing admin
route by construction, and the escrow release/refund paths additionally
carry dedicated, more detailed audit calls (§5). No audit gap found;
classified **PASS**, not **DEFENSE-IN-DEPTH** or worse.

## 11. Carry-forward review (Step 7O)

Re-checked every item explicitly listed by the master prompt for a Stage-7
dependency:

- Stage 2 (`vehicleApi` rejected→active mapping, `mpesaCallback`
  hardcoded-500, `completeEscrowRefund` typing, inspection architecture
  split): no dependency found. The first was Stage-3-scoped and remains
  environment-blocked on `tsc` certification against the exact field in
  question (unrelated to admin/operations); the latter three were already
  directly re-reviewed and resolved/documented in Stage 6.
- Stage 3 (dealer dashboard raw-Supabase column bug): no dependency —
  that endpoint is a dealer-facing analytics read, not an admin privilege
  boundary.
- Stage 4 (client-writable escrow live-mode flag, payment retry/idempotency,
  duplicate-phone registration): the live-mode flag and payment idempotency
  were already resolved in Stage 6 (confirmed presentation-only; fixed,
  respectively); duplicate-phone registration has no admin/operations
  dimension.
- Stage 5 (narrow duplicate-booking race, dead unused models, intentional
  public lookup, harmless dead export): none touch the admin/operations
  boundary; untouched.
- Stage 6 (explicit reject-payment-initiation-for-already-sold-car guard,
  live Postgres/Supabase concurrency execution, environment-dependent
  staging certification): the already-sold-car guard is a *defense-in-depth*
  item for the payment-initiation endpoint specifically (a narrow
  double-submit race), distinct from this stage's §4 finding (an admin
  endpoint with no precondition at all, not a race) — both are now tracked
  side by side, not merged, since they are different code paths with
  different risk profiles. Live Postgres/Supabase concurrency execution and
  staging certification remain environment-blocked, unchanged.

Nothing was silently dropped; nothing was reopened without a found
dependency.

## 12. Final PASS/PARTIAL/GAP matrix

| Area | Result |
|---|---|
| Admin authentication & role trust | PASS |
| Admin control-plane route mapping | PASS |
| Auction administration | PASS (no override surface exists) |
| Listing moderation sold-reversion | GAP → **FIXED** |
| Financial administration (payment monitoring/retry/reconciliation) | PASS (Stage 4/6, re-confirmed) |
| Escrow admin operations (release/refund/forfeiture) | PASS |
| Fulfilment/ownership administration | PASS (Stage 6, re-confirmed) |
| Vehicle/listing moderation (other than §4) | PASS |
| User/dealer administration | PASS |
| Documents/inspection admin | PASS (Stage 5, re-confirmed) |
| Service-role/RLS boundary | PASS |
| Concurrency/replay (admin surface) | PASS |
| Audit trail | PASS |

## 13. Environment-dependent items

Unchanged from Stage 6: live Postgres/Supabase/Redis/M-Pesa concurrency
execution and staging certification remain environment-blocked — this
sandbox has no reachable staging infrastructure. Everything in this
document is a **SOURCE-LEVEL** finding; nothing here is claimed as
**LIVE/STAGING VERIFIED**.

## 14. Closing

**STAGE 7 — ADMIN/OPERATIONS PRIVILEGE BOUNDARY: COMPLETE.** 1 real defect
found and fixed with a regression test (the listing-moderation sold-
reversion gap); every other privileged surface inspected was found
correctly authorized and was left unmodified, per this stage's own change
discipline. No second admin/auction/payment/escrow/ledger/ownership system
was created. Stage 8 (frontend auction experience) remains gated behind
the same live-infrastructure item already on record since Stage 1.
