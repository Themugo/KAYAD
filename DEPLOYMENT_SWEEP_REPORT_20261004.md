# KAYAD CLI / Vercel / production deployment sweep — 2026-10-04
Base: KAYAD-main-HOMEPAGE-CONVERGED-20261003.zip (no .git in zip; git commands could not be run here).

## Baseline
Node 22.22.2, npm 10.9.7. engines.node ">=22.22.2". Vercel CLI pinned in deploy.yml: `npm install -g vercel@60.1.3` (installed and exercised locally: 60.1.3 supports every flag the workflow uses: link --project, pull --environment, build --prod, deploy --prebuilt --prod --project).

## Findings and fixes
| # | Category | Finding | Fix |
|---|---|---|---|
| 1 | H Render/backend (BOOT CRASH) | `backend/server.js` used `auctionSettlementRoutes` and `auctionFulfilmentRoutes` without importing them -> ReferenceError at import -> process exits -> Render health check fails -> old build keeps serving / 502 at the proxy. Reproduced locally: backend crashed on boot. Second incident of the same class as `authLimiter`. | Added both imports in server.js. Backend now boots: /health 200, /api/v1/auth/csrf 200 with X-KAYAD headers. |
| 2 | I runtime | `services/otpService.js` verify path used undefined `sb` -> every OTP verification would throw (onboarding). | use `getSupabase()` |
| 3 | I runtime | `services/reconciliationService.js` used `update` (not imported); `services/marketplaceHealthService.js` used `findOne`/`create` (not imported; called by the scheduler). | added to db/index.js imports |
| 4 | I runtime | `config/queue.js` DLQ warning referenced undefined `dlqName` (would throw inside the failed-job handler). | use `${queueName}:dlq` |
| 5 | G API rewrite | SPA fallback `/(.*)` also matched missing `/assets/*`; a stale hashed chunk returned index.html with 200 (reproduced in preview) -> "module script MIME text/html" blank page after deploys. API-before-SPA order was already correct. | vercel.json fallback is now `/((?!api/|assets/).*)` (filesystem files still served first; /api still proxied first). |
| 6 | regression | Nothing prevented undefined-identifier boot crashes from recurring. | `npm run validate:backend-boot` (ESLint no-undef on boot-critical files; verified it FAILS on the old bug) and a step in deploy.yml validate job. `validate:vercel-ci` now asserts API rewrite precedes SPA fallback and the fallback does not capture /api or /assets. |

## Marketplace 502, traced
Browser -> `GET /api/cars?...` (src/services/vehicleApi.ts) -> Vercel rewrite `/api/:path*` -> `https://api.kayad.space/api/cars` -> Render. A 502 is produced by the proxy when the Render service is down/unhealthy. Evidence this tree: with the pre-sweep server.js the backend cannot start at all. Locally, after the fix, the same chain (preview proxy -> backend) returns API JSON for /api/v1/auth/csrf (200) and a JSON 404 for unknown /api routes, while SPA routes return HTML; API failures are never converted to HTML. No mock data was added; error handling untouched.
NOT verified against production (sandbox cannot reach api.kayad.space / kayad.space).

## Environment contract
Frontend reads only: VITE_API_URL, VITE_SOCKET_URL, VITE_PUBLIC_URL, VITE_POSTHOG_API_KEY, VITE_POSTHOG_HOST (+ DEV/PROD). No service-role/secret values in VITE_ vars (VITE_POSTHOG_API_KEY and the Supabase publishable key are public by design). CI deploy needs repo secrets VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID (deploy.yml refuses to run without them). Backend/Render needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, REFRESH_TOKEN_SECRET, SESSION_SECRET (+ REDIS_URL, provider keys). Never printed.
Vercel project link in the zip's `.vercel/project.json`: projectName `kayad-space` (`.vercel/` is gitignored; do not commit).

## CLI / Windows
All 108 npm scripts are `node ...`/vite/vitest invocations; none use Unix-only shell syntax. Deploy steps run in GitHub Actions (bash on ubuntu), which is the canonical deploy path.

## Verification (local, Node 22.22.2)
clean `npm ci` root + backend OK; typecheck 0; build OK + dist check; frontend 47 files / 319 tests (1 skipped); backend `npm test` jest 27 suites/549, vitest 5/16, node:test 1; validators pass incl. homepage-convergence, premium-presentation-pass, vercel-ci, deployment-readiness, v14 release-candidate/runtime-preflight, phase6-release, backend-boot; root audit clean; backend prod audit clean; `vite preview` routing checks as above.
Pre-existing, environment/doc failures (unchanged): validate:communications:providers (needs provider credentials), validate:live-runtime (needs SUPABASE env), validate:wave3-convergence + validate:release (OpenAPI documents 1107/1112 routes), validate:c1-c5-convergence (reset/verification token hashing check).

## NOT done / not verified
- NO Vercel deployment performed and NO post-deploy verification: no VERCEL_TOKEN/credentials here and no network route to Vercel/Render. Vercel is NOT certified fixed.
- `git status` / `git diff --check` / commit identity: no .git in the zip; whitespace checked manually on changed files (no new trailing whitespace).
- Latent, not fixed (needs a design decision): `marketplaceHealthService.getHealthTrend/getActiveAlerts` call a removed Mongoose-style `MarketplaceHealth` model; ~12 other files reference removed Mongoose-era models (FeatureFlag, ListingQuality, NotificationAudit, Organization, JobFailure, DuplicateVehicleLog) or out-of-scope vars (chat/lowCode/smsBidding controllers, adminRoutes userIds, escrowAuditService aggregate, communicationGateway delivery). They fail at call time, not boot. List via: npx eslint with no-undef over backend/.
- `.vercel/output` and `.vercel/static-build` exist in the zip (build artifacts); keep ignored.

## Owner actions
1. Push; confirm Render deploy goes Live and `curl -i https://api.kayad.space/health` and `/api/cars?limit=1` return 200 (not 502). Check Render logs for the earlier ReferenceError.
2. Confirm GitHub secrets VERCEL_TOKEN/VERCEL_ORG_ID/VERCEL_PROJECT_ID; watch "Deploy to Production" go green; `npm run verify:production` runs in that job (checks release identity via EXPECTED_COMMIT).
3. Apply supabase migrations (registration needs kayad_register_identity_atomic).
Suggested commit: `chore: stabilize production deployment and homepage foundation`

---
## Applied onto KAYAD-main__23_.zip (your newer project with hero-placement work)
Applied unchanged (these files were identical to the previous base): backend/server.js, backend/config/queue.js,
backend/services/otpService.js, reconciliationService.js, marketplaceHealthService.js, vercel.json,
.github/workflows/deploy.yml, scripts/validate-vercel-ci-contract.mjs, scripts/validate-backend-boot.mjs.
Merged by hand: package.json (only added the `validate:backend-boot` script; your new
`validate:production-verifier-contract` script is kept).
Adjusted for your new validator: scripts/validate-production-verifier-contract.mjs pinned the SPA fallback to the exact
source `/(.*)`. It now asserts the same intent (fallback is second, after the API rewrite, serves app routes, and does NOT
capture /api/* or /assets/*) so it accepts the hardened pattern.
Nothing in your hero-placement code, App/Navbar/VehicleMarketplace or CSS was modified.

Results on this project: clean npm ci (root + backend); typecheck 0; build OK; frontend 48 files / 323 tests (1 skipped);
backend jest 27 suites/549 + vitest 5/16 + node:test 1; every validator the CI workflows call passes (backend-boot,
deployment-readiness, frontend-runtime-contracts, homepage-convergence, phase6-release, v14 release-candidate,
v14 runtime-preflight, vercel-ci); validate:local-runtime passes (boots the real backend incl. hero placement code);
npm audit clean (root; backend production deps).
Still failing, NOT gated by CI and not caused by these changes:
- validate:premium-presentation-pass: expects hero copy "KAYAD Select" and "Featured on KAYAD" in VehicleMarketplace.tsx;
  your component no longer contains them (file and validator are byte-identical to your upload). Update the validator or restore the copy, your call.
- validate:communications:providers (needs provider credentials), validate:live-runtime (needs SUPABASE env),
  validate:wave3-convergence + validate:release (OpenAPI documents 1107/1112 routes), validate:c1-c5-convergence (token hashing check).
- verify:production needs a deployed URL; not run (no network/credentials).
