# KAYAD Master Authentication / Registration / Onboarding Sweep — 2026-09-30

## Foundation

Baseline: `KAYAD-END-TO-END-AUDIT-FIXED-FOUNDATION-CONTINUATION-20260930.zip`

Baseline SHA-256: `67f502a74ad2110d9a57621c58df9f257bc392cf8a73d94461e7e903c123f202`

This sweep was performed against that foundation only. No older KAYAD foundation was used.

## Engineering objective

The sweep treated registration, onboarding, API transport, CSRF, sessions, JWTs, email, provider routing, E2E and documentation as one connected lifecycle rather than independent files.

Canonical lifecycle:

`Onboarding UI → AuthContext → API transport → CSRF → canonical route → validation → controller → persistence → communication gateway → Brevo → verification → explicit login → httpOnly session → refresh → protected API → role authorization → logout/session revocation`

## Corrections made

### Authentication / API transport

- Replaced broad auth-endpoint 401 handling with explicit endpoint classification.
- Login 401 is now a normal credential failure and does not emit `kayad:auth-expired`.
- Registration failures do not emit global session expiry.
- Session/profile probes can attempt refresh without emitting a global expiry event when the probe itself fails.
- Refresh 401 is the explicit session-expiry boundary.
- Protected API 401s refresh and retry the original request once.
- Refresh requests are coordinated through a shared in-flight promise to prevent refresh storms.
- Logout/auth-expiry clears the in-memory CSRF token so the next mutation can bootstrap fresh CSRF state.
- CSRF 403 validation failures now clear the in-memory token, bootstrap a fresh server-issued token, and retry the mutation once.

### CSRF

- Preserved canonical `/v1/auth/csrf` relative path with `/api` Axios base, producing `/api/v1/auth/csrf`.
- Fixed the CSRF source-contract test so it does not depend on a non-file `import.meta.url` under Vitest/jsdom.
- CSRF test now resolves the project source path from `process.cwd()`.
- Server-issued CSRF token remains captured in memory before the first state-changing request.
- Concurrent bootstrap remains deduplicated.

### Registration / onboarding

- Kept registration sessionless: registration does not issue browser auth cookies or JWT JSON.
- Updated the AuthModal regression test to exercise the actual canonical `OnboardingFlow` dealer contract rather than an obsolete payload.
- Dealer test now supplies a valid password plus required business name and location.
- Canonical role mapping remains buyer → `user`, private seller → `individual_seller`, dealer → `dealer`, inspector → dedicated application.
- Phone verification frontend paths were migrated from `/api/auth/*` to `/api/v1/auth/*`.

### Email / Brevo

- Brevo remains the sole transactional email provider.
- Removed obsolete Nodemailer dependency from backend package manifest and lockfile.
- Removed obsolete SendGrid webhook runtime route.
- Removed obsolete SendGrid OpenAPI webhook contract.
- Updated communication cleanup validators so they reflect the Brevo/Twilio/Africa's Talking architecture.
- Updated active operational/setup documentation from SendGrid/SMTP language to Brevo.
- Provider adapter logs now redact recipient email addresses.
- Email worker logs redact recipient email addresses.
- Email provider adapter no longer queues failed messages itself.
- Queue/retry ownership remains above the provider adapter, preventing registration-critical rollback from leaving orphaned queued verification links.
- Email worker now throws on provider failure so BullMQ retry/DLQ semantics can operate correctly.

## Static certification results

PASS:

- Registration/onboarding source gate: **46/46**
- Phase 5 E2E contract: **23/23**
- Email-only launch: **11/11**
- Email reliability: **8/8**
- Frontend runtime contracts: PASS
- Backend runtime contracts: **14/14**
- API availability: **8/8**
- Session availability: **7/7**
- Response lifecycle: PASS
- Production runtime corrections: **9/9**
- Worker runtime: **9/9**
- Foundation integrity: PASS
- C1-C5 convergence: **9/9**
- Phase 7 security release: **15/15**
- Phase 8 operations: **15/15**
- V14 holistic source gate: **18/18**
- V14 live certification contract: **15/15**
- V14 release-candidate gate: **17 PASS / 0 FAIL**
- Communications cleanup provider certification source gate: PASS
- Communications OTP E2E source gate: **20/20**
- Changed JS/MJS syntax checks: PASS
- Runtime provider-source search: no active Nodemailer/SendGrid/Mailgun references in backend/src/e2e/scripts
- Frontend legacy phone-auth route search: no remaining `/api/auth/send-otp`, `/api/auth/verify-phone`, `/api/auth/phone-status`, or `/api/auth/csrf` calls

## Environment-blocked certification

These are NOT source failures:

1. Node runtime is **22.16.0**, while KAYAD requires **>=22.22.2**.
   - Phase 6 release: 38/39, only Node runtime blocked.
   - V14 runtime preflight: 9/10, only Node runtime blocked.

2. Full dependency installation could not complete in this execution environment.
   - `npm ci` could not complete within the environment timeout.
   - `node_modules` therefore remains incomplete.

3. Full TypeScript/build/Vitest certification could not be honestly completed.
   - `tsc --noEmit` is blocked by missing type packages.
   - `npm test -- --run` is blocked because Vitest is not installed in the incomplete dependency tree.
   - `validate:release` is blocked because the local `typescript` package is missing.

4. Live provider certification is blocked because real Brevo credentials are not present in this environment.
   - `validate:communications:providers` reports Brevo NOT CONFIGURED.
   - This is an environment prerequisite, not a source-level provider-routing failure.

5. Local runtime certification is blocked by incomplete backend dependencies (`dotenv` missing from the partial install).

No blocked test has been represented as a PASS.

## Remaining Windows certification gate

Run on the Windows KAYAD machine with Node 22.22.2+ and configured staging/production credentials:

```cmd
cd /d "C:\Users\hp\Desktop\KAYAD-main"
npm ci
npm run typecheck
npm run build
npm test -- --run
npm run validate:registration-onboarding
npm run validate:phase5-e2e
npm run validate:email-only-launch
npm run validate:email-reliability
npm run validate:communications:providers
npm run validate:deployment-readiness
npm run validate:release
npx playwright test
```

Then perform live Brevo verification, registration, email verification, resend verification, password recovery, dealer approval notification and full cookie-backed login/refresh/logout journey.

## Release principle

The new foundation must not be considered live-certified until the Windows runtime, full dependency tree, Playwright, staging services and real Brevo credentials have been exercised successfully.
