# KAYAD DEPLOYMENT INFRASTRUCTURE AUDIT - RENDER, VERCEL, CLI, CI

Full inventory checked: vercel.json, vercel-staging.json, render.yaml, render-staging.yaml, backend/Dockerfile, docker-compose.yml, and all 4 GitHub Actions workflows (ci.yml, deploy.yml, security.yml, dependabot-auto-merge.yml).

Same hard constraint as every prior deployment-related pass in this program: no Vercel or Render dashboard access exists here. This audit covers everything checkable from the repository's own files - real, verifiable fixes - and is explicit below about what still requires dashboard access to confirm.

---

## Real issues found and fixed

### 1. Production Vercel config had no proxy to the backend at all - staging did
Checked vercel.json against vercel-staging.json directly rather than assuming they matched. Staging has real, working rewrites forwarding /api, /socket.io, and /uploads straight to the Render backend. Production had none of this - it relied entirely on VITE_API_URL being set correctly in the Vercel dashboard, with no fallback if that value were ever missing or wrong (the exact failure mode an earlier deployment investigation in this program already traced: an unset VITE_API_URL plus no /api exclusion in the SPA rewrite means API calls silently return the HTML shell instead of JSON).

Fixed: added the same 3 proxy rewrites to production's vercel.json, using https://kayad-backend.onrender.com - derived directly from render.yaml's own confirmed service name (kayad-backend) and Render's standard, documented URL convention (https://<service-name>.onrender.com). This is a well-justified inference, not something empirically confirmed against a live dashboard - worth a quick check against the real Render service settings before relying on it. Also added the same /api exclusion to the SPA fallback rewrite and matching Cache-Control header rule, for consistency and defense-in-depth even when VITE_API_URL is set correctly.

### 2. render.yaml was missing several real, active environment variables
Diffed every key backend/.env.example documents against every key render.yaml actually lists. Most of the ~70 differences are optional (seed-account passwords, optional SMS/email providers) and not added, to avoid noise - added only the ones confirmed both real (checked directly against the code that reads them) and consequential if missing:

- MPESA_ENV - confirmed the backend defaults to M-Pesa sandbox mode in production if this is unset; a real payment-configuration risk, not cosmetic (this specific gap was already flagged in an earlier deployment audit in this program and had not yet been added here).
- REDIS_URL - the backend's queue/rate-limiting infrastructure expects Redis; was entirely absent from this file.
- SENTRY_DSN - real error-tracking integration exists in the codebase (infrastructure/logging/sentry-integration.js) but had no corresponding env var here, meaning it has likely never been active in a real deployment of this file.
- ENABLE_DEMO_LOGIN, DISPUTE_CRON_ENABLED, ESCROW_CRON_ENABLED - real, active flags confirmed directly against the code that reads them, added with their own explicit, safe defaults (checked against each flag's real default in code, not guessed) so an operator can see these controls exist rather than finding them only by reading source.

### 3. CI's security job never audited the backend at all
ci.yml's "Security Audit" job ran npm audit only at the repository root - the frontend's dependency tree. backend/package.json was never checked by this job. Confirmed directly why this matters: an earlier, separate pass in this program found and fixed 7 real backend vulnerabilities (all rooted in an unused semantic-release dependency, since removed) that this CI job would never have caught, because it never looked at the backend at all.

Fixed: added a real "Dependency audit (backend)" step, using the same allowlist-based logic already proven in the existing frontend audit step (adapted, not duplicated blindly) - installs backend dependencies for real first (npm ci, was missing - npm audit against an uninstalled tree doesn't produce a valid result), then runs the same pass/fail logic. Tested locally against the real, current backend before considering this complete: the new logic correctly reports PASS given the backend's current, real 0-vulnerability state.

Also extended the existing "Check for secrets in code" step, which previously only scanned src/ (frontend), to scan backend/ as well.

---

## Checked directly and confirmed correct - not changed

- **backend/Dockerfile**: initially looked incomplete from a partial view (missing what looked like the inspection/ and inspectionBusinessCenter/ directories) - re-checked in full and diffed every real backend/ subdirectory against what the Dockerfile copies. It is complete; every directory server.js actually needs is copied. The only directories not copied (coverage, data, node_modules, tests, uploads) are all correctly excluded - dev artifacts, test output, or handled separately (node_modules via npm ci, uploads via a runtime mkdir).
- **Render auto-deploy**: confirmed via render.yaml's own header comment ("Connect GitHub repo -> Render auto-detects this file") that Render uses its own native Git integration, not GitHub Actions - deploy.yml correctly has no Render deployment step; this was checked and confirmed intentional, not assumed.
- **security.yml (CodeQL)**: `languages: javascript` covers TypeScript automatically: no gap.
- **Node version consistency**: backend/Dockerfile (node:22-alpine) matches .nvmrc (22) and every workflow's node-version: '22' - no drift found.

---

## What still requires real dashboard/CLI access to confirm - not claimed as verified

Per the same constraint present throughout every deployment-related pass in this program: the following cannot be checked from the repository alone, and are named here rather than silently assumed correct:

- Whether https://kayad-backend.onrender.com is genuinely the real production backend URL (a well-justified inference from render.yaml's confirmed service name, not an empirically confirmed fact).
- Whether every sync: false variable in render.yaml (including the ones added this pass) actually has a real value set in the live Render service - this file only declares that a value is expected, not what it currently is.
- Whether GitHub's own repository secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) are actually configured - deploy.yml already has a real, explicit check for the three Vercel secrets that fails loudly with instructions if missing, which is itself a good, existing safeguard - just noting it depends on secrets this repository's files cannot show the state of.

---

## Verification

| Check | Result |
|---|---|
| vercel.json | Valid JSON |
| render.yaml | Valid YAML |
| .github/workflows/ci.yml | Valid YAML |
| New backend CI audit logic | Tested locally against the real, current backend - correctly reports PASS |
| Frontend TypeScript | 0 errors |
| Frontend production build | Succeeds |
| Backend syntax validation (every file) | 0 errors |
