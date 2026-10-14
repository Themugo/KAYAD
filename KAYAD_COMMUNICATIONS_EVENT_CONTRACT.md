# KAYAD Communications Event Contract — First-Seller Launch

**Date:** 14 October 2026  
**Canonical gateway:** `backend/services/communicationGateway.service.js`  
**Event registry:** `backend/services/communicationEvents.service.js`  
**Rollout controls:** `backend/services/communicationRollout.service.js`

## Contract principles

1. The communication gateway and `communication_deliveries` ledger remain the existing canonical infrastructure; no parallel messaging system was added.
2. A queued ledger row is not provider acceptance. `sent` means the configured adapter accepted/sent according to the current adapter contract; `delivered` requires provider webhook evidence. An event being emitted or queued must not be described as delivered.
3. `in_app` is enabled by the existing gateway. External channels are fail-closed by `communication_event_controls` and global channel controls; newly introduced event/channel combinations are not implicitly enabled.
4. Delivery IDs, idempotency keys, provider message IDs, provider event hashes, timestamps and status transitions support operational tracing. Provider event IDs are hashed before persistence.
5. Verification and password-reset tokens are bearer-equivalent secrets. Their rendered HTML/text/message bodies must not be retained in delivery metadata, logs, admin views or retry payloads.

## Event matrix

| Canonical event ID | Trigger/source | Target | Channels / expected outcome | Idempotency / retry | Sensitive-data and audit rule |
|---|---|---|---|---|---|
| `registration.completed` | Successful atomic identity creation in `authController.register` | New seller/user | Welcome email only when event/channel control and provider permit; durable failure should remain observable | `registration-welcome:<userId>`; existing gateway retry policy for non-secret body | Do not include password, tokens or full identity documents |
| `account.email_verification` | Registration or resend verification | New/unverified account owner | Verification email; provider acceptance and delivery tracked separately | Registration key `registration-verification:<userId>`; resend uses a token-hash-derived unique key; resend flow rotates persisted token only after provider acceptance when required | **HTML/text/message body omitted from persistent delivery metadata**; no raw token in logs or audit. Recovery through resend, not body replay |
| `account.password_reset` | Forgot/reset-password flow | Account owner | Reset email with same provider/delivery distinction | Existing reset-flow idempotency/recovery contract; must not replay persisted body | **HTML/text/message body omitted from persistent delivery metadata**; no raw token in logs or audit |
| `dealer.submitted` | New seller registration pending review; emitted by `notifyAdminsOfPendingSeller` | Authorized staff/admin users | In-app admin notification; email only when `dealer.submitted`/email rollout control is explicitly enabled | Gateway event identity includes seller ID; database unique/idempotency contract remains authoritative | Metadata: seller ID, role, seller type and source event only. No credential/token material |
| `dealer.verified` | Dealer approval/verification decision | Seller | Seller status communication according to configured rollout and admin workflow | Existing gateway idempotency; verify current producer call and control row before enablement | Record decision actor/reason in business audit; do not trust client-supplied actor/outcome |
| `dealer.subscription_activated` | Successful subscription activation from payment | Dealer | In-app/email and optional channels per existing policy | Payment ID used as event identity where emitted | Do not infer activation from payment initiation; use authoritative successful activation |
| `support.case_created` | Existing support case creation | Authorized support queue and/or requester | In-app/admin notification according to current support workflow | Case ID/source event should be idempotency identity | Avoid exposing another seller's message or documents across tenant boundary |
| `support.case_updated` | Support response/update | Requester and authorized support staff | In-app and configured email as intended | Case ID plus state/version should distinguish updates | Link response to originating case and staff actor; redact unnecessary PII |
| `support.contact_form` | Existing public contact form | Authorized support queue | Durable admin-visible request; external email only when configured | Existing source/case ID; avoid duplicate alert on retries | Validate/sanitize user content; do not trust caller-supplied admin identity |
| `admin.action` | Existing admin action producer | Target user / audit as implemented | Only where current business action requires notification | Existing source record ID | Actor and result must be derived server-side and correlated to audit |
| `account.phone_verification` | Phone verification flow | Account owner | Existing phone-verification behavior | Existing phone token/OTP controls | OTP must not appear in general logs, delivery ledger metadata or admin views |

The registry includes many additional auction, payment, escrow, inspection, dispute and marketplace events. This first-seller matrix does not authorize those unrelated events or alter their delivery policies.

## Resolution: `seller.approval_pending` vs `dealer.submitted`

The pre-pass producer emitted `seller.approval_pending`, while existing rollout controls and the canonical event registry use `dealer.submitted`. Because rollout control lookup is an exact `(eventType, channel)` match and fails closed, the mismatch could suppress the intended external notification even when `dealer.submitted` had been enabled.

**Local fix:** `notifyAdminsOfPendingSeller` now emits `COMMUNICATION_EVENTS.DEALER_SUBMITTED` (`dealer.submitted`) and records `metadata.sourceEvent = "seller.approval_pending"` for traceability. `metadata.sellerType` distinguishes `dealer` from `individual_seller`; the canonical event ID is not duplicated. Existing in-app delivery remains available; external email still requires the canonical rollout control to be enabled and Brevo configured. A staging control-row check and actual notification test remain required.

## Delivery states and retries

- `queued`: accepted into the local delivery workflow; not evidence of provider acceptance.
- `sending`: an attempt is underway.
- `sent`: the adapter returned success/provider message identifier where available; not mailbox delivery.
- `delivered`: provider webhook evidence recorded.
- `read`: supported provider event recorded; do not treat as universal across channels.
- `failed` / `bounced`: unsuccessful provider state; retry policy and provider semantics apply.
- `dead_letter`: retry policy exhausted/terminal operational state; requires authorized operator review.

The current gateway allows bounded retry scheduling and the retry cron reads stored message metadata for ordinary messages. For secret-bearing verification/reset events, body persistence is intentionally disabled by this pass. Generic body replay is therefore not available for these events; recovery uses the existing token-rotation resend/reset workflow. That workflow must be verified with a provider failure test before release.

## Webhooks

- Brevo: `POST /brevo/events`, protected by the configured shared webhook token; event mapping recognizes request/sent, delivered, opened/click, bounce, invalid/blocked/spam/error/unsubscribed and deferred states. Provider message ID is used to match the delivery record; provider event ID is hashed.
- Twilio: status callback validates Twilio signature against the reconstructed callback URL or the explicitly configured shared secret.
- Africa's Talking: status callback uses the configured webhook secret.
- Generic status callback: requires the configured shared webhook secret.

Required staging tests: missing/wrong signature, unknown event, duplicate event ID, unknown provider message ID, legal/illegal state transition, provider retry and retry exhaustion. No webhook was invoked in this pass.

## Admin and audit visibility

Admin views should expose event ID, channel, recipient masked where appropriate, status, template code, provider message reference, retry count, safe error summary, timestamps and correlation/source IDs. They must not expose raw tokens, password-reset URLs, full rendered token-bearing bodies, bearer/session secrets or unnecessary personal documents. Business decisions (seller approval, listing moderation, entitlement grant/revoke) belong in the existing business/audit trail, separate from transport-delivery status.

## Required pre-release checks

- Confirm `dealer.submitted` controls exist for the intended channel(s) in staging and are enabled only by an authorized admin.
- Confirm Brevo API key/sender presence in the secret manager; never print secret values.
- Prove provider acceptance and a delivered webhook using one approved test recipient.
- Prove resend works after provider rejection without persisting or replaying the failed token-bearing body.
- Prove duplicate event jobs do not send duplicates and retry exhaustion reaches the operational dead-letter view.
- Verify private seller and dealer approval events show the correct seller type and authorized recipients.
