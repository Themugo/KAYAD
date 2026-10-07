# KAYAD Auction 360 — Execution Log
Date: 2026-10-07
Scope: continuation of the P0/P1 source-level trust-boundary sweep per the
16-stage "CONTINUE KAYAD BUILD FROM THE CURRENT STATE — DO NOT RESTART" master
prompt. This log covers only this pass's work: it continues from, and does not
re-litigate, the prior session's P0/P1 certification (`car.set` crash +
auction-term lock fix, winner-payment/deadline race fix — both already PASS
and carried forward unchanged).

## What this pass covered

Stage 1 of the 16-stage prompt — the 3 items the prior certification left as
`NOT YET TRACED`:
1. Vault-funding callback path
2. Escrow-action route idempotency breadth (surfaced while tracing #1)
3. Notification-layer idempotency breadth beyond B2C
4. Exhaustive per-table/per-role RLS matrix

Stages 2–16 were not started this pass (explicitly gated: Stage 2 begins only
once Stage 1 is fully clean, which it now is as of this log).

## Findings and fixes, in the order traced

### Finding 1 — dead "vault funding" idempotency branches
**Trace**: `escrow_vault_funded`/`escrow_vault_init`/`escrow_vault_release`
key-generation branches existed in `backend/middleware/idempotency.js`,
referencing `bankRef`/`otp`-based request fields.
**Root cause**: grepped `bankRef|vault|otp` and `escrow_vault` across every
`backend/routes/*.js` and `backend/controllers/*.js` — zero matches outside
`idempotency.js` itself. No route, controller, or service implements a "vault
funding" feature. The branches were unreachable dead code.
**Classification**: SOURCE-LEVEL FINDING — FIXED (removed).
**Risk if left**: Low — purely cosmetic/misleading (implies coverage for a
feature that doesn't exist), no live code path reaches it.

### Finding 2 — escrow action routes share/lack idempotency keys
**Trace**: while removing Finding 1's dead branches, examined every live
branch of `extractOperationType()` and the key-generation `if/else` chain
immediately below it.
**Root cause** (two-part):
- `path.includes("/release")` matched both `/api/escrow/:id/release` (admin,
  financially authoritative) and `/api/escrow/:id/request-release` (buyer,
  a non-financial nudge) — same operationType, same would-be idempotency key
  space, for two structurally different actions. Same pattern for
  `/refund` vs. `/refund/:refundId/complete`, and for a less severe case,
  `/confirm-vehicle` vs. `/confirm-delivery` were already path-distinct but
  had no deterministic key logic of their own.
- None of `escrow_release`, `escrow_refund`, `escrow_confirm_vehicle`,
  `escrow_confirm_delivery`, `escrow_request_release` had a deterministic
  key-generation branch in the `idempotencyCheck` middleware, so every call
  fell through to `generateIdempotencyKey("auto")` — a fresh random key each
  time. Confirmed via grep that the frontend never sends its own
  `x-idempotency-key` header for these either, so there was no other source
  of a stable key.
**Impact assessment**: traced through `escrowController.js` → confirmed
`req.idempotencyKey` is forwarded to `escrow.service.js` → `atomicTransitionEscrow`
→ `kayad_transition_escrow_atomic`. That RPC is `FOR UPDATE` row-locked with an
explicit FROM/TO transition table and its own idempotency-key short-circuit,
so a genuine duplicate release/refund/confirm was independently rejected by
the DB regardless of this bug. **Classified as a UX/graceful-retry defect,
not a financial-integrity defect**: a legitimate retry (e.g. a flaky network
after a release actually succeeded) got a fresh random key and therefore a
noisy error response instead of the intended clean idempotent 200, rather than
ever causing a double-release/double-refund.
**Fix**: reordered `extractOperationType` for specificity (most-specific
checks first), added the 6 missing deterministic key-generation branches,
updated `CRITICAL_LOCK_OPERATIONS`.
**Regression coverage**: new file
`backend/tests/security/escrowIdempotencyKeys.test.js`, 8 cases covering both
the path-classification logic and the full middleware's key-generation
behavior (including that a literal retry produces the identical key, not a
new one).
**Verification**: target file — 8/8 pass. Full backend suite — 30/30 suites,
571/571 tests pass (up from the 563-test baseline + this file's 8 new cases).
Validators: `validate-escrow-next-hardening` (14/14), `validate-phase38`
(independently confirms "Legacy escrow_vaults runtime dependency: RETIRED"),
`validate-recovery-repair` (19/19), `validate-response-lifecycle` — all PASS.
A mock-ordering bug was hit and fixed mid-way (Jest ESM
`jest.unstable_mockModule` calls must precede any import, static or dynamic,
of the module under test or its dependency graph, because ESM imports are
cached per specifier — a premature real import poisons every later import of
that specifier within the same test file); the final file registers every
mock before a single shared dynamic import.
**Classification**: SOURCE-LEVEL FINDING — FIXED.

### Finding 3 — notification-layer idempotency: re-traced, confirmed real (not a gap)
**Trace**: read `backend/services/communicationGateway.service.js::deliver()`
end to end and the full migration history of `communication_deliveries`.
**Result**: this is genuinely implemented, not a gap. `deliver()` derives a
deterministic `idempotencyKey` from `${eventType}:${eventIdentity}:${channel}`
(`eventIdentity` pulled from `metadata.paymentId`/`escrowId`/`bidId`/
`bookingId`/etc.), checks `findOne` before inserting, and falls back to
catching Postgres `23505` (unique-violation) as a race-safety net. This is
backed by a real partial unique index,
`uq_communication_delivery_idempotency ON communication_deliveries(provider,
channel, idempotency_key) WHERE idempotency_key IS NOT NULL`
(`20260930111500_advanced_communication_idempotency.sql`), plus a second
unique index on `(provider, provider_event_id)` for inbound delivery-status
callbacks. Independently corroborated by the existing
`validate-high-risk-boundaries.mjs` validator, which already asserted
"communication delivery persists idempotency and serializes provider
callbacks" and passes.
**Classification**: SOURCE-LEVEL PASS. The prior pass's "NOT YET TRACED" here
reflected that this path simply hadn't been read yet, not a real defect.
**No code change made** — per change discipline, source that is already
correct is left untouched.
**Side finding (STALE validators, not a source defect)**: two existing
validator scripts, `verify-communications-comm-13-17.mjs` and
`verify-production-communications-integration-360.mjs`, throw `ENOENT` —
they reference a migration filename and a Supabase edge-function file that do
not exist anywhere in this repository tree. This is the same class of
pre-existing/unrelated staleness already documented for
`verify-migration-deployment-static.mjs`/`verify-migration-integrity.mjs` in
the prior pass (confirmed by the same method: the referenced paths don't
exist regardless of any change made this pass or last). Flagged as STALE,
not fixed — fixing a validator's own file references is out of this sweep's
scope unless it was itself masking a real defect, which it is not (the
feature it's meant to check is independently confirmed correct above).

### Finding 4 — exhaustive RLS matrix, and a real gap it surfaced
**Trace**: wrote a one-off parser (chronological/document-order scan of all
160 migration files, tracking `CREATE POLICY` / `DROP POLICY` /
`ALTER TABLE ... ENABLE|DISABLE ROW LEVEL SECURITY` in the order they actually
execute — critically, NOT a naive two-pass scan, which misreads the common
`DROP POLICY IF EXISTS x; CREATE POLICY x ...` idempotent-recreate idiom as
"created then dropped") to build the final live RLS state for every table in
the schema.
**Result (the matrix)**: of ~150 RLS-relevant tables, every financial or
PII-bearing one is either (a) RLS-enabled with zero policies — deny-all for
`anon`/`authenticated`, which is safe because `backend/utils/supabase.js` is
the only place in the codebase that calls `createClient`, and it always
authenticates as `service_role` (bypasses RLS unconditionally) — or (b)
RLS-enabled with explicit, correctly-scoped owner/role policies. CMS/marketing
tables are intentionally public-read and out of scope.
**The gap**: 8 inspection-domain tables
(`inspection_bookings`, `inspection_disputes`, `inspection_quality_audits`,
`inspection_report_amendments`, `inspection_reports`, `inspection_reviews`,
`inspection_staff`, `inspection_status_history`) have 18 carefully-written,
per-role `CREATE POLICY` statements from
`20260918130000_inspection_domain_rls_hardening.sql` — but RLS was never
enabled on any of these 8 tables, in any migration, ever (traced back to their
original `CREATE TABLE` statements in two separate migrations). A policy on a
table with RLS disabled is inert: Postgres does not evaluate it. These 18
policies have done nothing, silently, since they were written.
**Impact assessment**: not currently exploitable — the same service_role-only
access-path invariant that protects every other table applies here too, so no
live request path is affected today. But it is a real loss of
defense-in-depth specifically on inspection records (which include personal
and settlement/financial data), and it directly undercuts the confidence of
Item 1's "inspection document access control" certification, which was PASS
on application-layer evidence (`reportService.js`) alone — this gap meant the
DB-level layer that was supposedly backing it up wasn't actually there.
**Fix**: new migration `20261007200000_inspection_domain_rls_enable.sql` —
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for exactly these 8 tables. No
policy added, changed, or removed.
**Regression coverage**: new validator
`scripts/validate-inspection-domain-rls-enablement.mjs` (registered as
`npm run validate:inspection-domain-rls-enablement`) — confirms the fix
migration enables RLS on exactly the 8 named tables and touches no policy,
and separately re-scans the entire migration tree for any table anywhere
with a defined policy but RLS left off, so this exact class of defect cannot
silently reappear through a future migration (with an explicit, documented
exemption for intentionally-public CMS tables).
**Verification**: new validator — PASS (8/8 enabled, 0 inert-policy tables
found tree-wide). Re-ran `validate-migration-hygiene` (160 files, PASS),
`validate-supabase-migrations` (160 files, PASS),
`validate-financial-audit-rls-hardening` (7/7 PASS),
`validate-inspection-marketplace` (37/37 PASS),
`validate-inspection-qa-contract` (PASS), `validate-wave2-invariants` (PASS) —
all green, confirming no regression from adding this migration.
`verify-migration-deployment-static.mjs`/`verify-migration-integrity.mjs`
still fail identically to their already-documented pre-existing/unrelated
state.
**Classification**: SOURCE-LEVEL FINDING — FIXED.

## 1. Files changed this pass

- `backend/middleware/idempotency.js` — reordered path classification,
  added 6 deterministic idempotency-key branches, removed 3 dead branches,
  updated `CRITICAL_LOCK_OPERATIONS`.
- `backend/tests/security/escrowIdempotencyKeys.test.js` (new) — 8 tests.
- `supabase/migrations/20261007200000_inspection_domain_rls_enable.sql` (new)
  — enables RLS on 8 inspection tables.
- `scripts/validate-inspection-domain-rls-enablement.mjs` (new) — validator.
- `package.json` — registered
  `validate:inspection-domain-rls-enablement` script.
- `P0_P1_SOURCE_CERTIFICATION_20261007.md` — updated with this pass's 2
  findings/fixes, re-traced notification-idempotency evidence, the exhaustive
  RLS matrix, and refreshed summary counts.

No other source file was touched. No architecture was changed. No duplicate
implementation was created.

## 2. Tests added/changed

- `backend/tests/security/escrowIdempotencyKeys.test.js` — new, 8 cases.
- No existing test was modified or weakened.

## 3. Validators run and passed this pass

`validate-escrow-next-hardening` (14/14), `validate-phase38`,
`validate-recovery-repair` (19/19), `validate-response-lifecycle`,
`validate-migration-hygiene` (160 files), `validate-supabase-migrations`
(160 files), `validate-financial-audit-rls-hardening` (7/7),
`validate-inspection-marketplace` (37/37), `validate-inspection-qa-contract`,
`validate-wave2-invariants`, `validate-high-risk-boundaries` (10/10),
`validate-inspection-domain-rls-enablement` (new, 8/8).

Full backend jest suite: 30/30 suites, 571/571 tests.

## 4. Remaining source-level risks

None open at Stage 1 scope. See the certification document's "Remaining
before Stage 2 begins" section for the (infrastructure-only) residual items.

## 5. Infrastructure blockers

- Both new migrations (this pass's RLS-enable migration, and the prior
  round's winner-payment/deadline-lock migration) have been reviewed for
  correctness but not executed against a real Postgres/Supabase instance —
  none is available in this sandbox. ENVIRONMENT BLOCKED.
- Root `npm install` fails in this sandbox: `package.json` requires
  Node `>=22.22.2`, sandbox runs `v22.22.0`. This blocked a fresh
  `tsc --noEmit` run at the repo root this pass. The backend's own
  already-installed `node_modules` was unaffected and ran the full jest
  suite cleanly; this change touched no frontend/TypeScript source, so the
  blocker has no bearing on verifying this pass's actual changes. ENVIRONMENT
  BLOCKED (should be re-run in a matching Node version before Stage 8).

## 6. UX work completed

None — out of scope for Stage 1 (backend/source hardening only).

## 7. UX work remaining

All of Stages 8–14 (frontend auction experience, desktop UX, mobile UX,
typography, iconography, accessibility, performance) — explicitly gated until
backend/source integrity is clean, which it now is as of this log.

## 8. Production certification still required

- Stage 2 (API contract convergence) through Stage 7 (admin/operations) —
  not started this pass.
- Live/environment certification of both new migrations once a real
  Postgres/Supabase instance is available (see "Infrastructure blockers").
- A full root-level `npm install` + `tsc --noEmit` + build in an environment
  matching the repo's declared Node engine, before Stage 8 begins.
