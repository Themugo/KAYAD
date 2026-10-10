# KAYAD Registration Failure Fix — 2026-09-30

## Observed failure

Production surfaced:

`Registration could not be completed. Please try again.`

## Root cause

The registration controller awaited external verification-email delivery whenever `BREVO_API_KEY` was configured or `REQUIRE_EMAIL_VERIFICATION=true`.

The communication gateway intentionally converts provider failures into a failed delivery record. Registration then called `assertEmailDeliverySucceeded(...)`, which threw and entered the production catch block that returns the generic HTTP 500 message.

This contradicted the repository's existing registration-timeout contract, which requires verification and welcome email delivery to remain non-blocking during account creation.

## Correction

Registration now always dispatches the verification email asynchronously:

`void deliver(verificationPayload).catch(...)`

The durable registration response is no longer dependent on Brevo/provider acceptance or latency.

Email verification policy remains intact. When verification is required, an unverified account remains blocked by the existing login verification gate. The existing resend-verification flow remains the recovery path for failed or delayed delivery.

Welcome email and referral processing remain non-blocking as before.

## Regression protection

- Registration/onboarding source gate: 46/46 PASS.
- Canonical CSRF route contract: PASS (live probe blocked because no API base was configured).
- Canonical architecture validation: PASS.
- Dependency security validation: PASS.
- Changed JavaScript/MJS files pass Node syntax checks.
- Existing registration contract test already asserts that registration must not await external verification or welcome email delivery.

## Runtime limitation

Full `npm ci`, typecheck, build, and executable integration tests could not be certified in this environment because the repository requires Node `>=22.22.2` while the available runtime is Node `22.16.0`. A dependency installation attempt with the engine requirement disabled timed out before producing a complete dependency tree.

Production DNS/API access is also unavailable from this environment, so the live registration endpoint cannot be claimed fixed until the corrected foundation is deployed and exercised against the real API.
