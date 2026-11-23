# Email delivery audit

Evidence tiers used below: **S** = read from source; **M** = mocked/unit test; **L** = real backend + database on a disposable stack with a loopback provider stub (not Brevo); **H** = read-only query of the hosted database; **P** = provider API acceptance (Brevo) — **none obtained**; **D** = actual mailbox delivery — **none obtained**. Nothing in this report claims P or D.

## Provider and sender (S, H)
* Exactly one email provider is implemented: **Brevo** transactional API (`https://api.brevo.com/v3/smtp/email`, 30 s abort, retry with circuit breaker). No SMTP, no Supabase-Auth mailer and no second provider exist, so there is no "wrong fallback provider" path. When `BREVO_API_KEY` is absent the send returns `disabled` and the delivery is recorded as failed.
* Sender: `BREVO_FROM_EMAIL` → `EMAIL_FROM` → `noreply@kayad.space`; display name `BREVO_FROM_NAME` → `KAYARD KE`. `render.yaml` pins `BREVO_FROM_EMAIL=noreply@kayad.space` and `BREVO_FROM_NAME=KAYAD` (the display name differs from the code default; cosmetic, owner's call). `BREVO_API_KEY`, `BREVO_WEBHOOK_TOKEN` and `FRONTEND_URL` are `sync: false`, i.e. set by hand in Render. **Their presence and values on the live service are NOT VERIFIED.**
* Links are built from `FRONTEND_URL` (default `https://www.kayad.space`), never from the request: `/verify-email?token=…` and `/reset-password?token=…`.

## Flows traced (S, L)
| Flow | Trigger → send | Commit point | Result recorded as |
|---|---|---|---|
| Registration verification | after DB commit, async | token hash already stored | ledger row `queued → sent` (provider accepted) or `failed` + `last_error`; **not retried automatically** (secret-bearing bodies are not stored, so the retry worker skips them) → recovery is the user-facing resend |
| Resend verification | generic 202 always; 60 s per-account cooldown | replacement token stored **only after** provider acceptance | failed resend leaves the old link valid |
| Welcome | async, separate message, idempotent per user | — | ledger |
| Password reset request | generic 200 always; token stored first | token hash stored before dispatch; 1 h expiry | ledger; no email for unknown address |
| Password reset completion | `POST /reset-password` | atomic consume + token-version bump + all sessions revoked | — |
| Other transactional (dealer verified etc.) | `deliver()` via communication gateway | — | ledger |

`sent` means **provider accepted the request**. Only a Brevo webhook (needs `BREVO_WEBHOOK_TOKEN` and the webhook configured in Brevo) can move a row to `delivered`/`bounced`. Neither the UI nor any API response claims delivery (journey 20 B2, B6).

## Hosted evidence (H, read-only aggregates, no addresses)
`communication_deliveries`, channel email, all time: verification 3 `sent`; password reset 3 `sent`; dealer.verified 1 `sent`; registration.completed 1 `sent`; **0 failed, 0 with an error**; activity between 2026-10-20 and 2026-11-09. So the provider path worked at least up to 9 Nov, and no failed delivery has ever been recorded. The absence of failures after 9 Nov is because **no registration reached the email step** (R1), not evidence that email is healthy now.

## Behaviour verified on the disposable stack (L, loopback provider stub)
Registration sends one verification email with a 64-hex link on `FRONTEND_URL`; provider failure keeps the account, returns 201 in < 3 s, records `failed` + `last_error`, and resend after recovery delivers a working link; failed resend keeps the earlier link valid; resend within the cooldown sends no duplicate; unknown/verified addresses get an identical generic reply and no email; reset request/complete/replay/expired/weak-password cases; no raw token or password in the backend log; no email body or provider key in the ledger. Details: `REGISTRATION-REPAIR-REPORT.md`.

## Not verified (explicitly)
* Brevo acceptance with the real key, sender/domain authentication state, daily quota/sandbox state, IP restrictions: **BLOCKED** (no credentials).
* SPF, DKIM, DMARC for `kayad.space`: **NOT TESTED** (no DNS access). Brevo requires an authenticated sender/domain or it rejects the message; check in the Brevo dashboard (Senders & IP → Domains) and in DNS.
* Inbox vs spam placement, bounce/complaint logs, webhook receipt: **NOT TESTED**.
* Provider timeout against the real API: the 30 s abort and retry are covered by mocked tests (M); the loopback stub can only simulate a 500.
* The hosted `FRONTEND_URL` value and `REQUIRE_EMAIL_VERIFICATION`: **NOT VERIFIED**.
