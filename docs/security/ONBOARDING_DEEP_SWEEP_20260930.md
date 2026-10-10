# KAYAD — Deep Onboarding / Registration Sweep
## 2026-09-30

### Starting production symptom
The onboarding modal reached the Dealer details step and displayed:

`Route not found: /api/v1/auth/csrf`

This sweep intentionally goes beyond that one message and traces the complete browser onboarding contract.

## Corrections made in this sweep

### 1. Fixed the Axios CSRF URL composition contract
The previous correction hard-coded `/api/v1/auth/csrf` while the default Axios base URL is `/api`.
That combination can compose to `/api/api/v1/auth/csrf` in same-origin mode.

The transport now selects the path according to the configured base:
- no `VITE_API_URL` → base `/api` + `/v1/auth/csrf` = `/api/v1/auth/csrf`
- configured API origin or `/api` prefix → `/api/v1/auth/csrf`

This preserves the canonical backend route without introducing a duplicate endpoint.

### 2. Strengthened the frontend CSRF bootstrap contract
The browser retains the server-issued CSRF token in memory as well as reading the XSRF cookie. State-changing requests wait for the bootstrap promise before sending their CSRF header.

### 3. Strengthened deployment verification
`scripts/verify-production-deployment.mjs` now probes:

`GET https://api.kayad.space/api/v1/auth/csrf`

and requires:
- HTTP success
- JSON response
- `success: true`
- a CSRF token of at least 32 characters

A deployment can no longer report healthy solely because `/health` works while the authentication bootstrap route is broken.

### 4. Expanded the onboarding source gate
The registration/onboarding validator now covers 34 contracts, including:
- canonical frontend CSRF URL selection
- backend `/api/v1` mount
- `/auth/csrf` route existence
- production CSRF smoke-test registration
- buyer → `user` role mapping
- dealer and private-seller roles
- dealer business/location requirements
- inspector application route
- verification page and token endpoint
- verification-email delivery not blocking registration
- resend delivery not blocking onboarding
- duplicate-email 409 contract
- protected email-verification boundary
- server-controlled dealer approval
- canonical AuthModal/OnboardingFlow convergence

## Existing architecture retained
No duplicate authentication system or duplicate registration route was introduced.

Canonical paths remain:
- Frontend onboarding: `src/components/OnboardingFlow.tsx`
- Frontend auth client: `src/services/authApi.ts`
- Shared transport: `src/api/httpClient.ts`
- CSRF helper: `src/utils/csrf.ts`
- Backend auth router: `backend/routes/authRoutes.js`
- Versioned router: `backend/routes/v1.js`
- Backend mount: `/api/v1`
- Email verification UI: `src/pages/VerifyEmailPage.tsx`
- Inspector application: `/api/v1/inspector-applications/apply`

## Source certification

`node scripts/validate-registration-onboarding.mjs`

**34/34 PASS**

Syntax checks passed for the changed JavaScript files.

## Production verification limitation
The execution environment used for this audit cannot resolve `api.kayad.space` or `www.kayad.space`, so a live network check could not be honestly completed here.

The new production verifier will perform the live check after deployment from CI:

`npm run verify:production`

## Node build requirement
The repository declares Node `>=22.22.2`. The current audit runtime is Node `22.16.0`, so a full dependency install/typecheck/build cannot be claimed from this environment.

The Windows machine and CI must use Node 22.22.2+ before final browser certification.

## Expected production registration sequence
1. Browser loads the current frontend release.
2. First state-changing auth request bootstraps CSRF through the configured transport.
3. Backend answers `GET /api/v1/auth/csrf` with a token and XSRF cookie.
4. Registration POST carries the same token in `X-CSRF-Token`.
5. Backend creates `User` and `UserAuth` atomically enough to clean up a failed credential write.
6. Access/refresh cookies are issued without returning the access token in JSON.
7. Verification email dispatch is asynchronous.
8. Dealer/private-seller accounts remain pending seller approval.
9. Email verification uses `/verify-email?token=...` and the canonical `/api/v1/auth/verify-email/:token` endpoint.
10. Resend returns immediately with a generic 202 response while delivery proceeds asynchronously.

## Important live interpretation
If the browser still receives exactly:

`Route not found: /api/v1/auth/csrf`

after deploying this foundation, that is evidence of a deployment/runtime mismatch rather than a missing route in this source tree. The backend release serving `api.kayad.space` must then be checked against the deployed commit and `npm run verify:production` must be allowed to fail until the route is actually live.
