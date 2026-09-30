# KAYAD Deployment & Runtime Truth

**Reviewed:** 2026-09-30  
**Status:** Current deployment contract  
**Source of truth:** repository deployment files, startup code, CI/CD workflow, and runtime validators in this release candidate.

> Historical deployment instructions that referenced VPS/PM2, the `master` branch, Node 18, or `kayad.com` are not the current production deployment path. Keep historical certification documents for audit history, but use this guide for the current stack.

## 1. Current topology

```text
Browser
  │
  ├── https://kayad.space (Vercel frontend)
  │      └── /api/* rewrite ───────────────┐
  │                                        │
  └── Socket.IO → https://api.kayad.space  │
                                           ▼
                              Render: kayad-backend
                              Docker / Node 22.22.2
                              0.0.0.0:$PORT
                                  │
                  ┌───────────────┼────────────────┐
                  ▼               ▼                ▼
              Supabase         Render KV         Providers
              PostgreSQL       Redis/Valkey      Brevo / Cloudinary /
                                                  M-Pesa / AT / Twilio
```

## 2. Runtime contracts

### Backend

- Entrypoint: `node bootstrap.js`
- Node: **22.22.2**
- Bind host: `0.0.0.0`
- Port: `process.env.PORT` supplied by the platform; local development defaults to `5000`.
- Production health: `/health`
- Liveness: `/health/live`
- Readiness: `/health/ready`
- Canonical CSRF bootstrap: `/api/v1/auth/csrf`
- Runtime identity: `X-KAYAD-Build-ID` and `X-KAYAD-Environment`

Render web services are expected to bind to `0.0.0.0` and the platform-provided `PORT`; the current Blueprint therefore does not pin a production port. citeturn2search0turn2search2

### Frontend

- Build: `npm ci` → `npm run build`
- Output: `dist/`
- Deployment: Vercel
- Browser API base: same-origin `/api` by default
- Vercel rewrite: `/api/:path*` → `https://api.kayad.space/api/:path*`
- SPA fallback occurs after the API rewrite
- Production release artifact: `/release.json`

Vercel supports external-origin rewrites for proxying `/api/*` traffic through the frontend domain. citeturn1search3

## 3. Production deployment path

Production deployment is defined in `.github/workflows/deploy.yml`.

1. Push to `main`.
2. CI uses Node 22.22.2.
3. Dependencies are installed with `npm ci`.
4. Deployment/runtime validators run.
5. The frontend is built.
6. The Vercel production deployment is created with the Vercel CLI.
7. The workflow refuses to deploy if `VERCEL_TOKEN` is missing.
8. The deployed Vercel artifact is checked for its expected Git commit through `/release.json`.
9. The public frontend and production API are smoke-tested.
10. `/api/v1/auth/csrf` is directly probed as part of production verification.

## 4. Render backend deployment

`render.yaml` is the production Blueprint.

Important production settings:

- Service: `kayad-backend`
- Runtime: Docker
- Dockerfile: `backend/Dockerfile`
- Health check: `/health`
- Redis/Valkey: Render Key Value service `kayad-redis`
- Redis URL is injected through `fromService` using `connectionString`.

Render's current Blueprint specification uses `keyvalue` for new Key Value services; `redis` remains a deprecated alias. The production and staging files now use `keyvalue`. citeturn1search0turn1search1

## 5. Staging

`render-staging.yaml` is the staging contract.

Staging intentionally uses:

- `NODE_ENV=staging`
- separate Supabase credentials
- M-Pesa sandbox
- staging frontend origin
- separate Render Key Value instance
- **Brevo** for transactional email

Legacy SendGrid/SMTP environment variables are not part of the current staging provider contract.

## 6. Docker contracts

### Backend image

`backend/Dockerfile`:

- Node 22.22.2 Alpine
- production dependencies only
- non-root `nodeuser`
- `node bootstrap.js` as the container command
- advertises port 10000 for the Render deployment model

### Local Compose

`docker-compose.yml` deliberately retains `5000:5000` for local use and explicitly sets `PORT=5000`.

The Compose healthcheck uses Node's built-in `fetch()` rather than `curl`, because the Alpine backend image does not install curl.

## 7. Runtime identity / drift detection

The backend exposes:

- `X-KAYAD-Build-ID`
- `X-KAYAD-Environment`
- `buildId` in `/health`

On Render, the build identity comes from the platform-provided `RENDER_GIT_COMMIT` value. This allows a live API response to be compared against the expected Git commit rather than assuming that a successful deploy command means the current code is serving traffic. citeturn2search2

The frontend emits `/release.json` containing the Vercel commit identity. The production verifier checks this artifact against `EXPECTED_COMMIT`.

## 8. Mandatory live smoke checks

Run these from a machine that can reach production:

```bash
curl -i https://api.kayad.space/health
curl -i https://api.kayad.space/health/live
curl -i https://api.kayad.space/health/ready
curl -i https://api.kayad.space/api/v1/auth/csrf
curl -i https://kayad.space/release.json
```

The CSRF request must not return the old:

```text
Route not found: /api/v1/auth/csrf
```

A successful current response should include:

```text
X-KAYAD-Canonical-Route: /api/v1/auth/csrf
X-KAYAD-API-Contract: v1
X-KAYAD-Build-ID: <current commit>
```

and a JSON `csrfToken` with sufficient entropy/length.

## 9. Current certification boundary

This source sweep passes the repository deployment/runtime contract, but **does not certify the live production deployment** from this environment.

The current execution environment has:

- Node `22.16.0`, below the repository's required `22.22.2`.
- no resolvable network path to `api.kayad.space` or `kayad.space`.
- no Docker daemon available for an image build.

Therefore the following remain runtime/live gates rather than source PASS claims:

- actual Render service boot
- actual Render health response
- actual production CSRF route
- actual Vercel release identity
- actual browser → Vercel → Render `/api` proxy path
- actual cookies/CORS in production
- actual Supabase readiness
- actual Redis/Valkey connectivity
- actual Brevo delivery
- full production dealer registration journey

## 10. Required operator evidence for closing the deployment-drift gate

Capture the following from production after deployment:

1. Render deploy commit SHA.
2. Render service logs showing `node bootstrap.js` and the bound `0.0.0.0:$PORT` listener.
3. `GET /health` response including `buildId`.
4. `GET /api/v1/auth/csrf` response and headers.
5. Vercel `/release.json` response.
6. Browser Network evidence for `/api/v1/auth/csrf` and registration.
7. One successful registration → verification-email acceptance → login trace.

Only after those checks pass should the release be called live-runtime certified.
