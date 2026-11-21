# Stage 5D — Brevo / SMS provider verification (Gate 5)

Four distinct levels are never merged: **stub** (local interception) · **real API acceptance** (provider returned 2xx) · **confirmed delivery** (provider event/receipt) · **authorized-recipient inbox/handset receipt**.

| Check | Result | Evidence / missing prerequisite |
|---|---|---|
| Brevo config presence (names only; values never printed) | **BLOCKED** | Variables the code reads: `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `BREVO_REPLY_TO`, `EMAIL_FROM`, `BREVO_WEBHOOK_TOKEN`. None present in this workspace. Deployed environment not observable. |
| Africa's Talking config | **BLOCKED** | `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`: not present. |
| Network reachability | **BLOCKED** | `api.brevo.com` returns HTTP 000 from this sandbox (egress allowlist). A real send is impossible from here even with a key. |
| Stub level | PASS (R) | Request shape, single-use links, provider-failure handling (`delivery_failed` + truthful 503, no false "delivered"), redaction, OTP lifecycle — see `BREVO_OTP_EVIDENCE_MATRIX_5C.md`; re-run in 5D: role_api_a/d pass. |
| Real API acceptance | **NOT RUN** | needs A4 below |
| Confirmed delivery (webhook) | **NOT RUN** | needs live key, public webhook URL, `BREVO_WEBHOOK_TOKEN` |
| Authorized-recipient inbox receipt | **NOT RUN** | needs a mailbox the owner controls and written authorization |
| Sender/domain prerequisites (verified sender, SPF/DKIM/DMARC) | **UNKNOWN** | owner confirms in Brevo console |
| SMS real send / DLR | **NOT RUN** | needs AT production creds, sender ID registration, handset |
| Template/event routing | PARTIAL (H) | Hosted `communication_event_controls`: email enabled for verification, reset, registration.completed, dealer.*, security.alert, support.*; SMS enabled for `account.phone_verification`, `security.alert`; `owner.invitation`/`owner.security_notice` rows absent until 5B migration (O5C-10) |
| Retry / rate limit | PASS (R) | gateway retry state and `OTP_RATE_LIMIT_MAX` limiter exercised locally |

No live delivery is claimed anywhere in Stage 5D.
