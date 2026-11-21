# Stage 5E.1 — Brevo email-flow map (source-traced; mocked-HTTP verified)

**Canonical provider = Brevo, one adapter.** Every application email reaches the network through exactly one function:
`services/emailProvider.service.js → sendBrevoEmail()` → `POST https://api.brevo.com/v3/smtp/email` (`api-key` header, 30 s abort signal, `withRetry`).
`services/email.service.js → sendRawEmail()` is its only caller; `sendEmail` is an alias of it. A repository-wide search of non-test backend code found **no** other mail transport
(no SMTP/nodemailer/SendGrid/Mailgun/SES/Postmark/Resend client). SMS (Africa's Talking) and WhatsApp (Twilio) are separate channels inside the same gateway and **never** stand in for email.

Evidence tiers: **S** source · **M** mocked HTTP (nothing sent) · **H/L** hosted/live = **NOT PERFORMED**.

## 1. Path
```
controller / service  ──►  communicationGateway.deliver({channel:"email", eventType, recipient, subject, html, text, idempotencyKey})
        │                       ├─ preference + admin rollout check
        │                       ├─ ledger row  communication_deliveries  (queued → sending → sent | failed | dead_letter)
        │                       └─ sendRawEmail ─► sendBrevoEmail ─► Brevo REST
        └─ builders (email.service.js buildVerificationEmail / buildPasswordResetEmail / buildOwnerInvitationEmail …)
```
`sendRawEmail` returns `{success:false}` if `BREVO_API_KEY` is absent or Brevo refuses; the gateway turns that into a `failed` ledger row; **it never fabricates `success:true`** (M: E3, E2).
Delivery status vocabulary: `sent` = **provider accepted** the message; only a Brevo webhook (`handleProviderStatus`) can advance it to `delivered`/`bounced`. Acceptance ≠ mailbox delivery ≠ link click (M: E7).

## 2. Flows
| Flow | Entry (source) | Event / template | Secret in message? | Ledger body persisted? | Token commit vs provider acceptance | Failure behaviour | Evidence |
|---|---|---|---|---|---|---|---|
| **Registration verification** | `authController.register` → `deliver(verificationPayload)` (fire-and-forget) | `account.email_verification` / `account_verification_email` | yes — verify link | **no** (`sensitiveBodyOmitted`) | New account: hashed token is committed **with the account** (RPC) before sending; there is no earlier token to protect | Delivery failure is logged; account is kept; user recovers through **resend** | S; earlier stages' registration tests |
| **Resend verification** | `authController.resendVerification` | same event, `metadata.resend=true`, idempotency key `verification-resend:<user>:<hash16>` | yes | **no** | **Replacement token is persisted only after the gateway returns `status:"sent"`** — in every env configuration (Stage 5E fix; `assertEmailDeliverySucceeded` is unconditional) | Reject / outage / timeout / bad key / missing key → previous token untouched, response still generic 202 | M: `stage5e1BrevoResendIntegration` E1–E4 (27 tests), `stage5eResendCommitOnProviderAcceptance` (13) |
| **Password reset** | `authController.forgotPassword` | `account.password_reset` | yes — reset link | **no** | ⚠ token is persisted **before** dispatch and is **not** rolled back when Brevo refuses (see F-5E1-04). Not covered by the verification-token invariant | A failed send leaves a reset token nobody received; the previous reset link is replaced. User simply requests again | S (finding, no change) |
| **Owner invitation / recovery invite** | `ownerGovernance.service` `sendInvitationEmail` → `deliver` | `owner.invitation` / `owner_invitation_email` | yes — one-time acceptance link | **no** | ⚠ First invitation: row + hashed token are created by the RPC before sending. **Resend** (`kayad_owner_resend_invitation`, `resendInvitation`, `bootstrapApply --resend`, recovery re-issue) **rotates the stored token inside the RPC before the email is attempted** — the same hazard class that was fixed for verification resend (F-5E1-05). The caller is told `{delivered:false}` when Brevo refuses, so it is visible, but the previous link is already replaced | Reported to the inviting owner as not delivered; the owner must resend (1-minute cooldown applies) | S; `stage5bOwnerRegistry` tests. Governance tables are **not installed on hosted**, so this is a pre-deployment design item |
| **Owner membership notices** | `ownerGovernance.service` notice loop | `owner.security_notice` (category `system`) | no link, no secret | n/a | n/a | Best-effort; failure logged with masked address | S |
| **Security alerts** | `utils/securityLogger.sendEmailAlert` | `security.alert` | no secrets (action, actor, target, IP) | yes (not secret-bearing) | n/a | swallowed with a warning | S |
| **OTP (Stage 5C)** | `services/otpService` → `deliver` | category `otp` | yes — one-time code | **no** (category rule) | n/a | OTP issuance fails closed | S |
| **Welcome / dealer approval / team invite / auction & payment mail** | `email.service.js` senders or `emitCommunication` | various | team-invite link only | team invite: no persisted-body rule (not in the secret-bearing set) | n/a | best-effort | S |
| **Queue worker** | `workers/emailWorker.js` | — | — | — | — | uses the same `sendRawEmail` | S |

## 3. Retry semantics (important for secret-bearing mail)
`communicationRetryCron` re-delivers only `failed` rows whose stored metadata still has a body. Secret-bearing rows have **no stored body**, so they are **never auto-retried** — a stale verification/reset/invitation link can never be re-sent from the ledger. Recovery is always a fresh user-initiated request (M: E4; S).

## 4. Configuration contract (names only — values never printed)
| Variable | Read by | If missing |
|---|---|---|
| `BREVO_API_KEY` | adapter, `sendRawEmail`, gateway `providerConfigured` | send refused before any network call; ledger `failed`; **no token rotation**; no success reported |
| `BREVO_FROM_EMAIL` (or `EMAIL_FROM`) | `email.service.js` (bound at **process start**), gateway `providerConfigured` | adapter falls back to `noreply@kayad.space`; Brevo accepts that only if the sender/domain is validated; the gateway treats email as **not configured** for event-driven messages (`emitCommunication`) — **divergent predicates, F-5E1-03** |
| `BREVO_FROM_NAME`, `BREVO_REPLY_TO` | adapter / `sendRawEmail` | defaults (`KAYAD`, none) |
| `FRONTEND_URL` | link builders (`authController`, `ownerGovernance`, `email.service` footer) | falls back to `https://www.kayad.space` — a staging/preview deployment without it would mail **production** links |
| `BREVO_WEBHOOK_TOKEN` | `communicationWebhookRoutes` | no delivered/bounced updates (acceptance only) |
| `REQUIRE_EMAIL_VERIFICATION` | login gate for ordinary users | no longer influences the resend commit point |

New offline/read-only check: `node backend/scripts/brevo-readiness.mjs` (presence + shape, no network) and, only when you pass `--live-readonly`, two `GET`s to Brevo (`/v3/senders`, `/v3/senders/domains`) that tell you whether the key is accepted and the From address / domain is validated. It sends no email and prints no secret. **It has not been run against Brevo by Claude.**

## 5. What is and is not established
| Claim | Status |
|---|---|
| All identity email goes through the single Brevo adapter | **Established (S)** |
| Resend never replaces the stored token unless Brevo accepted | **Established (M, mutation-tested: 18 and 11 failures when the invariant is broken)** |
| Brevo is configured and operational on the deployed backend | **UNKNOWN (U)** — variable *names* exist in code and `render*.yaml` declares them `sync:false`; values are not visible to source |
| The sender / domain is validated in Brevo, SPF/DKIM/DMARC pass | **UNKNOWN** |
| A mail reaches the owner's mailbox | **NOT TESTED** (no live send was authorised) |
