# R17 — Continued audit and validation-contract corrections
**Baseline:** `KAYAD-FULL-CORRECTED-2026-11-14-R16.zip`  
**Prepared:** 14 November 2026  
**Scope:** Continue source audit, correct stale static validation contracts, and assess build/test readiness.  
**Change control:** No commit, push, merge, deployment, live database mutation, or provider operation was performed.

## Corrections made

### 1. Navigation convergence validator
The validator expected an older hard-coded `protectedNavs` set and omitted `dealership-workspace`, which is present in the current application. The production code already gates this destination through the `protectedNavs` effect and backend admin routes remain protected by `router.use(protect, adminOnly)`.
- Updated the validator to parse the current Set contents, require all expected protected destinations, and verify the backend admin guard.
- Result: `validate:navigation-convergence` now passes 43/43.

### 2. Registration role matrix validator
The validator expected retired registration behavior:
- It expected a literal `role === "dealer" && !businessName` guard, while the implementation validates the dealer business name with `validateCompanyName(...)` and rejects invalid values using the returned validation result.
- It expected legacy `individual_seller` to be preserved as a created role, while the current approved policy maps that legacy public registration request to canonical `user`, records a deprecation signal, and retains existing legacy accounts through compatibility services.
- Updated the static validator to assert the actual server-side company-name validation and the current legacy-to-user compatibility contract.
- Result: `validate:registration-role-matrix` now passes 34/34.

These were stale validator expectations, not production-code changes. No production behavior was altered to satisfy the tests.

## Continued audit results

Passed source-level checks:
- `validate:business-ownership-and-mobile-nav`
- `validate:unified-mobile-menu`
- `validate:kayad-navbar-branding`
- `validate:phase13e-listing-visibility`
- `validate:migration-hygiene` — 198 migration files scanned; no exact duplicate migration bodies or duplicate table creators
- `validate:admin-route-convergence` — 14/14
- `validate:navigation-convergence` — 43/43
- `validate:registration-role-matrix` — 34/34
- `validate:system-handover-core` — 14/14
- `validate:security-finance-release` — 16/16 (source-only; live certification remains separate)
- `validate:write-route-coverage` — 76/76
- `validate:domain-lifecycle-integrity`
- `validate:owner-identity-convergence` — 7/7
- `validate:master-identity-authz-corrections` — 14/14
- `validate:database-contract-alignment` — 8/8
- `validate:runtime-integrity` — 7/7
- `validate:deployment-readiness`
- `validate:production-backend` — 12/12
- `validate:dependency-security`
- `node --check` across 1,500 backend/scripts JavaScript and MJS files — 0 syntax failures

## Build and test blockers

The supplied environment has Node `v22.16.0`; this repository requires Node `>=22.22.2`. `npm ci` refuses under strict engine enforcement. Retrying with engine strictness disabled did not complete within the available execution window; offline installation also fails because the npm cache does not contain `zod-validation-error@4.0.2`.

Therefore:
- `npm run build` is BLOCKED because Vite is not installed (`vite: not found`).
- `npm run typecheck` is BLOCKED by missing installed packages/types (React, lucide-react, Sentry, PostHog, web-vitals, etc.); the reported type errors are not a valid source-code diagnosis until dependencies are installed.
- `npm run validate:phase13f` is BLOCKED because backend test dependencies are not installed.
- Backend Jest/Vitest and frontend Vitest have not been run in this pass.

Do not treat these as passing builds or test suites. Re-run on Node 22.22.2+ with network access and clean `npm ci` in both root and `backend`.

## Further items requiring live or full-runtime proof

1. Public listing cache invalidation after single/bulk approval must be verified against the configured cache provider and public API, not only source checks.
2. Test actual seller ownership boundaries with two separate dealer/user identities and an admin token. Verify admin moderation can hide/approve but cannot delete or transfer seller inventory.
3. Test mobile header/drawer/bottom dock at 320, 360, 390, 430px and desktop widths with browser automation and real devices.
4. Verify GitHub repository settings directly: branch protection, required CI checks, and repository-level auto-merge. ZIP changes cannot change remote repository settings.
5. Verify Supabase migration ledger/schema, RLS, live authentication, payment providers, communications and worker execution separately. No production database or provider was contacted in this audit.

## Next required execution

On a clean machine or the user's Windows environment:
1. Install Node `22.22.2` or newer.
2. Run `npm ci` from repository root.
3. Run `npm run typecheck`, `npm test -- --run`, and `npm run build`.
4. Run `npm ci` in `backend`.
5. Run focused backend regressions and then the complete Jest suite.
6. Stop and preserve logs on any failure; do not deploy until all required gates pass.
