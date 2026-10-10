# KAYAD Registration Holistic Correction — 2026-09-30

## Corrected registration failure chain

- Production CSRF token is shared across KAYAD subdomains and remains stateless.
- Buyer UI role is normalized from frontend `buyer` to backend canonical `user`.
- Registration schema now preserves dealer/individual-seller `businessName` and `location` fields instead of silently stripping them.
- Dealer registration requires business name and location at the backend boundary as well as in the UI.
- Onboarding performs client-side password/name/email/dealer-field validation before sending the request.
- Registration maps duplicate-key races to HTTP 409 instead of a generic 500.
- Registration cleans up both identity records if credential persistence fails.
- Registration cleans up both identity records if final refresh-token/session issuance fails.
- Pending dealer/seller admin notification is triggered without making registration depend on notification delivery.
- Auth client distinguishes CSRF, validation and conflict failures.

## Intentionally unchanged

- Strong password policy remains canonical.
- Email verification remains fail-closed only when verification is required by deployment policy.
- Optional SMS/WhatsApp providers remain non-blocking.
- No migration history is rewritten.
