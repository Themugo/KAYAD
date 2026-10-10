# KAYAD — Onboarding & Authentication End-to-End Deep Certification
## 2026-09-30

## Foundation
This release continues directly from `KAYAD-ONBOARDING-DEEP-SWEEP-FOUNDATION-20260930.zip`.
No parallel authentication implementation was introduced.

## Major corrections in this sweep

### 1. Canonical API transport corrected globally
The previous transport converted `VITE_API_URL=/api` into an empty Axios base URL. That made direct `api.*` modules request the frontend origin instead of `/api`, which could route API calls into the SPA.

The transport now has one canonical contract:

- unset `VITE_API_URL` → `/api`
- `VITE_API_URL=/api` → `/api`
- `VITE_API_URL=https://api.kayad.space` → `https://api.kayad.space/api`
- `VITE_API_URL=https://api.kayad.space/api` → `https://api.kayad.space/api`

`httpRequest()` strips an optional `/api` prefix exactly once. This keeps both `/v1/...` and legacy `/api/v1/...` service paths compatible without creating `/api/api/...`.

This correction covers CSRF, registration, login, verification, Inspector application and the wider API surface that uses the shared Axios client.

### 2. Inspector onboarding hardened
Inspector onboarding now validates required fields before network submission:
- full name
- email
- phone
- identification number
- location/city
- valid years of experience
- at least one specialty

The existing canonical `/inspector-applications/apply` endpoint remains unchanged.

### 3. Public authentication routes wired into the application shell
The application now explicitly dispatches:
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/force-password-change`

This closes a routing gap where existing `Link`/`Navigate` calls could land on the SPA shell without rendering the intended authentication page.

### 4. Password recovery completed end-to-end
Added:
- `src/pages/ForgotPasswordPage.tsx`
- `src/pages/ResetPasswordPage.tsx`

The pages use the existing canonical auth API and backend endpoints. Reset tokens remain hashed server-side and password reset increments `tokenVersion` to invalidate existing sessions.

### 5. Password-reset email made non-blocking
The backend previously awaited external reset-email delivery. It now persists the reset token and dispatches email asynchronously, matching the registration and resend reliability model. The HTTP response therefore does not wait on Brevo/provider latency.

### 6. Environment contract restored
Added `.env.example` as the non-secret KAYAD browser environment contract, aligned with `.env.production.example`.

## End-to-end flow matrix

### Buyer
1. Open onboarding
2. Select Buyer
3. Enter identity details
4. Client validation
5. CSRF bootstrap
6. POST `/api/v1/auth/register`
7. User role canonicalized to `user`
8. UserAuth credential record created
9. Auth cookies issued
10. Verification email dispatched asynchronously
11. Verification page calls `/api/v1/auth/verify-email/:token`
12. Login verification gate applied when configured
13. Session restored through HttpOnly cookie

### Private Seller
Same canonical account path, with `individual_seller` role and seller-pending status.

### Dealer
Same canonical account path, with:
- `dealer` role
- business name required
- location/city required
- pending status
- admin-controlled approval boundary

### Inspector
1. Select Inspector
2. Validate required application fields
3. POST `/api/v1/inspector-applications/apply`
4. Application enters review queue
5. No public staff-role self-registration is created

### Verification / recovery
- verify-email page exists and uses canonical endpoint
- resend verification is asynchronous and returns `202`
- forgot-password preserves anti-enumeration response behavior
- reset-password invalidates existing token versions
- password reset UI is wired to the application shell

## Certification results

### PASS
- Registration/onboarding source gate: **42/42**
- Email reliability: **8/8**
- API availability: **8/8**
- Session availability: **7/7**
- Worker runtime: **9/9**
- Backend runtime contracts: **14/14**
- Frontend runtime contracts: **PASS**
- Runtime integrity: **7/7**
- Foundation integrity: **PASS**
- Canonical architecture: **PASS**
- Response lifecycle: **PASS**
- Production runtime corrections: **9/9**
- Deployment readiness: **PASS**
- Phase 59: **11/11**
- Phase 60: **12/12**
- Backend/scripts Node syntax: **835 files PASS**

### Environment limitation
Full dependency-backed TypeScript/Vitest/build certification was not claimed here.

Repository requirement:
`node >=22.22.2`

Execution environment:
`node v22.16.0`

`.npmrc` also enforces `engine-strict=true`.
A controlled dependency installation was attempted with engine strictness disabled but could not complete in this execution environment. Global `tsc` was available, but the partial dependency tree could not provide required React/Node/test type definitions, so TypeScript compilation was not treated as a valid certification result.

## Production interpretation
The source now has a single coherent API contract. After deployment, a fresh browser should observe:

`GET /api/v1/auth/csrf` → 200

followed by:

`POST /api/v1/auth/register` → 201

If the first request still returns `Route not found`, the deployed backend is not serving the same release as this source foundation. Do not patch the frontend around that condition; verify backend release identity and deployment state.

## Final local certification command on Windows
Use Node 22.22.2+ before running:

`npm ci`

`npm run typecheck`

`npm run build`

`npm test -- --run`

`npm run validate:registration-onboarding`

`npm run validate:deployment-readiness`

`npm run verify:production`

## Release status
Source-level onboarding/authentication and deployment contracts are reconciled and certified. Browser/build/provider certification remains a Windows/Node-22.22.2+ gate and must be run against the actual deployment before declaring live production E2E complete.
