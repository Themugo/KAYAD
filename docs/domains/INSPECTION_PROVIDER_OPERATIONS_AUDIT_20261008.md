# KAYAD AUCTION 360 — Stage 5: Inspection / Provider Operations Audit
**Date:** 2026-10-08
**Scope:** VEHICLE → INSPECTION REQUEST → PROVIDER ASSIGNMENT → PROVIDER ACCESS
→ INSPECTION WORK → EVIDENCE → DOCUMENTS → COMPLETION → VERIFICATION →
CUSTOMER VISIBILITY → AUCTION/MARKETPLACE TRUST.
Continues from `AUCTION_360_EXECUTION_LOG_20261007.md` /
`AUCTION_360_REMAINING_PLAN_20261007.md` / `ACCOUNT_SESSION_IDENTITY_AUDIT_20261008.md`;
does not restart any completed stage; does not introduce a second
auth/session/CSRF/routing mechanism (every fix below reuses `requireAuth`/
`requireRole`/`protect`/`assertAccess` exactly as already certified).

## 1. Architecture — see `INSPECTION_ARCHITECTURE_CONVERGENCE_20261008.md`

Full legacy-vs-canonical mapping lives in that document. Summary: no
dangerous split; two distinct, correctly-isolated products share the
"inspection" name. No `ARCHITECTURE MIGRATION REQUIRED` declaration needed.

## 2. Findings fixed this stage (both in the Ghost Check system)

### Finding 1 — `start()` had no status-transition precondition (status-regression defect)
**File:** `backend/inspection/controllers/legacyCompatibilityController.js::start`
**Severity:** Real, moderate. Not a data-leak or financial issue, but a
customer-facing-truthfulness and admin-dashboard-integrity defect: the
assigned inspector (or an admin) could call `POST /:id/start` on an
inspection that was already `completed`, silently reverting its status back
to `in_progress`. `legacyOrder()`'s status mapping (and the frontend's own
`statusMap` in `src/features/InspectionsView.tsx`) would then show a buyer a
finished, scored inspection flip back to "in progress" with no warning, and
the admin dashboards that count by status
(`commandCenterController.js::getInspectionOperations`,
`operationsDashboardController.js`'s overview counts) would double-count or
mis-bucket the same inspection across two different fetches.
**Fix:** added the same style of precondition guard `assign()` and `submit()`
already had — `start()` now requires `inspection.status === 'assigned'`,
returning 400 otherwise.
**Test:** `backend/tests/inspection/legacyInspectionStartConfirmPayment.test.js`,
2 new tests (rejects starting a `completed` inspection; allows starting an
`assigned` one). Verified via revert → confirm-fail (both assertions fail
exactly as predicted with the guard removed) → restore → confirm-pass.

### Finding 2 — `confirmPayment()` had no ownership scoping at all (IDOR + wildcard-match data leak)
**File:** `backend/inspection/controllers/legacyCompatibilityController.js::confirmPayment`
**Severity:** Real, high — the most severe finding of this stage. The
endpoint matched **any** inspection whose stringified `notes` JSON column
contained the client-supplied `checkoutRequestID` as a substring, via a
Supabase `.like('notes', '%' + checkoutRequestID + '%')` call, and returned
that row's full order — buyer id, car id, checklist, inspector notes,
evidence/images, fee — to whichever authenticated user called the endpoint,
with **no check at all** that the caller was the inspection's own
`requester_id`. Two compounding problems: (1) the complete absence of an
ownership/admin check meant any signed-in user who learned or guessed
another buyer's `checkoutRequestID` (a Safaricom-issued STK-push ID, not a
KAYAD secret, and not rate-limited on this endpoint) could read that buyer's
complete inspection record; (2) because `.like()` treats `%`/`_` in the
client-supplied value as SQL wildcards, and the value is interpolated
directly with no escaping, a client could send `checkoutRequestID: "%"` and
match **every** row in the table — handing back an arbitrary stranger's
inspection with zero actual knowledge of any real checkoutRequestID.
**Fix:** scoped the query to `requester_id = req.user.id` for non-admin
callers (admins — `role` in `['admin','superadmin']` — pass through
unscoped, consistent with every other admin-bypass pattern already
certified in this engagement, e.g. `assertAccess()` above it in the same
file). A non-admin's wildcard value now, at worst, matches only their own
rows.
**Test:** same new test file, 2 more tests (non-admin query is scoped via
`.eq('requester_id', ...)`; admin query is not). Verified via the same
revert/confirm-fail/restore/confirm-pass discipline.

Both fixes preserve every one of Stage 4's 8 must-not-regress fixes
unchanged — neither touches auth/session/CSRF/routing code, and the full
backend suite (including every Stage 4 regression test) was re-run clean
after both edits (§5).

## 3. Findings documented, not fixed this stage (with reasoning)

1. **`createOrder()`'s duplicate-active-inspection check is a read-then-insert
   race** (`legacyCompatibilityController.js::createOrder`, lines ~89–103):
   two concurrent requests from the same buyer for the same car could both
   pass the `existing` check before either insert lands, producing two
   simultaneous `requested` inspections (and two separate "KES X" inspection
   fee charges) for one vehicle. Real, but low-likelihood (requires the same
   authenticated buyer to double-click/double-submit within the query
   round-trip window) and low-blast-radius (worst case is a refundable
   duplicate fee charge, not a security or data-integrity break, and the
   buyer already sees both as "active" in `listMine`). Consistent with this
   engagement's established bar (Stage 4 fixed only the races with silent
   identity/security consequences, not every narrow double-submit window) —
   carried forward rather than fixed under this stage's own scope.
2. **The three dead `Inspection`/`InspectionPackage`/`Inspector` models**
   (`backend/models/Inspection.js`, `InspectionPackage.js`, `Inspector.js`) —
   point at `inspections`/`inspection_packages`/`inspectors` table names with
   no live controller importing them. Zero customer impact either way
   (nothing calls them); removing them is a pure, zero-risk cleanup with no
   regression surface, but it is dead-code hygiene, not a defect fix, so it
   is filed as a cleanup item in the remaining plan rather than executed
   under a "fix real defects" mandate.
3. **`getByCar()` has no ownership/role check beyond `requireAuth`** — any
   authenticated user can fetch the most recent *completed* inspection report
   for *any* car. Investigated and concluded this is almost certainly
   intentional, not a gap: a completed Ghost Check report is exactly the
   kind of pre-purchase condition information a prospective buyer of *any*
   listed vehicle should be able to see before bidding/buying (akin to a
   vehicle-history report), and the route only ever returns `completed`
   inspections (never in-progress/requested, which could leak a pending
   buyer's identity before they've committed). Documented as confirmed-
   intentional rather than fixed.
4. **`availableInspectors()` returns `name, email, phone, locationCity,
   inspectionSpecialty, averageRating, completedChecks` for every
   `ghost_checker` user** — already gated to `admin`/`superadmin` only at the
   route level (`requireRole(['admin','superadmin'])` in
   `inspection/routes/inspectionRoutes.js`); re-verified, no change needed.
5. **`inspection/controllers/legacyCompatibilityController.js`'s default
   export at the bottom of the file** (`export default { protect, adminOnly,
   ... }`) re-exports `protect`/`adminOnly` from `middleware/auth.js` for no
   apparent reason (nothing in the route file imports this controller's
   default export at all — only the named exports via `import * as legacy`).
   Harmless dead export, not a defect; noted only for completeness.

Carried forward from Stage 2/3/4 (unchanged, still not in this stage's
scope — re-affirmed as untouched): vehicle `rejected→active` mapping;
`paymentController.js::mpesaCallback`'s hardcoded-500; `completeEscrowRefund`'s
untyped RPC passthrough; dealer-dashboard raw-Supabase column bug; the
`kayad_escrow_rules_config_v1` backend-persistence redesign; the
payment-initiation idempotency-key fix. None of these have any dependency on
anything touched this stage, so per the master prompt's own instruction they
were not opportunistically fixed.

## 4. Status matrix

See `INSPECTION_STATUS_MATRIX_20261008.md`.

## 5. Validation results

- Backend jest: **42/42 suites, 606/606 tests** passing (up from Stage 4's
  41/602 — +1 new suite, +4 new tests for this stage's 2 fixes; one isolated
  transient timeout in an unrelated, pre-existing resilience test
  (`tests/resilience/failureModes.test.js`) was observed on one run and
  did not reproduce on immediate re-run — confirmed environmental flakiness,
  not a regression, by a clean full re-run showing 0 failures).
- `npx tsc --noEmit`: clean (0 errors) — no frontend code was touched this
  stage, so this is an unsurprising re-confirmation, not new evidence.
- Frontend `vitest run`: **336 passed / 11 pre-existing-unrelated failed / 1
  skipped / 348 total** — identical to Stage 3/4's documented baseline
  (`VehicleMarketplace.test.tsx` accessible-name mismatches and others
  already on record); no new failures introduced.
- `npm run build`: clean, exit 0.
- Relevant existing validators, all re-run and all passing:
  `validate:inspection-marketplace` (37/37 PASS), `validate:inspection-domain-rls-enablement`
  (8/8 tables enabled, 0 inert-policy tables), `validate:inspection-qa-contract`
  (10/10 PASS), `validate:canonical-architecture` (10/10 PASS — explicitly
  confirms "single canonical inspection router," "no second inspection router
  implementation is mounted," "legacy compatibility uses canonical
  vehicle_inspections"), `validate:high-risk-boundaries` (10/10 PASS),
  `node scripts/validate-inspection-chat-realtime-e2e.mjs` (10/10 PASS —
  no npm script alias exists for this one; run directly, same as the script
  file itself would be run by CI).

## 6. Exit-criteria questions (23), answered with evidence

1. **Is the canonical inspection system identified correctly?** Yes —
   `vehicle_inspections` / `InspectionOrder` for Ghost Check;
   `inspection_bookings` (+ its satellite tables) for the Marketplace. Both
   confirmed canonical for their own domain by `validate:canonical-architecture`
   and direct controller/model reads (§1 here, full detail in the
   Architecture Convergence doc).
2. **Is the legacy system identified, and is it reachable?** The only truly
   "legacy" (unused) artifacts are the three dead models in §3.2 — not
   reachable from any controller. The "LEGACY API COMPATIBILITY" routes in
   `inspection/routes/inspectionRoutes.js` are reachable and canonical (they
   delegate to `vehicle_inspections`, not a separate store) — "legacy" there
   names the *API contract* being preserved for old clients, not a legacy
   data model.
3. **Can data move unsafely between the two systems?** No — confirmed no
   code path reads one system's tables while authorizing against the
   other's identity, and the RLS/chat/high-risk-boundary validators all
   pass (§5).
4. **Is the canonical inspection identity (and its binding to a vehicle)
   consistent everywhere?** Yes for Ghost Check (`car_id` on every row,
   checked via `Car.findById` in the relevant handlers); Marketplace binds to
   `vehicle_vin`/`vehicle_registration` by design (no KAYAD listing FK,
   confirmed intentional — it serves vehicles that may not be KAYAD
   listings at all).
5. **Who can create an inspection request?** Ghost Check: any authenticated
   buyer, for a real car, one active request per car at a time (modulo the
   race in §3.1). Marketplace: any authenticated customer, against an
   active+verified provider's active package.
6. **Who can assign a provider/inspector?** Ghost Check: admin/superadmin
   only (`assign()`). Marketplace: the owning provider (`requireProviderOwnership`)
   or admin (`assignInspector`).
7. **Who can perform the inspection work (write checklist/evidence)?** Ghost
   Check: the assigned inspector or admin, only once `in_progress`
   (`submit()`'s precondition, unchanged). Marketplace: provider/staff via
   `reportService.createReport`, booking-status-gated.
8. **Who can submit/complete an inspection?** Same actors as above; Ghost
   Check's `submit()` precondition (`status==='in_progress'`) prevents
   double-submission; Marketplace's explicit `validTransitions` allow-list
   does the same structurally.
9. **Who can verify/approve a completed inspection?** Marketplace has an
   explicit QA layer (`inspection_quality_audits`,
   `inspection_report_amendments`) confirmed present and migration-backed by
   `validate:inspection-qa-contract` (PASS). Ghost Check has no separate
   verification step — `submit()` is terminal; this is an intentional
   product-simplicity difference, not a gap, given Ghost Check's narrower
   scope (one inspector, one report, no dispute workflow).
10. **Who can access evidence/documents, and is that checked on every read?**
    Yes on both systems — `assertAccess()` (Ghost Check) and
    `reportService.getReportDetails()`'s `isAdmin`/`isCustomer`/`isProvider`
    check (Marketplace), both re-verified by direct read this stage (§1 of
    the Architecture Convergence doc, "Evidence / cross-boundary risk").
11. **Is there any evidence cross-boundary risk?** No — see the same section;
    no shared evidence store, no shared identity check, no code path reading
    across the boundary.
12. **Is status-transition authority correctly scoped (no client can force
    an illegal transition)?** Yes after this stage's fixes — see the Status
    Matrix; every transition in both systems now has an explicit
    precondition or allow-list check.
13. **Is duplicate-operation (replay) safety handled?** Mostly yes — `assign`/
    `submit`/Marketplace's allow-list all reject replays by construction;
    `createOrder`'s narrow race (§3.1) and the Marketplace's slot-collision
    check are the two softer spots, both pre-existing/carried forward, not
    newly introduced.
14. **Is customer-facing status truthful (no silent mismatch between what
    happened and what's displayed)?** Yes, and more truthful than before
    this stage — Finding 1's fix directly prevents a completed report from
    silently reverting to "in progress" in the buyer's own view.
15. **Is the auction/listing inspection ID always the correct, bound ID (no
    `useParams()` reintroduction, no client-supplied ID override)?** Checked
    directly — Ghost Check's frontend consumer
    (`src/features/InspectionsView.tsx`, `src/services/inspectionApi.ts`)
    was not touched this stage and was not implicated in the Stage 3
    `useParams()` defect (confirmed via grep: no `useParams()` call exists
    anywhere under `src/features/Inspection*` or `src/pages/inspector/`); no
    client-supplied identity override risk found (every handler re-derives
    identity from `req.user.id`, never trusts a body-supplied user/buyer id).
16. **Does RLS agree with application-level authorization (no silent
    mismatch)?** Yes — `validate:inspection-domain-rls-enablement` confirms
    RLS enabled on all 8 Marketplace tables with 0 inert-policy tables;
    Ghost Check's `vehicle_inspections` table RLS was already certified in
    an earlier stage per the carried-forward note in
    `AUCTION_360_REMAINING_PLAN_20261007.md` (Item 1 of Stage 1, "now backed
    by a working RLS layer").
17. **Is every provider operation (assign/report/settle/share) server-
    authorized, not reliant on a hidden frontend control?** Yes — every
    `:providerId`-parameterized route carries `requireProviderOwnership`;
    re-verified directly against the full route list in
    `inspection/routes/inspectionRoutes.js`, not assumed.
18. **Does a notification failure ever block or corrupt the underlying
    operation?** No — every `emitCommunication(...)` call in
    `legacyCompatibilityController.js` is `.catch(() => {})`-guarded,
    confirmed unchanged and correct this stage; the operation's own database
    write always completes and is returned to the caller before the
    notification promise settles.
19. **Were all real defects found this stage fixed and tested?** Yes — both
    (§2), each with a dedicated regression test verified via the revert →
    confirm-fail → restore → confirm-pass discipline, and the full backend
    suite re-run clean afterward.
20. **Was any second auth/session/CSRF/routing mechanism introduced?** No —
    both fixes reuse `req.user.id`/`req.user.role` exactly as every other
    certified handler in this file already does; no new middleware, no new
    identity source.
21. **Is any carried-forward item from Stage 2/3/4 silently dropped?** No —
    all re-affirmed untouched in §3 (final paragraph) and still tracked in
    `AUCTION_360_REMAINING_PLAN_20261007.md`.
22. **Is an architecture migration required?** No — see
    `INSPECTION_ARCHITECTURE_CONVERGENCE_20261008.md` §4's direct conclusion.
23. **What remains environment-dependent (not certifiable from source
    alone)?** Live Postgres/Supabase RLS enforcement at the database-server
    level cannot be certified without a live database connection — the RLS
    validators here check that migrations exist and enable RLS with
    non-inert policies (source-level certification), not that the policies
    behave correctly against a running Postgres instance with real rows.
    This is the same category of limitation already on record for every
    prior stage (Stage 3/4's own equivalent caveat) — not newly discovered,
    not newly blocking.

## 7. Closing

**STAGE 5 — INSPECTION / PROVIDER OPERATIONS / EVIDENCE / WORKFLOW
CONVERGENCE: COMPLETE.** 2 real defects found and fixed with regression
tests; 5 further findings documented and intentionally not fixed, with
reasoning; no architecture migration required; the "legacy vs canonical"
question that has sat on the carried-forward list since Stage 2 is now
resolved with direct evidence rather than left open. Stage 6 (escrow/
purchase/fulfilment) may now begin.
