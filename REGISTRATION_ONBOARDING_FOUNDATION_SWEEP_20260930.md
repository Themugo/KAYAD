# KAYAD Registration & Onboarding Foundation Sweep — 2026-09-30

## Scope
Audited the CSRF-route-fixed foundation across the public registration/onboarding chain:

- Buyer registration (`user` canonical backend role)
- Dealer registration (`dealer`)
- Private seller registration (`individual_seller`)
- Inspector application (dedicated application workflow)
- CSRF bootstrap and state-changing request transport
- Registration validation and duplicate-account handling
- Credential creation and identity rollback on failure
- Auth cookie/session issuance
- Email verification link creation and verification endpoint
- Login verification gate
- Resend verification delivery and token replacement safety
- Dealer pending/approval boundary
- Canonical onboarding surface and legacy auth-modal convergence

## Fixes in this foundation

1. **Canonical CSRF bootstrap route**
   - Frontend now uses `/api/v1/auth/csrf` consistently.
   - Removed environment-dependent `/auth/csrf` / `/v1/auth/csrf` bootstrap construction.
   - The frontend captures the server-issued CSRF token in memory as well as using the readable cookie. This supports production UI/API subdomain separation and privacy modes where `document.cookie` may not expose the cookie reliably.

2. **Registration duplicate status**
   - Direct duplicate-email detection now returns HTTP `409 Conflict`, matching the documented contract and the duplicate-key fallback.

3. **Referral side effect removed from the critical registration latency path**
   - Referral credit and referral-record creation now run asynchronously after the account/session path is prepared.
   - A slow referral write cannot recreate the onboarding HTTP timeout.

4. **Verification email remains non-blocking during registration**
   - Registration returns without waiting for Brevo/provider network delivery.

5. **Welcome email remains non-blocking during registration**
   - Welcome delivery is best-effort and outside the registration response path.

6. **Resend verification is non-blocking**
   - Resend now returns `202 Accepted` promptly.
   - The previous persisted verification token remains valid until provider acceptance of the replacement token.
   - Failed delivery therefore cannot strand an account with an invalidated token.

7. **Dealer approval remains server-controlled**
   - Registration creates dealer accounts as pending.
   - Approval remains in the verification/admin workflow.

8. **Canonical registration surface retained**
   - `AuthModal` uses `OnboardingFlow`.
   - The legacy nested auth modal is only a compatibility re-export; it does not implement a second registration flow.

## Certification

### Source contract gate
`node scripts/validate-registration-onboarding.mjs`

**31/31 PASS**

### JavaScript syntax checks
Passed for the changed backend/controller and validation scripts.

### Full npm build limitation
The repository declares Node `>=22.22.2`. The available audit environment has Node `22.16.0`, so `npm ci` correctly refused on the engine requirement. A full `npm ci`, TypeScript check, Vite build, and Vitest run must therefore be performed on the user's Node 22.22.2+ Windows environment before treating this foundation as release-certified.

## Expected live registration sequence

```text
Browser opens onboarding
        |
        v
GET /api/v1/auth/csrf
        |
        v
XSRF-TOKEN cookie + csrfToken response
        |
        v
Frontend stores token in memory
        |
        v
POST /api/v1/auth/register
+ X-CSRF-Token
+ XSRF-TOKEN cookie
        |
        v
Validate -> create user -> create user_auth
        |
        +--> async verification email
        +--> async welcome email
        +--> async referral credit (when applicable)
        |
        v
Persist refresh token + set httpOnly auth cookies
        |
        v
201 registration response
        |
        v
User verifies email
        |
        v
GET /api/v1/auth/verify-email/:token
        |
        v
emailVerified = true
        |
        v
Login / protected onboarding continues
```
