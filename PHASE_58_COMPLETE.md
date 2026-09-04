# KAYAD Phase 58 — Deployment Contract & Pre-Deploy Truth Hardening

## Status
Complete. This phase hardens deployment validation so the repository does not claim readiness from stale or non-existent local commands.

## Changes
- Updated the pre-deploy Node requirement from the stale >=18 check to the repository's actual >=22 engine contract.
- Updated pre-deploy TypeScript validation to use the real `npm run lint` script instead of the missing `npm run typecheck` script.
- Hardened deployment health probing to support both HTTP and HTTPS API URLs and reject malformed/unsupported URLs deterministically.
- Added `scripts/validate-phase58.mjs` to verify deployment configuration and these contracts without pretending that an external production deployment is reachable.

## Explicit non-goals
- No hosting provider was changed.
- No DNS/TLS claim was invented.
- No live deployment was declared healthy.
- No secrets were added.
- No database schema or application feature was changed.

## Validation
Run from repository root:

```cmd
node scripts\validate-phase58.mjs
node --check scripts\pre-deploy-check.js
node --check scripts\deployment-validation.js
npm run lint
npm run build
```
