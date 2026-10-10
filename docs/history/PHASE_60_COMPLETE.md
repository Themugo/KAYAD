# KAYAD Phase 60 — Deployment Validator Contract Consolidation

## Status
Complete.

## Objective
Make the deployment validation tooling agree with the real KAYAD runtime and frontend environment contracts established in Phases 58–59.

## Changes
- Removed stale frontend scaffold variables from `scripts/deployment-validation.js` (`VITE_PLATFORM_NAME`, `VITE_DOMAIN`, `VITE_APP_NAME`, `VITE_APP_VERSION`, and the old server-side expectation for `VITE_SOCKET_URL`).
- Frontend deployment variables are now validated from the checked-in `.env.example` contract rather than incorrectly requiring Vite build-time variables in the Node deployment process.
- The deployment validator recognizes `/api` as a valid browser/Vite-proxy configuration but correctly skips Node-side health probing for relative URLs.
- Removed the misleading `vercel.json` environment-variable-count warning; deployment secrets belong in the hosting platform environment configuration, not in the repository file.
- Fixed Git cleanliness detection to use `git status --porcelain` instead of treating the existence of `.git/index` as evidence of uncommitted changes.
- Added `scripts/validate-phase60.mjs` and the `validate:phase60` npm script.

## Explicit non-goals
- No database schema changes.
- No authentication changes.
- No hosting/DNS changes.
- No secrets added.
- No live deployment was declared healthy.
- No new product features.

## Validation
Run from repository root:

```cmd
node scripts\validate-phase58.mjs
node scripts\validate-phase59.mjs
node scripts\validate-phase60.mjs
node --check scripts\pre-deploy-check.js
node --check scripts\deployment-validation.js
npm run lint
npm run build
```

Backend tests remain:

```cmd
cd backend
npm test
```
