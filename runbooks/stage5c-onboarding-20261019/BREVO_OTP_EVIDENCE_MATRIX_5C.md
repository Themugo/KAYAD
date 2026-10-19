# Brevo / OTP test evidence matrix (Stage 5C)

**A stub does not certify real delivery.** All "delivered" evidence below is a capture by a local harness that intercepts `fetch` to `api.brevo.com` and the Africa's Talking axios adapter (`stack/brevo-capture.mjs`). No request left the sandbox to Brevo or Africa's Talking (one early request to Africa's Talking with a fake key returned 403 and was fixed by intercepting the ESM axios instance; no real message resulted).

| Capability | Tier | Result | Evidence |
|---|---|---|---|
| Brevo request shape (endpoint, headers, sender, recipient, subject, body) | R | PASS | captures + `emailProvider` tests |
| Verification email on registration, resend, supersession of earlier link | R | PASS | role_api_a, UI |
| Link single use / replay safe / expiry | R | PASS | role_api_a |
| Provider failure (injected 503): registration still succeeds, gateway records `failed`/retry, user can resend, no false "delivered" | R | PASS | role_api_a |
| Secret-bearing ledger redaction (verification, reset, owner invite, OTP) | R+M | PASS | ledgerRedaction test, role_api_a/e |
| OTP: 6 digits, generated with `randomInt`, hashed at rest, attempts limit, lock, expiry, resend invalidates older, per-user limiter, delivery failure ⇒ `delivery_failed` + 503 | R+P | PASS | role_api_e (30), otpService test |
| Rollout control fails closed | R | PASS | role_api_a |
| **Live Brevo delivery to a real mailbox** | L | **BLOCKED** | needs `BREVO_API_KEY`, verified sender/domain (SPF/DKIM), explicit authorization, a mailbox the owner controls |
| **Live SMS (Africa's Talking) delivery** | L | **BLOCKED** | needs production `AT_API_KEY`/`AT_USERNAME`, sender ID, authorization, a handset |
| Bounce / complaint / webhook handling | L | NOT TESTED | needs live provider |
