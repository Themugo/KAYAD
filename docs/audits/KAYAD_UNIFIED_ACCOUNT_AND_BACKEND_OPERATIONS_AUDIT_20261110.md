# KAYAD — Unified Account, Onboarding and Backend Operations Audit

**Date:** 10 November 2026  
**Baseline:** `KAYAD-CERTIFICATION-GAP-CLOSURE-1110.zip`  
**Scope:** Next audit pass after public-surface and certification-gap work. Focused on unified account registration, private-seller capability, dealer onboarding, provider application boundaries, communication secret handling, and backend financial/operational source contracts.

## Executive result

The implementation reflects KAYAD's current one-personal-account model. A personal `user` account retains buyer access and can separately request private-seller capability; dealer and provider capabilities have their own approval/onboarding journeys. Four existing source validators still asserted the retired registration model and reported false failures. Those validators have been corrected to check the current implementation. No application runtime behavior, database migration, dependency manifest, lockfile, or production configuration was changed in this pass.

## Fixes made

### 1. Registration role matrix validator

Updated `scripts/validate-registration-role-matrix.mjs` to assert:
- A private seller is not a separate public registration card/role.
- Legacy seller intent maps to the canonical personal `buyer` registration flow (`backendRole: user`).
- The personal account explains that private-selling access is separately requested and approved.
- Private selling does not require dealer business fields.
- Dealer registration still requires dealership name and location, and dealer completion remains distinct.

Result: **33/33 PASS**.

### 2. Registration/onboarding validator

Updated `scripts/validate-registration-onboarding.mjs` to verify:
- Private selling is represented as an approved capability on a personal account.
- The capability service restricts application to the canonical `user` role.
- Professional registration creates a personal account before the provider application, rather than invoking the retired standalone inspector application from registration.

Result: **47/47 PASS**.

### 3. Dealer onboarding end-to-end validator

Updated `scripts/validate-registration-onboarding-e2e-contract.mjs` to match the actual route contract:
- `GET /api/dealer/onboarding` and `PUT /api/dealer/onboarding` are available to the explicit `APPLICANT_ROLES` set (`dealer`, `user`) before the approved-dealer middleware boundary.
- The submitted documents are validated against the current server-owned paperwork policy.
- Only the accepted document set is passed to `submitDealerVerification`.

Result: **14/14 PASS**.

### 4. First-seller communication/secret-handling validator

Updated `scripts/validate-first-seller-launch-contract.mjs` to check the current secret-redaction implementation rather than an obsolete helper signature. It now asserts that secret-bearing event bodies/subjects are omitted, metadata is restricted to safe trace/boolean/source-event values, provider acceptance is not misreported as delivery, and verification delivery remains asynchronous after atomic account creation.

Result: **8/8 PASS**.

## Wider regression sweep

The following source-level validators passed in this run:

- Registration role matrix — 33/33
- Registration/onboarding — 47/47
- Registration/onboarding E2E contract — 14/14
- First-seller launch and secret handling — 8/8
- Unified onboarding model
- Private-seller listing workflow
- Dealer verification onboarding
- Provider business center
- Inspection marketplace — 37/37
- Domain lifecycle integrity
- Email reliability — 8/8
- Email-only launch — 11/11
- Optional production integrations — 4/4
- Financial audit RLS hardening — 7/7
- Financial ledger reconciliation — 13/13
- Financial ledger sign convergence — 8/8
- High-risk boundaries
- Payment/escrow domain — 9/9
- Payment gateway lifecycle — 13/13
- Runtime convergence — 7/7
- Migration hygiene — 194 migration files scanned; no exact duplicate bodies or duplicate table creators
- Worker runtime — 9/9
- Session availability — 7/7
- API availability — 8/8
- Deployment readiness
- Production backend — 12/12
- Runtime integrity — 7/7

Changed validator JavaScript syntax checks passed.

## Environment and external blockers

- The repository declares Node `>=22.22.2`; this environment has Node `v22.16.0`. Do not lower the engine requirement or mutate the lockfiles to bypass it.
- `node_modules` is absent/incomplete, so the Vite build, TypeScript compiler, Vitest/Jest suites and route-based browser runs were not performed.
- Canonical email provider is Brevo and email/SMS provider certification reports email and SMS as not configured in this execution environment. The optional-integration source contract passes, but real delivery is not certified.
- No live Supabase migration replay, RLS role test, payment callback, M-Pesa sandbox/UAT, provider callback, worker queue or production database reconciliation was run.
- No secrets or environment files were added to the package.

## Risks / next owner actions

1. Install dependencies in CI using Node `>=22.22.2` and the committed lockfile, then run typecheck, build and full unit/integration suites.
2. Supply approved non-production Brevo credentials and perform registration verification/resend, reset, notification and delivery webhook UAT. Do not put secrets in source control.
3. Run the migration replay and database RLS/ledger test suite against a fresh disposable PostgreSQL/Supabase database, then compare migration history against staging/production.
4. Run M-Pesa sandbox callback/replay/amount-mismatch/refund scenarios and reconcile provider statements with the canonical ledger.
5. Run browser E2E for personal buyer -> private-seller application -> admin decision -> listing creation; personal buyer -> dealer application -> paperwork -> verification; personal account -> garage/inspection provider application -> admin approval; and professional affiliation.
6. Add a dedicated notification policy for private-seller capability submissions only if the product owner confirms which staff roles/channels should receive those alerts. Current route persists the application and audit event; this pass did not invent new notification recipients or policy.

## Change boundary

Only four validation scripts were changed. No application source, database migration, runtime feature flag, dependency manifest, lockfile, CI workflow, deployment target or environment secret was changed. No migration was applied; no commit, push or deployment was performed.

**Release assessment:** onboarding and backend source contracts are aligned and passing. Runtime, live provider, database and browser certification remain open and must not be represented as completed.
