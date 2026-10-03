# KAYAD End-to-End Foundation Sweep — 2026-10-03

## Foundation

This sweep uses `KAYAD-main-VERCEL-MOBILE-FOUNDATION-20261003-NEXT4.zip` as the sole source foundation.

## Scope

No new marketplace features, routes, business capabilities, navigation systems, or duplicate implementations were introduced.

The sweep covers:

- Vercel/frontend production boundary
- browser API transport
- backend CORS/runtime hostname alignment
- existing deployment verification
- security/high-risk boundaries
- transaction/ledger concurrency
- auth/session integrity
- database contract alignment
- inspection lifecycle
- private upload/cache controls
- PWA/mobile contracts
- homepage convergence
- deployment/runtime drift
- backend JavaScript syntax

## Root causes identified

### 1. Production browser API fallback was still same-origin `/api`

The frontend transport contract previously defaulted to `/api` when `VITE_API_URL` was absent. That made production browser traffic depend on Vercel's external `/api/*` rewrite even though the canonical backend is `https://api.kayad.space`.

### 2. Backend CORS contained obsolete Vercel aliases

The production backend still referenced the historical `kayad-motors*.vercel.app` aliases. The active Vercel project is `kayad-space`.

### 3. Live Vercel hostname failure is external to the source tree

The current production deployment was inspected as Ready and had the `www.kayad.space` alias. Direct HTTP testing nevertheless returned a Vercel platform `404 NOT_FOUND` for `www.kayad.space` and `/api/health`, while the apex redirected to `www`.

This is a Vercel project/domain/DNS assignment problem, not an application 404. Source code cannot repair a hostname that is not reaching the deployment.

## Corrections applied

- Production browser API fallback now uses `https://api.kayad.space/api` when no explicit production `VITE_API_URL` is supplied.
- `.env.production.example` now declares the canonical API origin explicitly.
- Backend CORS now allows the current stable Vercel aliases:
  - `https://kayad-space.vercel.app`
  - `https://kayad-space-themugos-projects.vercel.app`
- Obsolete `kayad-motors` runtime CORS aliases were removed.
- Added `scripts/validate-production-host-contract.mjs`.
- Registered `npm run validate:production-host-contract`.
- Updated affected static contracts to enforce the new canonical production API transport.

## Verification

### Static contracts

- Production host contract: PASS
- Runtime integrity: 7/7 PASS
- Deployment readiness: PASS
- Homepage convergence: PASS
- Vercel CI contract: PASS
- Frontend runtime contracts: PASS
- Deployment/runtime drift: 17/17 PASS
- PWA/mobile: 13/13 PASS
- Polish regressions: 4/4 PASS
- Refresh reuse integrity: 6/6 PASS
- Database contract alignment: 8/8 PASS
- Domain lifecycle integrity: PASS
- High-risk boundaries: PASS
- Private upload/cache: PASS
- Production backend contract: 12/12 PASS
- API availability: 8/8 PASS
- Runtime convergence: 7/7 PASS
- Canonical architecture: PASS

### Syntax

Backend JavaScript syntax check: 710 files passed.

### Environment limitation

This audit container runs Node `22.16.0`, while KAYAD requires Node `>=22.22.2`. A normal `npm ci` was therefore correctly blocked by the project's engine contract. No build/test certification is claimed from this container.

## External production repair still required

The source foundation is not declared live-production-certified until the following is verified from the actual deployment environment:

1. `www.kayad.space` resolves to the `kayad-space` Vercel project and serves the production deployment.
2. `kayad.space` redirects to the canonical public host without ending in a Vercel platform 404.
3. `www.kayad.space/api/health` reaches the canonical backend through the intended production transport or the browser uses the direct API origin.
4. `https://api.kayad.space/health` is healthy.
5. Node `22.22.2+` is used for `npm ci`, typecheck, build and full tests.
6. Live database, provider, browser and transaction gates are run with authorized production/staging credentials.

## Release rule

Do not call this foundation production-certified solely because Vercel reports a deployment as Ready. The public hostname and backend must also pass live verification.
