# Email provider (Brevo) — configuration and verification runbook

**Status in this delivery:** the email integration was reviewed and tested **offline** (mocks). **No live delivery was performed** — no credentials, no authorized test recipient and no hosted environment were available. Live delivery is **BLOCKED** until the checklist below is completed. A mock "sent" is never evidence of inbox delivery.

## 1. What the code does (repository evidence)
| Topic | Behaviour |
|---|---|
| Provider | Brevo transactional API `https://api.brevo.com/v3/smtp/email`, 30 s abort timeout, key from `BREVO_API_KEY` only (header `api-key`). Non-2xx responses become errors coded `BREVO_<status>`. |
| Sender | `BREVO_FROM_EMAIL` → `EMAIL_FROM` → fallback `noreply@kayad.space`; name `BREVO_FROM_NAME` (default `KAYAD`); `BREVO_REPLY_TO`. The sender/domain **must be verified in Brevo** or Brevo rejects the message. |
| Verification URL | `${FRONTEND_URL}/verify-email?token=<raw token>` — built from the **environment**, never from the request, so no open redirect. Fallback if unset: `https://www.kayad.space`. **`FRONTEND_URL` must be the public frontend origin in production.** |
| Token | 32 random bytes; only the SHA-256 is stored; 24 h expiry; single use; consumed atomically. |
| Registration | Account + hashed token are committed first; the email is sent asynchronously. A provider failure never rolls the account back and never marks anything verified. |
| Resend | `POST /auth/resend-verification`: generic 202 whether or not the address exists/is verified; new token committed only after Brevo accepts the replacement; old link stays valid if delivery fails; one valid token at a time; rate limited. |
| Enforcement | **Seller/dealer features always require a verified email (Stage 5).** The generic login/`protect` gate remains provider-gated: on only if `REQUIRE_EMAIL_VERIFICATION=true`, or unset *and* `BREVO_API_KEY` set. |
| Logs | Request logs and the production access log now redact path/query tokens (`utils/redactUrl.js`). Provider error text is logged without the token. |

## 2. Environment checklist (names only — never paste values into tickets)
`BREVO_API_KEY` (secret) · `BREVO_FROM_EMAIL` · `BREVO_FROM_NAME` · `BREVO_REPLY_TO` (optional) · `FRONTEND_URL` · `REQUIRE_EMAIL_VERIFICATION` (recommended explicit `true`) · `BREVO_WEBHOOK_TOKEN` (if delivery webhooks are used) · `WEBHOIST_EMAIL`.
Verify presence without printing values, e.g. on the host: `for v in BREVO_API_KEY BREVO_FROM_EMAIL FRONTEND_URL WEBHOIST_EMAIL; do [ -n "${!v}" ] && echo "$v set" || echo "$v MISSING"; done`.

## 3. Brevo-side checklist
1. The sender address/domain is verified; SPF and DKIM pass (DMARC recommended).
2. The API key is an active key restricted to the sending IPs if Brevo's IP restriction is enabled (otherwise requests from the host are refused).
3. Account is out of sandbox/daily-limit trouble (a free plan's daily cap can silently stop onboarding mail).

## 4. Controlled live test (only when authorized)
Needs: the owner's written go-ahead, a **recipient mailbox you control**, and a non-production or clearly labelled test registration. Never use a real customer address.
1. Register a throwaway private-seller account with that mailbox.
2. Within ~2 minutes check the mailbox (and spam). Record: delivered yes/no, sender shown, link host equals `FRONTEND_URL`, link opens the verification page, page shows success.
3. Open the same link again → must show the generic "invalid or expired" message (replay test).
4. Request *Resend*; confirm only the newest link works.
5. Try an old/expired link → generic message.
6. Check that backend logs contain no raw token.
7. Mark the evidence matrix row "LIVE – PASS/FAIL" with date, tester and mailbox owner. Delete the test account afterwards through the normal admin flow.

## 5. Failure modes and what the user sees
| Failure | User sees | Operator action |
|---|---|---|
| Brevo key missing | Registration succeeds; no email; resend returns 202 | Set key; user uses *Resend* |
| Brevo rejects (sender, quota) | Same | Fix in Brevo; *Resend* |
| Wrong `FRONTEND_URL` | Link opens the wrong host | Fix env; users *Resend* |
| Token expired (24 h) | "Invalid or expired verification link. Request a new one." | *Resend* |
| Email lost / spam | — | *Resend*; check sender reputation |

## 6. Not tested live / known limits
- Inbox placement, DKIM/SPF alignment, Brevo webhooks: unverified.
- The verification link is a GET that consumes the token; corporate mail scanners that pre-fetch links can consume it (user then uses *Resend*). Moving consumption to a POST from the page is recommended hardening (not done — it changes the public link contract).
- Welcome and verification emails are two separate sends.
- Resend commits the replacement token after provider acceptance **only when verification is "required"** (`REQUIRE_EMAIL_VERIFICATION=true`, or unset with `BREVO_API_KEY` set). If neither is true the delivery result is not asserted and the new token is committed anyway — harmless while nothing can be delivered, but another reason to set `REQUIRE_EMAIL_VERIFICATION=true` explicitly.
