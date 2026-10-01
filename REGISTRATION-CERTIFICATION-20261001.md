# KAYAD Registration Certification — 2026-10-01

## Scope

This pass verifies the canonical standalone KAYAD registration workflow for the three public account categories:

- Buyer → backend role `user`
- Private Seller → backend role `individual_seller`
- Dealer → backend role `dealer`

The work was performed against the current `KAYAD-DRIVE-YOUR-DREAM-PREMIUM-HERO-FOUNDATION-20261001.zip` foundation without introducing a second registration implementation.

## Registration contract

Browser:

`/register`
→ `OnboardingFlow`
→ `AuthContext.register`
→ `authApi.register`
→ `/api/v1/auth/register`

Server:

`/api/v1/auth/register`
→ registration limiter
→ canonical auth validation
→ `register` controller
→ `users` record
→ `user_auth` credential record
→ non-blocking verification/welcome communication
→ HTTP 201

Registration deliberately does not issue an authenticated session. Email verification and explicit login remain separate lifecycle steps.

## Role matrix

| Account type | Frontend role | Backend role | Required seller fields | Registration state |
|---|---|---|---|---|
| Buyer | `buyer` | `user` | None | `approved` user record, email unverified until verification |
| Private Seller | `individual_seller` | `individual_seller` | Business/trading name optional; location optional | `pending` seller record, platform verification remains server-controlled |
| Dealer | `dealer` | `dealer` | Business name + location required | `pending` seller record, dealer verification remains server-controlled |

## Source gates

- Registration/onboarding: 47/47 PASS
- Explicit authentication flows: 19/19 PASS
- Frontend runtime contracts: PASS
- Canonical architecture: PASS
- Premium auth surfaces: 9/9 PASS
- Registration role matrix: 29/29 PASS
- Modified JavaScript syntax checks: PASS
- Foundation ZIP integrity: PASS

## Live production evidence

The canonical production CSRF endpoint was reachable and returned a successful bootstrap response during this pass:

`GET https://api.kayad.space/api/v1/auth/csrf`

The response reported `success: true` and the canonical route `/api/v1/auth/csrf`.

A live POST registration was not executed from this environment because the available tooling can verify the production GET endpoint but does not provide a safe authenticated browser POST harness for creating disposable KAYAD accounts.

## Full runtime test limitation

Full `npm ci`, Vitest, TypeScript and Vite build certification could not be completed in this environment.

Reasons:

1. Project engine requirement: Node `>=22.22.2`.
2. Available runtime: Node `22.16.0`.
3. npm dependency acquisition attempted with engine override, but registry package downloads failed with DNS/network `EAI_AGAIN`.
4. No preinstalled `node_modules` was available in the foundation.

Therefore:

- SOURCE CONTRACT = PASS
- TARGETED STATIC CERTIFICATION = PASS
- LIVE CSRF BOOTSTRAP = PASS
- FULL LOCAL BUILD/VITEST = BLOCKED BY ENVIRONMENT
- LIVE REGISTRATION POST = NOT CLAIMED

## Safe fixes made

1. Updated the registration route's API documentation to explicitly include `individual_seller` and seller onboarding fields.
2. Corrected completion messaging so private sellers are not incorrectly presented as dealer applications.
3. Added `validate:registration-role-matrix` as a repeatable certification gate covering all three public account categories.

No authentication architecture, route family, database model, or marketplace feature was duplicated or replaced.
