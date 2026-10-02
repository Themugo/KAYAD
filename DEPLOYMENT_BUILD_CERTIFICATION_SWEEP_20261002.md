# KAYAD Deployment / Build Certification Sweep — 2026-10-02

## Canonical foundation
Deep audited deployment foundation used as the only source of truth for this sweep.

## Confirmed corrections
1. `.github/workflows/deploy.yml` now installs repository dependencies in the `deploy-vercel` job before running `verify:production`.
2. Deployment URL capture now extracts a real HTTPS URL from Vercel CLI output instead of assuming the final output line is always the deployment URL.
3. `scripts/validate-vercel-ci-contract.mjs` now certifies both deployment-job dependency installation and HTTPS deployment URL extraction.

## Preserved contracts
- Node engine: `>=22.22.2`.
- GitHub Actions certification runtime: Node `22.22.2`.
- Vercel CLI: `60.1.3`.
- Explicit Vercel token/org/project targeting.
- `npm ci` reproducibility.
- `vercel pull --environment=production`.
- `vercel build --prod`.
- `vercel deploy --prebuilt --prod`.
- Post-deployment release identity and production smoke verification.
- Existing Auction, Marketplace, Payment, Escrow, Ownership, Inspection and Dispute authorities.

## Static certification results
- Local import resolution: PASS (0 missing local imports).
- Vercel CI contract: PASS.
- Deployment readiness: PASS.
- Deployment/runtime drift: 17/17 PASS.
- Frontend runtime contracts: PASS.
- Homepage convergence: PASS.
- Auction transport convergence: 5/5 PASS.
- Foundation integrity: PASS.
- Domain lifecycle integrity: PASS.
- Wave 2 invariants: PASS.
- Migration hygiene: PASS (147 migrations; no exact duplicate bodies or duplicate table creators).
- Marketplace Core: 12/12 PASS.
- Payment gateway lifecycle: 13/13 PASS.
- Payment/Escrow domain: 9/9 PASS.
- Transactions & Money: 23 PASS.
- Ownership + Passport: 16/16 PASS.
- Inspection Marketplace: 21/21 PASS.
- Dispute integrity: 11/11 PASS.
- `verify-production-deployment.mjs` syntax: PASS.
- `validate-vercel-ci-contract.mjs` syntax: PASS.
- GitHub Actions deployment workflow YAML: PASS.

## Environment-dependent gates
A full `npm ci` / Vite build / local `vercel build --prod` cannot be truthfully certified in this sandbox because its Node runtime is 22.16.0 while KAYAD requires >=22.22.2. Windows production certification must use the user's confirmed Node 22.22.2 environment.

## Scope discipline
No Marketplace, Auction, Payment, Escrow, Ownership, Inspection, Dispute, or premium UX feature was added in this sweep. Changes are limited to production deployment/build reliability and certification coverage.
