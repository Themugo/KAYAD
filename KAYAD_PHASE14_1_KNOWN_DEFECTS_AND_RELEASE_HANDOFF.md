# KAYAD Phase 14.1 — Known Defects, Blockers and Release Handoff

Date: 2026-10-26

## Fixed locally in this pass
- Inventory retry could fail to retrigger after a failed request because the loaded flag was already false.
- Customer retry had the same state-transition issue.
- Team retry had the same state-transition issue.
- Reputation retry had the same state-transition issue.
- Analytics missing values could display as zero.
- Overview recent activity and top-vehicle areas had no explicit empty states.
- Overview lower-card layout forced three columns at narrow widths.
- Missing inventory status was inferred as draft.
- Missing reputation review count was inferred as zero.
- Top vehicle price/engagement display was unsafe for missing values.

## Still unresolved / not certified
- Node runtime is `v22.16.0`, while `.nvmrc` and `package.json` require Node `>=22.22.2`. Dependency install stopped with `EBADENGINE` due `.npmrc` engine strictness. Do not bypass this guard.
- Typecheck, build, frontend/backend suites, browser journeys, axe scans, full regression suites and database-backed authorization tests remain NOT RUN.
- Live data provenance and server-side dealer organization isolation have not been verified against an approved database/runtime.
- Historical four critical and three serious axe findings were not reproduced in a browser during this pass.
- Known `/?vehicleId=` first-load deep-link race remains unchanged.
- Historical `validate:stage5f7-private-auction-contract` missing-planning-document failure remains unchanged.
- Production-schema/migration-history discrepancies, staging verification and CDN/edge cache invalidation remain separate release prerequisites.

## Handoff actions before staging review
1. Run this exact project with Node.js `>=22.22.2` and the locked dependencies.
2. Run typecheck and production build; resolve only confirmed regressions without changing dependency versions merely to bypass runtime constraints.
3. Run frontend Vitest, backend Jest/Vitest, `node:test`, dealer API/authorization suites and Phase 13I–13K regression suites.
4. Run Playwright at desktop and 390px; capture screenshots and test retry after a failed request for inventory, customers, team and reputation.
5. Run axe on changed dashboard sections and compare against the recorded baseline.
6. Verify actual API payloads and dealer organization authorization with synthetic records in an approved local test database.
7. Preserve the production schema/migration reconciliation, hosted staging checks and CDN/edge cache purge as separately authorized release prerequisites.

## Final decision
`PARTIAL — DEALER WORKFLOW, DESIGN OR CERTIFICATION EVIDENCE INCOMPLETE`

This is a local implementation checkpoint, not production readiness or staging certification.
