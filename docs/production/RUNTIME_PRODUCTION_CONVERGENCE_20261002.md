# KAYAD Runtime & Production Convergence Sweep — 2026-10-02

## Foundation

Exact working foundation:
`KAYAD-HIGH-RISK-BOUNDARY-HARDENED-FOUNDATION-20261002.zip`

This sweep preserves the previous high-risk boundary hardening and adds only runtime-convergence fixes identified during the audit.

## Static/source certification

### New runtime convergence gate
- `validate:runtime-convergence` — **7/7 PASS**

Coverage:
- concurrent ledger idempotency insert race
- deterministic ledger account locking
- same-account ledger rejection
- concurrent M-Pesa webhook receipt creation
- long-running M-Pesa webhook lock window
- large inventory synchronization lock window
- production lock fallback protection

### Existing gates rerun
All of the following returned **PASS / exit 0**:

- high-risk boundaries
- financial audit RLS hardening
- payment gateway lifecycle
- payment/escrow domain
- transactions & money
- database contract alignment
- domain lifecycle integrity
- refresh reuse integrity
- Wave 2 invariants
- Wave 3 convergence
- canonical architecture
- deployment readiness
- backend runtime contracts
- production backend
- runtime integrity
- startup convergence
- foundation integrity
- deployment/runtime drift
- private upload cache
- passport authorization

## Fixes applied

### 1. Canonical ledger RPC concurrency hardening
Added migration:
`supabase/migrations/20261002130000_runtime_convergence_financial_locks.sql`

The canonical `kayad_post_ledger_entry_atomic` RPC now:
- uses `ON CONFLICT (external_reference, source) DO NOTHING` to close the concurrent check-then-insert race;
- returns the existing canonical event on concurrent replay;
- locks debit/credit accounts in deterministic code order to reduce cross-account deadlocks;
- rejects zero/negative amounts, blank event identity and same-account postings;
- remains service-role-only.

No second ledger implementation was introduced.

### 2. M-Pesa webhook receipt concurrency
Updated:
`backend/services/paymentFinancialLifecycle.service.js`

The receipt path now:
- serializes identical provider webhook identities with the distributed lock;
- uses the provider-specific event source in the lookup;
- recovers cleanly from a unique-key race;
- preserves retry semantics for an existing unprocessed receipt;
- uses a bounded 120-second lock window.

### 3. Inventory webhook lock window
Updated:
`backend/routes/webhookRoutes.js`

The existing replay-protected inventory path now uses a 300-second lock window so a maximum-size synchronization batch is less likely to outlive the distributed lock.

## Runtime certification blocker

A full dependency-backed runtime certification could **not** be completed in this execution environment.

Current runtime:
- Node: `v22.16.0`
- npm: `10.9.2`

Project requirement:
- Node `>=22.22.2`

`npm ci --ignore-scripts --offline --engine-strict=false` was attempted, but the local npm cache did not contain `zod-validation-error@4.0.2`.
A normal online `npm ci` attempt timed out.

Because dependencies were therefore incomplete:
- `npm run typecheck` could not complete;
- `npm run build` could not complete (`vite` unavailable);
- Jest/Vitest runtime tests could not complete;
- `validate:local-runtime` failed because `dotenv` was unavailable.

These are **environment/dependency-installation blockers**, not source-validation failures. They must not be represented as runtime PASS.

## Important remaining live certification

Still required on a machine/CI environment with Node >=22.22.2 and access to the required services:

1. `npm ci`
2. typecheck
3. production build
4. frontend/backend tests
5. real staging Supabase migration chain
6. live RLS matrix
7. Playwright buyer/dealer journeys
8. M-Pesa sandbox callback/replay/concurrency tests
9. Brevo/Africa's Talking/Twilio provider certification
10. Redis/distributed-lock certification
11. complete payment → escrow → ledger → ownership transaction
12. production deployment verification

## Decision

**Source/static convergence: PASS.**

**Runtime certification: BLOCKED BY EXECUTION ENVIRONMENT.**

The foundation is suitable for the next runtime-capable certification environment without reverting the hardening work.
