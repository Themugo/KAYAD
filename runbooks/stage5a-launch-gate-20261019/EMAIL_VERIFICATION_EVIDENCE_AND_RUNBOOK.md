# Gate B — Email verification (Brevo): evidence and runbook (Stage 5A)

## Status: **BLOCKED — live delivery NOT performed.** Mocked/captured delivery below is *not* a pass of the live gate.
No Brevo credentials, verified sender domain, or authorized test mailbox exist in this environment, and the hosted project has no onboarded owner. Nothing was sent to any real address.

## Configuration audit (no secret values printed)
| Item | Finding |
|---|---|
| Adapter | `services/emailProvider.service.js` (existing Brevo adapter retained; no other provider introduced) |
| Endpoint | hard-coded `https://api.brevo.com/v3/smtp/email`; not configurable by request data |
| Credential | `BREVO_API_KEY` env only; never in config files, logs or responses (asserted by tests) |
| Sender | `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME`, defaults `noreply@kayad.space` / `KAYAD`. **The sender/domain must be verified in Brevo or delivery is rejected/spam-foldered.** |
| Origins | link built from `FRONTEND_URL` (default `https://www.kayad.space`) → `/verify-email?token=…`; `FRONTEND_URL` and CORS origins must match the real site |
| Timeout / errors | 30 s `AbortSignal`; provider failure is logged, response stays generic, the previous token is kept (new token only replaces the old after the provider accepts) |
| Token | 32-byte random; only the SHA-256 hash is stored (`user_auth.email_verify_token`); 24 h expiry; consumed atomically (one-time); replay and invalid tokens → 400 generic message |
| Resend | always HTTP 202 with an identical body for unknown / verified / unverified / cooldown (no account-existence oracle); per-account cooldown `VERIFICATION_RESEND_COOLDOWN_SECONDS` (default 60) plus IP rate limit |
| Redaction | tokens and the API key never appear in logs (tested). Residual: the retry logger records the recipient address (`to`) — recommended to hash; not changed |
| Enforcement flag | `REQUIRE_EMAIL_VERIFICATION` defaults to "on iff `BREVO_API_KEY` is set". **Set it to `true` explicitly in production**; otherwise a missing key silently turns verification off for non-seller accounts. (Sellers/dealers are always gated.) |

## Evidence obtained (tiers)
* **M (mocked)** — `stage5aEmailVerificationGate.test.js` (13 tests): uniform resend responses, cooldown, URL construction, hashed token, provider failure keeps old token, no token/key in logs, Brevo wire contract.
* **Local runtime + Brevo-API *capture* (not live)** — a local HTTP listener standing in for Brevo recorded the exact request; browser journeys J1/J2 clicked the captured link: verified OK, replay rejected, invalid token rejected, sign-in succeeds only after verification (pre-verification sign-in → 403). See `BROWSER_ACCEPTANCE_REPORT.md`.
* **L (live)** — none.

## Live-test procedure for the owner (exact actions)
1. In Brevo: create/confirm an API key; verify the sender address/domain (SPF + DKIM); note the sender.
2. Set on the backend host: `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `FRONTEND_URL`, `REQUIRE_EMAIL_VERIFICATION=true`.
3. Authorize one test mailbox you control (e.g. a +alias).
4. (After Gate C migration) register that mailbox as a private seller; confirm: Brevo log shows "delivered"; mail arrives; link verifies; reopening the link is rejected; an old/garbled link is rejected; sign-in works afterward; before verification sign-in is refused.
5. Record Brevo message-id and screenshots; then mark Gate B PASS.
