# KAYAD Advanced Authentication / Identity / Session / Security Sweep — 2026-09-30

## Baseline

Authoritative baseline: `KAYAD-MASTER-AUTH-ONBOARDING-FOUNDATION-20260930.zip`.
This sweep follows the supplied advanced engineering specification and does not reconstruct the older continuation foundation.

## Scope

UI → state → API → transport → CSRF → cookies → authentication → authorization → validation → controller → service → database → queue → provider → webhook → observability → E2E → deployment.

## Root-cause matrix

| Area | Finding | Correction | Gate |
|---|---|---|---|
| Refresh tokens | Raw bearer refresh tokens were persisted in `refresh_tokens.token`. Rotation was not atomic and had no family reuse model. | Hash-only storage, session/family identifiers, atomic PostgreSQL rotation RPC, reuse detection and family revocation. | STATIC PASS; DB/runtime pending |
| Access token claims | Access token generation did not explicitly receive the current `UserAuth.tokenVersion`. | Token generator now receives tokenVersion and sessionId explicitly. | STATIC PASS |
| Auth cache | A 20s user cache could stale security-sensitive account state. | Fresh security-state lookup for protected requests; profile cache remains an optimization only. | STATIC PASS |
| CSRF | Any `Authorization` header bypassed CSRF. | Removed universal bypass; only explicit machine-authenticated routes may bypass, while provider callbacks remain path-authenticated. | STATIC PASS |
| Auth abuse | Public auth limiter was IP-only. | Added account-aware IP+normalized-email limiters for registration, recovery and verification. | STATIC PASS |
| Password lifecycle | Password changes/reset bumped tokenVersion but did not consistently revoke refresh-session rows. | Revoke all refresh sessions before issuing replacement session. | STATIC PASS; runtime pending |
| Session inventory | Session listing exposed metadata but per-session revoke relied on raw token retrieval. | Session IDs are now revocable without exposing raw refresh tokens. | STATIC PASS; DB/runtime pending |
| Route visibility | Auth/onboarding surface was spread across compatibility and versioned mounts. | Canonical v1 remains source contract; generated route inventory identifies duplicate/legacy surfaces for review. | STATIC PASS |

## Identity state machine

`CREATED → EMAIL_PENDING → EMAIL_VERIFIED → PENDING_APPROVAL → APPROVED → ACTIVE`

Exceptional terminal/security states: `REJECTED`, `SUSPENDED`, `BANNED`, `DEACTIVATED`, `DELETED/ARCHIVED`. `PASSWORD_CHANGE_REQUIRED` is an authentication gate that must resolve to `ACTIVE` only after successful password change.

### Transition rules

- Registration creates exactly one identity subject to database email uniqueness.
- Email verification is one-time and purpose-bound.
- Dealer/seller approval is administrative and cannot be self-granted through profile updates.
- Banned/deactivated users cannot regain access through ordinary profile mutation.
- Role changes require privileged authorization; owner status is configuration-derived and must not be granted by editing a profile email.

## Onboarding state matrix

| Actor | Lifecycle | Security boundary | Required evidence |
|---|---|---|---|
| Buyer | registered → verified → active | email verification | verification token |
| Private seller | registered → verified → approval → active | admin approval | account + review decision |
| Dealer | registered → verified → verification/review → approved | dealer verification + admin | business/evidence as configured |
| Inspector | application → review → approved → credentialed → active | admin workflow | application/evidence |

## Token/session security model

- Access JWTs are short-lived and carry the current `tokenVersion` plus a server-issued `sessionId`.
- Refresh JWTs are signed separately from access JWTs and are persisted only as SHA-256 hashes.
- A refresh family represents one logical browser/device session across rotations.
- A rotated token cannot be used again; reuse triggers family revocation and account token-version invalidation.
- Session inventory exposes identifiers and metadata only, never bearer credentials.
- Revoking one session invalidates its refresh path and, because access tokens carry the session ID, protected requests reject that session when its server-side row is no longer active.

## Token/session model

- Email verification/reset/OTP tokens remain hashed at rest and purpose-bound.
- Refresh tokens are now hashed at rest.
- Refresh sessions belong to a family and have a distinct session ID.
- Rotation is atomic: one presented refresh token can claim one successor.
- Reuse of a revoked/expired/version-invalid token triggers family revocation and token-version invalidation.
- Raw refresh tokens are never returned by session inventory APIs.

## CSRF model

Cookie-authenticated browser mutations require the double-submit CSRF token. `Authorization` header presence is not a bypass. Explicit provider callback paths have their own authentication. A future machine client must explicitly authenticate through a trusted machine credential and mark the request before CSRF middleware.

## Route/security matrix

The generated machine-readable route inventory is `docs/ADVANCED_ROUTE_SECURITY_MATRIX.json`. It records method, source route, middleware, authentication detection, CSRF detection and rate-limit middleware for the scanned backend route surfaces. The versioned auth/onboarding/verification/communication graph remains the canonical contract; compatibility mounts are not treated as independent identity implementations.

## Communication state model

`queued → sending → sent → delivered/read`

Failure path: `sending → failed → retrying → sent` and permanent failure: `failed → dead_letter`. Provider webhooks may advance state but must not arbitrarily move a terminal success back to queued.

## Database/RLS authorization

Application service-role access must remain backend-only. `refresh_tokens` is now denied to `anon` and `authenticated`; only the service role can mutate it. Sensitive communication delivery rows remain backend-managed. Final RLS certification still requires execution against the target Supabase environment.

## Failure-mode matrix

| Failure | Required safe outcome | Current certification |
|---|---|---|
| Concurrent refresh | one rotation wins; reuse is detected | STATIC PASS; RUNTIME BLOCKED |
| Redis unavailable | auth does not fail open on security state | STATIC PASS; RUNTIME BLOCKED |
| DB unavailable | no false auth/approval success | STATIC PASS; RUNTIME BLOCKED |
| Brevo timeout | controlled retry/failed state; no false sent | STATIC PASS; LIVE BLOCKED without credentials |
| Duplicate webhook | idempotent/convergent delivery state | STATIC PASS; LIVE BLOCKED |
| Password reset | old refresh sessions invalidated | STATIC PASS; RUNTIME BLOCKED |
| Banned account with cached profile | fresh security state denies access | STATIC PASS; RUNTIME BLOCKED |

## Observability / metrics

Security-relevant telemetry must use request/correlation IDs and user/session IDs where authenticated, but never raw JWTs, refresh tokens, passwords, CSRF secrets, API keys, or full recipient addresses. Recommended counters: registration conflicts, verification success/expiry, login failures, refresh failures/reuse, CSRF failures, 429s, Brevo acceptance/failure, retry/DLQ rate, webhook latency and delivery latency.

## Database/RLS authorization matrix

| Surface | Anonymous | User | Owner/Admin | Service role |
|---|---|---|---|---|
| users | public registration only | own account rules | privileged workflows | backend |
| user_auth | no direct access | no direct access | backend only | backend |
| refresh_tokens | denied | denied | denied to browser | service role only |
| communication_deliveries | denied mutation | own read where policy permits | operational/admin | service role |
| otp_challenges | denied mutation | own read where policy permits | backend workflow | service role |

Final live RLS cross-certification remains an executable Supabase gate.

## Certification status

### STATIC CONTRACT

- Advanced refresh-token design: PASS
- Security-sensitive auth cache separation: PASS
- CSRF Authorization-header bypass removal: PASS
- Account-aware auth abuse controls: PASS
- Password/session invalidation convergence: PASS
- Route inventory generator: PASS
- Advanced auth source gate: 19/19 PASS
- Backend/scripts JavaScript syntax: 837/837 PASS
- Existing registration/onboarding source gate: 46/46 PASS
- Existing V14 holistic source gate: 18/18 PASS
- Existing V14 live-certification contract: 15/15 PASS
- Existing V14 release-candidate gate: 17 PASS / 0 FAIL
- Existing dependency-security gate: PASS

### RUNTIME

**BLOCKED in this environment.** The foundation requires Node `>=22.22.2`; the available runtime is Node `v22.16.0`. `npm ci` refuses the required engine, and a diagnostic `npm ci --engine-strict=false` attempt timed out before dependencies became complete. A diagnostic `npm run typecheck` therefore fails on missing type-definition packages rather than on a certified application result.

### INTEGRATION / E2E

**BLOCKED** until dependencies, a configured Supabase environment and browser runtime are available.

### LIVE PROVIDER

**BLOCKED** until real Brevo credentials/webhook configuration are available.

### PRODUCTION

**BLOCKED** until the target staging/production environment is exercised under the required Node version and deployment configuration.

## Environment blockers observed

1. Node runtime is `v22.16.0`; KAYAD requires `>=22.22.2`.
2. Root dependencies are not complete in this runner; Vite/Vitest/Axios/Supabase packages are unavailable.
3. No live Supabase staging database was available for migration/RLS/concurrency certification.
4. No live Brevo credentials/webhook endpoint were available for provider certification.
5. No production/staging Redis/queue worker environment was available for failure-mode certification.

## Production prerequisites

1. Run Node 22.22.2+ and `npm ci` at root and backend.
2. Apply migrations `20260930110000` through `20260930113000` in order.
3. Reconcile any pre-existing duplicate normalized user emails before the unique functional index is applied.
4. Execute auth/session concurrency tests against staging.
5. Execute RLS/service-role cross-certification.
6. Execute Playwright buyer/seller/dealer/inspector/recovery/adversarial journeys.
7. Configure Brevo API/webhook credentials and perform live acceptance + webhook delivery checks.
8. Verify Redis/session/queue/worker behavior under controlled outage.
9. Verify cookie/CORS settings for production, preview and localhost.

## Remaining certification prerequisites

1. Node >=22.22.2.
2. `npm ci` at root and backend.
3. Apply the advanced Supabase migration.
4. Execute typecheck/build/unit/security/communications/runtime suites.
5. Run concurrency tests against a real Supabase database.
6. Run Playwright lifecycle/adversarial journeys.
7. Perform live Brevo verification/reset/approval/webhook certification.
8. Compare local/staging/production cookie, CORS, CSRF, Redis, queue and worker configuration.
9. Only after executable gates pass, package the next foundation.
