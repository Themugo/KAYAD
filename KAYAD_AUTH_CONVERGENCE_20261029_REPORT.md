# KAYAD Registration / Auth Convergence — Execution Report (2026-10-29)

**Final status: PARTIAL** (code-level complete for the confirmed defect; staging/production and browser verification not performed)

## 1. Foundation
KAYAD-PHASE17-MOBILE-FIRST-LANDING-PAGE-POLISH-20261027.zip
SHA-256 9db1a0765ee059530fa28c82b7d45a0ba7d49a9eea37ed8e622c75c63de55703
No .git directory in the ZIP: branch/commit not recorded. Node v22.22.2, `npm ci` from committed lockfiles (unchanged).

## 2. Route map (verified in source)
- /register -> OnboardingFlow -> useAuth().register -> authApi.register -> POST /api/v1/auth/register
  (registrationLimiter -> validateAuth(zod, role enum dealer|individual_seller|user) -> controller)
  -> RPC kayad_register_identity_atomic (users + profile/dealer triggers + user_auth, one transaction)
  -> 201, no session; verification + welcome email dispatched non-blocking.
- Unique index uq_users_email_normalized on lower(btrim(email)); duplicate -> 409.
- /login -> LoginPage -> POST /api/v1/auth/login (accountLockout); unverified -> 403 "verify your email".
- Resend: POST /auth/resend-verification (verificationLimiter, generic 202). Recovery: /auth/forgot-password, /reset-password (recoveryLimiter).
- AuthModal (two files) are redirect shims to /login; no second sign-in implementation found.
- Independent inspector/mechanic uses inspectorAPI.apply (application, not account).

## 3. Confirmed defect
Frontend `outcomeUnknown` classed every 503 as "unknown outcome". Backend returns 503 with a machine code
(DATABASE_MIGRATION_REQUIRED, ONBOARDING_POLICY_UNAVAILABLE) BEFORE any write, so the outcome is known.
Users saw "connection dropped / we don't know if it was received" for a confirmed non-creation.
NOT confirmed: which cause produced the production screenshot (missing migration, Render cold start >30s,
gateway 502/504). Needs Render logs / verify:production.

## 4. Changes
- src/services/authApi.ts: AuthApiError.code carries backend machine code.
- src/components/OnboardingFlow.tsx: 503+code -> new "Temporarily unavailable / nothing was created" screen;
  bare 502/503/504, 408, network -> unknown (unchanged); unknown-then-409 -> "Your earlier attempt went through";
  "I may already have an account" link keeps role intent.
- Tests: OnboardingFlow.test.tsx (+6, 14->20); backend/tests/registrationSafety.e2e.test.js (new, 6).
No backend source or migration changes. No lockfile changes.

## 5. Tests (exact)
- npm run lint (tsc --noEmit): exit 0
- npm run build: exit 0
- npx vitest run: 125 files, 1014 passed, 1 skipped
- backend jest --runInBand in 4 chunks: 180 suites, 3159 passed, 0 failed (parallel run OOM-killed, exit 137)
- backend npm run test:vitest: 6 files, 36 passed; test:node: 1/1

## 6. Not done / unverified
- Playwright desktop+mobile journeys (no browsers; cdn.playwright.dev unreachable)
- Production checks (api.kayad.space unreachable from sandbox): CORS, cookies, CSRF bootstrap, Vercel rewrite, Brevo delivery
  -> run `npm run verify:production` locally and inspect Render logs
- RLS tests, real-Postgres migration checks
- Server-side idempotency key NOT implemented (duplicates prevented by unique index + atomic RPC; concurrency test: 6 parallel -> 1 account)
- 409 discloses email existence (existing product choice)
- /login route chain has accountLockout but no IP limiter; global limiter not verified
- No exhaustive repo-wide duplicate-flow search

## 7. Changed files
src/services/authApi.ts
src/components/OnboardingFlow.tsx
src/__tests__/onboarding/OnboardingFlow.test.tsx
backend/tests/registrationSafety.e2e.test.js (new)
KAYAD_AUTH_CONVERGENCE_20261029_REPORT.md (new)
