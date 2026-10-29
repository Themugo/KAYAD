# Operation B — `OP-B-DEPLOY-20261027` — deploy the verified code

**STATUS: NOT EXECUTED. Waiting for your exact approval message:** `approve OP-B-DEPLOY-20261027`. Operation A and B are independent; neither approval implies the other.

## What gets deployed
The project tree in the Phase 16D ZIP (name and SHA-256 in `PHASE16D_PACKAGE.txt` and the delivery message; deploy only from a tree whose re-extracted hash matches). It contains the maintenance-scope control plane, the owner/technical recovery lane, safe logout, the admin dashboard polish and the Phase 16D convergence changes. **No database migration. No new required environment variable.**

## How production deploys (from the repo, read not executed)
* **Frontend:** `.github/workflows/deploy.yml` runs on **push to `main`** (validators → `npm run build` → Vercel). Vercel rewrites `/api/*` to `https://api.kayad.space/api/*`.
* **Backend:** `render.yaml` — Render web service `kayad-backend` (Docker, `backend/Dockerfile`, health check path `/health`).
* So the deployment *artifact* is the **git commit on `main`** built from the verified tree. I have no GitHub push right, Vercel or Render credential, and I have not committed or pushed. **Operation B can only be carried out by you** with the commands in the delivery message; I will then verify what I can.

## Target environment, build identifier
Production (Vercel `www.kayad.space` + Render `kayad-backend`/`api.kayad.space`). Build identifier = the pushed commit SHA. The backend reports it at `GET /health` → `buildId` (`RENDER_GIT_COMMIT`); the frontend build embeds `VERCEL_GIT_COMMIT_SHA`. Record the SHA before and after.

## Required configuration (read-only check list; I cannot read hosted env)
| Item | Requirement |
|---|---|
| `WEBHOIST_EMAIL` | first address `jimmythemugo@gmail.com` (owner recognition in legacy mode) — **unverified** |
| `OWNER_MFA_ENCRYPTION_KEY` | only needed once owner MFA is enabled (not yet on hosted) |
| everything else | unchanged |

## Preconditions
1. Operation A done, **or** you accept signing in through the recovery lane under maintenance.
2. Previous Render deploy and Vercel deployment identified (rollback targets).
3. Pre-deploy read-only check repeated: `select value from system_settings where key='system_status'`.
4. Quiet window; you available to sign in straight after.

## Health checks
`GET /health` → 200, `status ok`, `buildId` = new SHA · public `GET /api/cars` → 200 · homepage loads · Vercel deployment shows the same SHA.

## Post-deployment login tests (you type the password; I cannot)
1. Sign in as `jimmythemugo@gmail.com` → Super Admin dashboard opens; header menu shows the correct name/role.
2. Sign out from the header menu → login page; browser Back does not show an admin page.
3. Panic Room shows server-confirmed state and four scopes. Rehearse **Dealers** scope only (activate → dealer test account refused, buyer not → recover). Do **not** rehearse global on production.
4. Do not grant `platform_recovery` to anyone yet (staff MFA outstanding).

## Rollback
1. **Make sure maintenance is inactive first** (Panic Room recover, or Operation A SQL) — the previous build would read a still-active *scoped* state as a global shutdown.
2. Render: redeploy the previous successful deploy; Vercel: promote the previous deployment (or `git revert` the commit and push).
3. No data rollback needed (old code ignores the new optional JSON keys).
4. Re-run login test 1; if blocked, apply Operation A SQL.

## Never combined with Operation A
A is a one-row data change; B is a code release. They are separate approvals, separate verification, and separate rollbacks.
