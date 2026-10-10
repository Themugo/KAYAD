# KAYAD — Full Project Audit & Communications Go-Live Readiness
Date: 2026-09-28

## Source of truth
This audit started from:
`KAYAD-NEXT-FIX-CORRECTED-FOUNDATION-20260928.zip`

The corrected foundation preserves the completed phases and applies only the communications/go-live corrections listed below.

## Executive result

The KAYAD application architecture is substantially production-oriented and the existing marketplace, transaction, escrow, inspection, dispute, dealer, auction, communications, security, runtime, and operational validators remain green after the new corrections.

The audit found three real communications gaps that were not exposed by the broad source validators:

1. **Phone OTP used the wrong event-control key.**
   The phone verification controller used `phone_verification`, while the database rollout contract uses `account.phone_verification`. Because the communications rollout fails closed, this could suppress the delivery.

2. **OTP could create a challenge even when delivery was suppressed.**
   `createOtpChallenge()` previously treated only a returned `failed` delivery as a failure. A rollout-suppressed `null` delivery could therefore leave a pending challenge while the API reported success. This is corrected to fail closed on both `null` and `failed`.

3. **WhatsApp had a provider adapter but no complete user-facing verification path.**
   The frontend only offered SMS and the backend hard-coded SMS. The corrected path supports SMS or WhatsApp while preserving the same canonical OTP challenge, ledger, rollout control, and provider architecture.

## Canonical production providers

| Channel | Canonical provider | Source evidence |
|---|---|---|
| Email | Brevo | `backend/services/emailProvider.service.js`, `render.yaml` |
| Kenya SMS | Africa's Talking | `backend/services/smsProvider.service.js`, `render.yaml` |
| WhatsApp | Twilio WhatsApp | `backend/services/whatsappProvider.service.js`, `render.yaml` |
| In-app | KAYAD Socket.IO / notification path | communication gateway |

No new provider was introduced.

### External provider requirements

**Brevo**
- API key
- verified sender/domain for `noreply@kayad.space`
- transactional webhook configured
- webhook token configured

Brevo's official API uses `POST /v3/smtp/email` with the `api-key` header and a registered sender. Delivery events can be reconciled through webhooks.

**Africa's Talking**
- API key
- username
- approved Kenya Sender ID
- production balance/account readiness
- delivery-report callback

Africa's Talking documents that a Kenya Sender ID must be registered and that an initial API acceptance does not itself prove handset delivery; delivery reports provide the final status.

**Twilio WhatsApp**
- Account SID
- authentication credential
- registered WhatsApp sender
- approved WhatsApp Content Template
- Content SID
- production status callback

The corrected provider fails closed in production if no approved Content SID is configured. OTP template variables can now be supplied dynamically from the canonical OTP event metadata.

## Registration flow

Current production registration path:

1. User submits registration.
2. KAYAD creates the user and `user_auth` record.
3. Email verification token is generated and only its hash is stored.
4. Verification email is sent through the canonical communication gateway.
5. Registration welcome email is sent through the canonical registration event.
6. Email verification can be resent through `/api/v1/auth/resend-verification`.
7. Production Render configuration now explicitly sets `REQUIRE_EMAIL_VERIFICATION=true`.

Email delivery remains non-blocking to account creation, but production login requires email verification when the verification gate is enabled.

## Phone verification flow

Corrected path:

1. Authenticated user has a phone number on the account.
2. User chooses **SMS** or **WhatsApp**.
3. `/api/auth/send-otp` receives the selected channel.
4. Controller uses canonical `account.phone_verification`.
5. OTP is hashed and stored in `otp_challenges`.
6. Delivery goes through the canonical gateway.
7. If rollout suppresses delivery or provider delivery fails, the challenge becomes `delivery_failed` and the request fails.
8. Successful verification sets `users.phone_verified=true`.

OTP controls:
- 4-digit code
- 10-minute expiry
- 5 attempts
- 15-minute request window
- 24-hour request limit
- hashed OTP storage

## WhatsApp production safety

The provider previously allowed a free-form message when no Content SID existed. The corrected production behavior is:

- approved Content SID present → Content Template path
- dynamic OTP variable available → use the event's variable
- no Content SID in production → fail closed
- non-production without Content SID → free-form path remains available for controlled testing

This avoids silently treating a production WhatsApp template requirement as optional.

## Database rollout correction

A new migration aligns the database-backed communication control plane with the actual application providers:

- email → `brevo`
- SMS → `africastalking`
- WhatsApp → `twilio_whatsapp`

It enables the three communication channels and explicitly enables:
- `registration.completed` → email
- `account.email_verification` → email
- `account.phone_verification` → SMS
- `account.phone_verification` → WhatsApp

Provider credentials still must be configured in the production environment before real outbound delivery can be certified.

## Render configuration correction

Production:
- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `BREVO_FROM_NAME`
- `BREVO_WEBHOOK_TOKEN`
- `REQUIRE_EMAIL_VERIFICATION=true`
- Africa's Talking credentials and Sender ID
- Twilio WhatsApp credentials, Content SID/variables and callback
- communication webhook secret

Staging was also reconciled away from stale SendGrid/SMTP variables toward the canonical Brevo contract.

## Verification performed after corrections

Source-level validators:

- canonical architecture — PASS
- V14 holistic — PASS 18/18
- V14 live certification contract — PASS
- V14 release candidate — PASS
- deployment readiness — PASS
- runtime integrity — PASS
- startup convergence — PASS
- backend runtime contracts — PASS
- Wave 2 invariants — PASS
- Wave 3 convergence — PASS
- automation domain — PASS
- V14 production activation — PASS
- marketplace core — PASS
- communications — PASS
- transaction integrity — PASS
- inspection marketplace — PASS
- dispute integrity — PASS
- code splitting — PASS
- dealer modal convergence — PASS
- chat convergence — PASS
- UI surface convergence — PASS
- auction transport convergence — PASS
- socket contract — PASS
- runtime deep V11 — PASS
- subscription domain — PASS

Changed backend JavaScript files also passed `node --check`.

### Environment-only limitation

The container used for this audit reports Node `22.16.0`; KAYAD requires `>=22.22.2`. Therefore `validate:v14:runtime-preflight` reports 9/10 with only the runtime-version check failing.

This is not a KAYAD source failure. The project already pins Node 22.22.2 in `.nvmrc`, package engines, and the production Dockerfile.

The clean foundation intentionally excludes `node_modules`, so full dependency-backed `npm ci`, TypeScript, Vite build, and test certification must be executed in the target Node 22.22.2 environment.

## Go-live blockers still external to source code

These must be completed in the actual production accounts/environment:

1. Supabase production has applied the new communications alignment migration.
2. Brevo sender/domain is verified.
3. Brevo API key is installed in Render.
4. Brevo transactional webhook is configured.
5. Africa's Talking production account is verified, funded, and Sender ID approved.
6. Africa's Talking delivery-report callback points to the production callback route.
7. Twilio WhatsApp sender is approved.
8. Twilio WhatsApp OTP Content Template is approved and its Content SID is installed.
9. Twilio status callback is configured.
10. `COMMUNICATION_WEBHOOK_SECRET` is set consistently.
11. Render production secrets are populated.
12. Run real provider certification using controlled test email/phone destinations.
13. Run full local certification on Node 22.22.2:
    - `npm ci`
    - `npm run lint`
    - `npm run build`
    - `npm test`
    - `cd backend && npm ci && npm test`
14. Run the production runtime/release gates against the actual deployed environment.

## Important audit observations

- Existing source validators report no backend HTTP 501 placeholders.
- Existing canonical-provider architecture prevents direct provider calls from business workflows.
- `backend/communications/` still exists as a dormant legacy collaboration service and is copied by the Dockerfile. It is not used by the canonical outbound communications gateway and should not be removed during this launch pass without a separate dependency/route audit.
- Historical documentation contains stale references to Resend/SendGrid/SMTP. Runtime code and current production Render configuration use Brevo. These documentation references should be cleaned in a later documentation-convergence pass; they were not allowed to override runtime source truth.
- The broad source validators are green, but real external delivery cannot be claimed until provider credentials and callbacks are actually exercised.

## Launch principle

Do not declare communications "live" merely because credentials exist. The final gate is:

**provider configured → real controlled message accepted → delivery ledger updated → provider callback reconciled → user-visible delivery state confirmed.**

That is the required production certification chain.
