# KAYAD Phase 25 — CI/CD Contract Hardening

## Objective
Make the repository's automated build and deployment pipeline obey the same production-truth rules established by the application and database hardening phases.

## Completed
- Pinned CI and production deployment workflows to Node 22.22.2.
- Aligned root and backend package manifests and lockfiles to Node >=22.22.2.
- Removed placeholder Supabase credentials from production GitHub Actions builds.
- Production frontend builds now fail closed when required Realtime configuration is missing.
- Vercel production builds use the same fail-closed secret contract when Vercel deployment is enabled.
- Preserved `npm ci` as the deterministic dependency installation path.
- Added a Phase 25 contract validator covering runtime version, lockfile alignment, deployment secret behavior, and backend container hardening.

## Validation
Run:

```bash
node scripts/validate-phase25.mjs
```

Expected result:

```text
PHASE 25 CI/CD CONTRACT VALIDATION: PASS
```

## Production contract
The production build must receive real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` GitHub secrets. No placeholder values are permitted.
