# KAYAD Registration CSRF Route Fix — 2026-09-30

## Incident
Fresh onboarding reached the CSRF bootstrap but received:
`Route not found: /auth/csrf`

## Root cause
The backend canonical versioned auth route is mounted at `/api/v1/auth`, while the frontend CSRF bootstrap called `/auth/csrf` when `VITE_API_URL` was a direct backend origin.

## Correction
`src/api/httpClient.ts` now uses:
- direct backend origin: `/api/v1/auth/csrf`
- same-origin `/api` base: `/v1/auth/csrf`, resolving to `/api/v1/auth/csrf`

No CSRF protection was bypassed and no duplicate public route was introduced.

## Verification
- backend JavaScript syntax: PASS
- CSRF source gate: PASS
- full npm build could not be executed in this environment because the repository requires Node >=22.22.2 while the available runtime is Node 22.16.0.
