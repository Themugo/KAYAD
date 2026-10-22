# KAYAD Clean Foundation — Consolidated Correction and Verification Report

Date: 2026-10-12  
Base archive: `kayad-stage36-dealer-convergence.zip`  
Base SHA-256: `f83684ee763151d0805af7b6ed4826ad0dbbadea358d429836c3f7f0f464c233`

## Scope and preservation

This package is based on the supplied Stage 36 archive. It preserves the existing marketplace, canonical dealer dashboard, auction/showroom, navigation, and existing architecture. No new marketplace or parallel domain implementation was introduced. The existing `KAYAD_DEALER_VALIDATION_MATRIX.tsv` was preserved.

## Consolidated corrections in this package

1. Restored the missing, secret-free `.env.production.example` frontend contract with values confirmed by the current repository validators: `VITE_PUBLIC_URL=https://www.kayad.space`, `VITE_API_URL=/api`, and `VITE_SOCKET_URL=https://api.kayad.space`.
2. Updated `.gitignore` to explicitly allow `.env.production.example` to be committed, matching the intended tracked-template contract.
3. Corrected `scripts/validate-homepage-convergence.mjs`: the prior assertion expected `heroSourceVehicles` to return `heroVehicles` directly, but the current implementation intentionally supports admin-selected real featured vehicles and an explicitly configured visual-showcase fallback. The validator now checks those actual semantics and verifies showcase items remain presentation-only rather than live inventory.
4. Added `backend` npm script `test:dealer-schema-regression` to invoke the targeted R12/R14 Jest regression test using the project's required `--experimental-vm-modules` flag. Calling `npx jest` directly bypasses this repository configuration and produced the reported ESM parse error; no application source change was justified by that command alone.

## Validation results executed against this extracted package

| Check | Result | Evidence / limitation |
|---|---|---|
| Registration/onboarding source gate | PASS 47/47 | `scripts/validate-registration-onboarding.mjs` |
| Deployment readiness contract | PASS | `scripts/validate-deployment-readiness.mjs` |
| Production host contract | PASS | `scripts/validate-production-host-contract.mjs` |
| Homepage convergence contract | PASS 9/9 | `scripts/validate-homepage-convergence.mjs` after correcting the stale assertion |
| Canonical architecture contract | PASS | `scripts/validate-canonical-architecture.mjs` |
| Dealer modal convergence | PASS | `scripts/validate-dealer-modal-convergence.mjs` |
| Database contract alignment | PASS 8/8 | `scripts/validate-database-contract-alignment.mjs` |
| Domain lifecycle integrity | PASS | `scripts/validate-domain-lifecycle-integrity.mjs` |
| Explicit auth flows | PASS | `scripts/validate-explicit-auth-flows.mjs` |
| Registration role matrix | PASS 33/33 | `scripts/validate-registration-role-matrix.mjs` |
| High-risk boundaries | PASS | `scripts/validate-high-risk-boundaries.mjs` |
| Runtime convergence static gate | PASS 7/7 | `scripts/validate-runtime-convergence.mjs` |
| Migration hygiene | PASS, 181 migrations | No exact duplicate migration bodies or duplicate table creators |
| Supabase migration static preflight | PASS, 181 unique versions | This is static validation only, not a live database migration |
| Backend runtime contracts | PASS 14/14 | `scripts/validate-backend-runtime-contracts.mjs` |
| Socket contract | PASS | `scripts/validate-socket-contract.mjs` |
| Navigation convergence | PASS 43/43 | `scripts/validate-navigation-convergence.mjs` |
| Stage 34 showroom icons | PASS 16/16 | `scripts/validate-stage34-showroom-icons.mjs` |
| Stage 35 home hero pair | PASS 12/12 | `scripts/validate-stage35-home-hero-pair.mjs` |
| PWA/mobile contract | PASS 13/13 | `scripts/validate-pwa-mobile-contract.mjs` |
| Production verifier contract | PASS | `scripts/validate-production-verifier-contract.mjs` |
| Deployment/runtime drift | PASS 17/17 | `scripts/validate-deployment-runtime-drift.mjs` |
| Regression test JS syntax | PASS | `node --check backend/tests/regression/dealerOnboardingSuspendSchemaReconciliation.test.js` |
| Updated homepage validator syntax | PASS | `node --check scripts/validate-homepage-convergence.mjs` |

## Full-runtime certification blockers — disclosed, not papered over

- This execution container has Node `v22.16.0`; the project requires `>=22.22.2`. `npm ci` therefore correctly refused the install. A retry with engine enforcement disabled did not complete within the available execution window and left only a partial local `node_modules`; that partial directory is excluded from the deliverable.
- Because the required runtime/dependencies were unavailable here, this report does **not** claim that the uploaded ZIP's frontend typecheck/build/Vitest suite or backend Jest/Vitest/Node suites were rerun in this container. The separately reported local run on the user's Windows checkout had frontend typecheck/build pass and 81 files / 643 tests pass with one skipped; that result is prior evidence, not a fresh run against this archive.
- The targeted R12/R14 Jest test was not marked PASS here. Use `npm run test:dealer-schema-regression` from `backend` after `npm ci` under Node `22.22.2` to run it with the correct ESM configuration.
- Supabase migrations were not applied to production, and no live Supabase/PostgreSQL, M-Pesa, provider, browser E2E, or deployment certification was performed. R12/R14 are still migrations requiring a controlled staging run and explicit production authorization.
- `scripts/validate-backend-boot.mjs` could not run because `eslint` was unavailable after the incomplete install. `scripts/validate-release.mjs` likewise could not run because TypeScript was unavailable. These are BLOCKED, not PASS.

## Required next certification on Node 22.22.2

1. Run `npm ci` at repository root and `npm ci` under `backend`.
2. Run `npm run typecheck`, `npm run build`, and `npx vitest run` at root.
3. Run `npm run test:dealer-schema-regression` under `backend`, then `npm test` there (Jest + Vitest + Node tests).
4. Run `npm run validate:release` only after dependencies are fully installed; investigate every failure rather than bypassing gates.
5. Apply R12/R14 first to an isolated/staging PostgreSQL/Supabase target, verify rerun/idempotency and real RLS/PostgREST behavior, and only consider production after explicit authorization and backup/preflight.

## Release status

**PARTIAL — static contracts pass; runtime certification remains required.** This ZIP is a consolidated, safer foundation with the identified packaging/validator issues corrected, but it is not represented as fully production-certified.
