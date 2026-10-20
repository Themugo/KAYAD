# Stage 5E.1 — Resend token-commit and failure-semantics evidence

**Invariant under test:** *a replacement verification token must not replace the currently stored usable token until Brevo has accepted the replacement email.*
Code: `authController.resendVerification` — token is generated in memory, `deliver()` runs, `assertEmailDeliverySucceeded()` (unconditional) requires `status === "sent"`, **then** `userAuth.save()`.
Method: the **real** controller, gateway, `email.service` and Brevo adapter run; only `fetch`, storage doubles, log sinks and the retry sleeper are replaced. Tier **M**: nothing was sent and Brevo was never contacted.

| # | Required scenario | Test(s) | Result |
|---|---|---|---|
| 1 | Brevo accepts → replacement committed safely | `E1` (2): one `POST https://api.brevo.com/v3/smtp/email`, `api-key` header, stored value = SHA-256 of the emailed token, 24 h expiry, ledger row `brevo/sent` | **pass** |
| 2 | Brevo rejects → old token remains valid | `E2` 400, 401 (invalid key), 403, 429, unparseable 502 body — token + expiry unchanged, old link still verifies, response generic 202 | **pass** |
| 3 | Brevo unavailable / times out → old token remains valid | `E2` 503, network failure (`fetch` rejects), `TimeoutError` abort | **pass** |
| 4 | Configuration missing/invalid → no false success, no premature rotation | `E3`: key missing ⇒ **0 network calls**, ledger `failed` "not configured", token unchanged; `REQUIRE_EMAIL_VERIFICATION=false` + 401 ⇒ unchanged; sender bound at process start; adapter tests: unset sender falls back to default, missing key/recipient/subject fail before any request | **pass** |
| 5 | DB persistence fails **after** provider acceptance | `E4`: provider accepted (ledger `sent`), `save()` throws ⇒ persisted token unchanged, response still 202, `Verification resend failed … db write failed` logged (no token/key/URL), the stranded emailed link is refused (400), the **old link still works**, and a later resend commits cleanly | **pass** — *residual:* the user holds an email whose link is dead; recovery = request again (not blocked by cooldown because it keys off the persisted token) |
| 6 | Link expired / replayed / malformed / wrong identity | `E5`: single use, replay 400, expired 400, six malformed shapes 400 (empty, short, non-hex, 10 000 chars, JSON-looking, unicode), user B's token cannot verify user A, superseded token refused after a committed resend | **pass** |
| 7 | Repeated resend rate-limited | cooldown (`E6`, `B2` in 5A): second resend inside 60 s ⇒ no provider call; real `verificationLimiter` (`stage5e1VerificationRateLimit`, 5 tests): 9th request ⇒ 429 `AUTH_RATE_LIMITED` + `Retry-After: 900`, case/whitespace variants share a budget, other addresses unaffected, token-guessing on the verify route throttled | **pass** |
| 8 | No account-existence oracle | `E6`: unknown / already-verified / unverified answered by byte-identical `[202, body]`; only the unverified account produced a provider call; limiter budget identical for known and unknown addresses | **pass** |
| 9 | Raw tokens never in logs, ledger, errors, artifacts | `E1`: ledger JSON, every log line, idempotency key checked for the raw token, `verify-email?token=<raw>` and the API-key fixture; ledger metadata has `sensitiveBodyOmitted` and **no** `html`/`text`; `E2`/`E4` re-assert on failure paths; `stage5aEmailVerificationGate` B3/B4 still pass | **pass** |
| 10 | Acceptance ≠ delivery ≠ link consumption | `E7`: after acceptance ledger = `sent`, account still unverified; a Brevo `delivered` status update moves the ledger only; verification happens only on opening the link | **pass** |

## Do the tests have teeth? (mutation check, performed on a copy and restored — controller byte-compared afterwards)
| Mutant | Result |
|---|---|
| remove the provider-acceptance assertion | **18 failures** across the new + 5E tests |
| persist the token *before* delivery | **11 failures** in the new integration suite |
Restored controller ⇒ 51/51 across `stage5e1*` + `stage5eResend*`.

## Existing communications contract / idempotency
Unchanged: `deliver` is idempotent on `(provider, channel, idempotencyKey)`; the key embeds only the first 16 hex of the token **hash**; unique-violation `23505` recovers the canonical row; secret-bearing events never persist a body, so `communicationRetryCron` can never re-send them (verified by reading the cron's `if (!meta.message && !meta.text && !meta.body) continue`).

## Limits
Mocked HTTP only. Brevo's real error bodies, rate limits, domain-authentication behaviour and mailbox delivery were **not** exercised. The retry sleeper was disabled in the integration file (the real policy is covered separately in `stage5e1BrevoAdapterRetry`).
