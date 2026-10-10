# KAYAD Technical Team Handover

**Foundation:** organized October 10, 2026 working copy, derived from the October 9, 2026 build archive.
**Status:** source organization and static audit completed; application certification remains outstanding.

## 1. First-day setup

1. Use Node.js `22.22.2` or a compatible version satisfying `>=22.22.2`.
2. From the repository root, run `npm ci` using the committed `package-lock.json`.
3. Create local environment files from `.env.example` and `.env.production.example` as appropriate; never copy production secrets into the repository.
4. Install backend dependencies separately with `cd backend && npm ci` and configure from `backend/.env.example`.
5. Read `docs/architecture/SYSTEM_AND_MODULE_BOUNDARIES.md`, `docs/architecture/DEPENDENCY_AND_DUPLICATION_AUDIT_20261010.md` and the relevant domain runbook before changing code.
6. Confirm the deployment project, staging database and provider credentials with the responsible owners; never assume the configured target is correct based only on a local file.

## 2. Change and release discipline

- Work on a branch and use small, reviewable commits.
- Before changing a business flow, map its UI, API route, middleware, service, database schema/RLS policy, webhook/provider, tests and operational evidence.
- Keep financial transitions server-authoritative. Verify idempotency, replay behavior, concurrent requests and reconciliation for payment/escrow changes.
- Add forward-only database migrations; do not edit a migration already applied to staging or production.
- Use overlays for integrating patches. Never mirror-delete an existing project directory as a shortcut.
- Run the relevant focused validator and tests first, then typecheck, production build, full test suite, browser journeys and staging integration checks.
- Verify the deployed commit and real URLs after deployment. A successful build or provider CLI response is not sufficient.
- Attach the test logs, migration IDs, deployment commit and outstanding exceptions to each release record.

## 3. Business journeys that must remain intact

- Registration, sign-in, session refresh, CSRF protection, role onboarding and account-state enforcement.
- Vehicle listing creation/editing, ownership authorization, media upload/document privacy, moderation and marketplace discovery.
- Inspection booking, provider actions, report evidence and customer visibility.
- Auction setup/publication, bidder eligibility, commitment/deposit requirements, live bidding, auction close and winner determination.
- Payment initiation/callback, idempotency, ledger posting, escrow custody, reconciliation, refund/forfeit policy, disputes and post-auction fulfilment.
- Ownership/transfer authorization, dealer operations, customer support, admin intervention and audit trails.
- Communications/webhooks, worker behavior, health checks, error reporting and incident response.

For each flow, verify both success and failure/timeout/retry paths. UI labels and historical reports do not establish financial or authorization truth.

## 4. Immediate blockers and follow-up owners

| Priority | Finding | Required action before production certification |
|---|---|---|
| P0 release gate | Build/test not certified in this audit | Install dependencies and run checks with Node `>=22.22.2`; publish results. |
| P1 operational | Backend `seed-depts`, `monitor`, `health-check`, `notify-deployment` point to absent script files | Backend owner must restore the intended implementations or formally retire those commands and update docs. |
| P1 maintainability | npm lockfile and Bun lockfile coexist | Tech lead records canonical package manager and lockfile update policy. |
| P1 production | Historical records include prior unverified deployment/runtime issues | Recheck the deployed commit, frontend/API health, registration, marketplace, auction, payments and database/RLS in the target environment. |
| P1 database/finance | 165 migration files; live migration/RLS/payment behavior not exercised here | Validate migration chain and RLS matrix in staging; run payment/ledger/escrow reconciliation and replay/concurrency tests. |
| P2 cleanup | Legacy dealer layout has no static import found | Product/route owner decides whether it is retained intentionally or can be removed in a separate change. |
| P2 docs | Some older documentation links and environment assumptions may be stale | Fix only against verified targets; review runbooks quarterly and after incidents. |

## 5. Validation commands

Run from repository root after installing dependencies on the declared runtime:

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run validate:canonical-architecture
npm run validate:deployment-readiness
npm run validate:backend-runtime-contracts
npm run validate:runtime-integrity
npm run validate:release
```

Run the focused validators relevant to the change (e.g. `validate:auction-domain-integrity`, `validate:transaction-integrity`, `validate:payment-escrow-domain`, `validate:financial-ledger-reconciliation-domain`, `validate:database-contract-alignment`, `validate:migration-hygiene`, `validate:registration-onboarding`, `validate:csrf-route`, `validate:navigation-convergence`). Confirm the exact script names exist in `package.json` before running a command.

For backend tests, use `cd backend && npm ci && npm test`. Browser, staging database, M-Pesa/provider, concurrency and production deployment checks require their real environment and credentials; do not mark them PASS based on static checks.

## 6. Deployment authority

The repository's `.github/workflows/deploy.yml` describes the intended Vercel pipeline and uses Node `22.22.2`. Confirm required GitHub secrets and project IDs with the authorized deployment owner. The canonical hostnames currently documented in the root README are `https://www.kayad.space` and `https://api.kayad.space`; verify current DNS, deployment and health status before relying on them.

## 7. Data, secrets and evidence

- Keep credentials in approved secret stores; commit only sanitized variable-name examples.
- Do not place customer personal data, payment credentials, tokens or production database dumps in the ZIP or evidence folder.
- Preserve original migration history and historical test artifacts; add a new dated report rather than rewriting prior evidence.
- Store test results with date, commit SHA, environment, command, result and any exception.
- Use the incident runbooks in this folder and `../runbooks/` as the source for response procedures; verify contacts and monitoring endpoints before treating placeholders as live.

## 8. Handover acceptance checklist

- [ ] Technical owner and backup owner named for frontend, backend, database, payments/escrow, security and deployment.
- [ ] Node and package-manager policy confirmed.
- [ ] Environment variable inventory reviewed without exposing values.
- [ ] CI green on the intended commit.
- [ ] Staging migration and RLS matrix passed.
- [ ] Critical customer journeys passed in a real browser.
- [ ] Payment callbacks, ledger reconciliation, idempotency and concurrency tested.
- [ ] Production deployment commit and real health endpoints verified.
- [ ] Known issues, exceptions and rollback/recovery instructions accepted by the receiving team.
