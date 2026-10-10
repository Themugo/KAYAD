# Phase 28 — Deployment Artifact and Infrastructure Source-of-Truth Reconciliation

## Scope
Reconcile container, Compose, Render, and Kubernetes deployment artifacts with the production architecture established through Phase 27.

## Completed
- Frontend Docker image now copies `nginx.docker.conf`, the container-specific Nginx configuration that matches the image filesystem and Compose service DNS.
- Removed invalid shell-redirection syntax from the frontend Dockerfile `COPY public` instruction.
- Docker Compose no longer mounts bare-metal TLS configuration into the frontend container and exposes only the port actually served by the container.
- Render production upload disk now mounts at `/app/uploads`, matching `backend/Dockerfile` runtime layout.
- Render staging now uses `npm ci` rather than an unlocked dependency install.
- Removed the stale Render staging worker service that referenced nonexistent `backend/scripts/startWorkers.js` and would duplicate workers already managed by the backend worker manager.
- Kubernetes backend network policy no longer contains the obsolete MongoDB port 27017 / fake `app: supabase` pod dependency; Supabase is external and reached over HTTPS.
- Added `scripts/validate-phase28.mjs` to enforce these deployment contracts.

## Validation
- `PHASE 28 DEPLOYMENT ARTIFACT VALIDATION: PASS`
- Backend `node --check`: PASS
- Node baseline: 22.22.2

## Boundary
This phase validates and reconciles repository deployment artifacts. It does not claim a live Docker, Render, or Kubernetes deployment was executed from this isolated archive.
