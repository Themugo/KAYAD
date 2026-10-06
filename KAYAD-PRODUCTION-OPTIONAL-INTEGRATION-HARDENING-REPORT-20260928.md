# KAYAD Production Optional-Integration Hardening — 2026-09-28

## Foundation audited

Source foundation: `KAYAD-main (16).zip`.

This sweep focused on the production startup blocker that prevented the live API from starting when M-Pesa, Africa's Talking and Twilio WhatsApp credentials were not yet configured. The audit also checked the surrounding authentication, communications, infrastructure and canonical-architecture contracts so the change would not bypass existing safety gates.

## Root cause confirmed

`backend/utils/env.js` treated all of the following as launch-critical production variables:

- M-Pesa: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`
- Africa's Talking: `AT_API_KEY`, `AT_USERNAME`
- Twilio WhatsApp: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`

That made the entire backend fail startup even though the current first-dealer journey does not require payment, SMS or WhatsApp.

## Changes made

### 1. Production startup now has a clear core contract

The following remain hard production requirements:

- Supabase production URL/service-role key
- JWT, refresh-token and session secrets
- Frontend/backend public URLs
- Cloudinary credentials — current vehicle media path still uses Cloudinary
- Brevo API key and sender — required for the current email-verification flow
- Managed Redis — required by the production queue/rate-limit contract

No payment or communications provider was removed from the codebase.

### 2. M-Pesa is now optional until explicitly activated

M-Pesa credentials are no longer required just to start KAYAD.

If a future deployment sets:

`REQUIRE_MPESA=true`

then all four M-Pesa credentials become mandatory and startup fails closed if any are missing.

### 3. Africa's Talking SMS is now optional until explicitly activated

SMS credentials are no longer required just to start KAYAD.

If:

`REQUIRE_SMS=true`

then `AT_API_KEY` and `AT_USERNAME` are mandatory.

### 4. Twilio WhatsApp is now optional until explicitly activated

WhatsApp credentials are no longer required just to start KAYAD.

If:

`REQUIRE_WHATSAPP=true`

then the complete Twilio WhatsApp credential set is mandatory.

### 5. Missing optional providers are visible, not silently treated as configured

Production validation logs an informational message when M-Pesa, SMS or WhatsApp is unavailable. This preserves operational visibility without blocking unrelated registration/listing functionality.

### 6. Environment template corrected

`backend/.env.example` now documents the three provider groups as optional and uses the canonical KAYAD sender:

`no-reply@kayad.space`

### 7. Auth documentation corrected

The registration/login comments now refer to Brevo rather than the obsolete Resend provider name.

### 8. New internal certification

Added:

`scripts/validate-production-optional-integrations.mjs`

and registered:

`validate:production-optional-integrations`

The certification proves both sides of the contract:

1. Production validation succeeds with M-Pesa/SMS/WhatsApp absent.
2. Setting `REQUIRE_MPESA=true` fails closed without credentials.
3. Setting `REQUIRE_SMS=true` fails closed without credentials.
4. Setting `REQUIRE_WHATSAPP=true` fails closed without credentials.

## Internal verification

### New optional-integration certification

**4/4 PASS**

### C1-C5 communications/auth convergence

**9/9 PASS**

### Canonical architecture

**PASS**

### Communications initiative

**PASS**

### Transaction integrity

**14/14 PASS**

### Inspection marketplace

**21/21 PASS**

### Dispute integrity

**11/11 PASS**

### Code splitting

**PASS**

### Dealer modal convergence

**PASS**

### Chat surface convergence

**PASS**

### UI surface convergence

**9/9 PASS**

### Auction transport convergence

**5/5 PASS**

### Subscription domain

**16/16 PASS**

### Socket contract

**PASS**

### Deployment readiness

**PASS**

### Backend runtime contracts

**14/14 PASS**

### Runtime integrity

**7/7 PASS**

### Wave 2 invariants

**PASS**

### Wave 3 convergence

**PASS**

### Phase 59 repository identity

**11/11 PASS**

### Startup convergence

**PASS**

### Automation domain

**13/13 PASS**

### V14 production activation

**16/16 PASS**

### V14 holistic source gate

**18/18 PASS**

### V14 live certification contract

**15/15 PASS**

### JavaScript syntax

Changed JS/MJS files passed `node --check`.

## Environment limitation during this audit

The available internal runner is Node **22.16.0**, while KAYAD's production contract is Node **22.22.2+**.

Therefore the following runtime/build gates could not be honestly certified in this environment:

- full `npm ci`/dependency installation
- full Vitest suite
- Vite production build
- V14 runtime preflight

The dependency installation also encountered a transport timeout after the first engine check.

The source validators themselves confirm the repository still declares Node `>=22.22.2` and `.nvmrc` remains `22.22.2`.

This is an environment limitation, not evidence of a KAYAD source failure.

## Important findings retained for the next phase

### Canonical media architecture

The active source still contains real Cloudinary integration for vehicle/dispute media. Supabase remains the authoritative database/backend layer, but Cloudinary has not actually been removed from the media path. This foundation therefore intentionally keeps Cloudinary production requirements intact.

### Legacy provider references remain

The audit found residual SendGrid references in legacy/compatibility areas, including a SendGrid webhook route and staging environment template. The canonical transactional email path remains Brevo. These references were not removed in this blocker-focused sweep because doing so would widen the change surface beyond the immediate production-startup correction. They should be handled as a separate communications cleanup step with their dependent validators/OpenAPI contract updated together.

### Existing communications architecture remains intact

The canonical provider mapping remains:

- Email → Brevo
- SMS → Africa's Talking
- WhatsApp → Twilio
- In-app → Socket.IO/canonical notification path

No provider was replaced or duplicated.

## Operational result

The intended production profile after this foundation is:

**Required now**

Supabase + Redis + Cloudinary + Brevo + core auth/security

**Optional until activated**

M-Pesa + Africa's Talking SMS + Twilio WhatsApp

This allows the next live test to concentrate on:

1. API startup/health
2. KAYAD registration
3. Brevo verification email
4. Email verification link
5. Login
6. Dealer onboarding
7. First vehicle listing
8. Cloudinary media upload

Payment, SMS and WhatsApp can be activated later without redesigning the architecture.
