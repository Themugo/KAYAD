# KAYAD Deployment / Runtime Drift Clean Sweep — 2026-09-30

## Scope

This sweep used `KAYAD-CLEAN-SWEEP-WORKING-CANDIDATE-20260930.zip` as the source foundation and focused specifically on deployment/runtime drift rather than feature expansion.

## Source baseline

- Input ZIP: `KAYAD-CLEAN-SWEEP-WORKING-CANDIDATE-20260930.zip`
- Input SHA-256: `df065ebcb2368b24e45eccb2fc8bd3eca036b937e9372b12e972b11e4e432218`
- Host Node: `v22.16.0`
- Required Node: `>=22.22.2`

## Concrete drift findings fixed

### 1. Render PORT contract

Production and staging Blueprints explicitly pinned `PORT=5000`. The backend already reads `process.env.PORT`, and Render's platform contract supplies the service port. The Blueprint no longer pins production/staging PORT values.

Local Docker Compose intentionally keeps `PORT=5000` and `5000:5000` because that is a separate local-development contract.

### 2. Docker healthcheck dependency

The backend Alpine image did not install `curl`, while Docker Compose used `curl` for its healthcheck. The healthcheck was changed to Node's built-in `fetch()` so the image can actually execute its own health probe.

### 3. Docker port metadata

The backend Docker image now advertises port 10000 for the Render deployment model while the application still reads the runtime `PORT` variable.

### 4. Render build identity

The backend previously looked for `RENDER_GIT_COMMIT_SHA`. Render's documented runtime variable is `RENDER_GIT_COMMIT`. Runtime identity now uses the documented variable, with explicit fallbacks.

### 5. Live runtime identity

The backend now emits:

- `X-KAYAD-Build-ID`
- `X-KAYAD-Environment`
- `buildId` in `/health`

This gives the operator a direct way to prove which commit is actually serving traffic.

### 6. Production verifier mismatch

The backend's shallow health endpoint returns `status: "ok"` when the database is connected. The production verifier previously accepted only `healthy` or `degraded`, which could reject a genuinely healthy current backend. The verifier now accepts `ok`, `healthy`, and `degraded`, while still failing on unhealthy/unknown states.

### 7. Staging communication-provider drift

Staging still declared legacy SendGrid/SMTP variables even though the current communication architecture uses Brevo as the canonical email provider. Those stale variables were removed and replaced with the current Brevo contract.

### 8. Render Key Value terminology

Staging used the older `redis` service type. Both production and staging now use Render's current `keyvalue` terminology and `connectionString` wiring.

### 9. Active SEO / email URL drift

Active application code contained hardcoded `www.kayad.space` fallbacks while the current production environment contract uses `VITE_PUBLIC_URL=https://kayad.space`. SEO and backend URL fallbacks were aligned to the configured apex-domain contract while preserving runtime environment overrides.

### 10. Deployment guide drift

`DEPLOYMENT_GUIDE.md` described a historical VPS/PM2/Node 18 deployment. It was replaced with the current Vercel + Render + Supabase + Render Key Value deployment contract and an explicit live-certification checklist.

## Validation results

### PASS

- Deployment readiness: PASS
- Runtime integrity: PASS (7/7)
- Startup convergence: PASS
- Canonical architecture: PASS
- Registration/onboarding: PASS (46/46)
- Static CSRF route contract: PASS
- Dependency security: PASS
- Supabase migration preflight: PASS with pre-existing duplicate-definition warnings
- Deployment/runtime drift invariants: **17/17 PASS**
- Changed JavaScript syntax: PASS
- ZIP/source integrity: verified after packaging

### Migration warning requiring real database validation

The migration validator still reports duplicate table definitions for several domains, including vehicle identities, dealer payouts, communications control tables, listing entitlement reservations, media upload jobs, and financial workflow events. The validator correctly requires a real PostgreSQL/Supabase migration reset before those can be called production-safe.

## Live-runtime boundary

This sweep deliberately does not claim production runtime certification.

The current execution environment cannot resolve/reach:

- `api.kayad.space`
- `kayad.space`

and the available host Node runtime is `22.16.0`, below the project's required `22.22.2`. Docker is also unavailable in this execution environment.

Therefore these remain OPEN live gates:

1. Render service actually running the new commit.
2. `GET /health` from the real public API.
3. `GET /api/v1/auth/csrf` from the real public API.
4. Vercel `/release.json` matching the deployed commit.
5. Browser `/api` proxy path reaching Render.
6. Production cookie/CORS behavior.
7. Supabase readiness.
8. Redis/Valkey connectivity.
9. Brevo delivery.
10. Full dealer registration → email verification → login journey.

## Closure command on a correctly provisioned Node 22.22.2 machine

```bash
npm ci
npm run validate:deployment-runtime-drift
npm run validate:deployment-readiness
npm run typecheck
npm run build
npm run test
E2E_WITH_BACKEND=1 npm run certify:phase5:browser-contract
npm run verify:production
```

Then perform the live CSRF and dealer journey checks from a network that can reach production.

## Release classification

**Classification: WORKING FOUNDATION — DEPLOYMENT/RUNTIME DRIFT CORRECTED, LIVE CERTIFICATION PENDING.**

No production PASS is inferred from source inspection alone.
