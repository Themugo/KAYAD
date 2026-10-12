# KAYAD — Email / Onboarding Communication Audit & Go-Live Readiness (2026-10-12)

Status vocabulary: PASS, PARTIAL, GAP, BLOCKED, UNVERIFIED, NOT RUN, NEEDS AUTHORIZATION. No real email was sent; no production write was made. Production was queried read-only (SELECT on communication control tables only).

## 1. Workflow map
Register -> `deliver()` (gateway: preference + rollout gate + idempotency + ledger `communication_deliveries` + retry/dead-letter) -> `sendRawEmail` -> Brevo REST. Verify: SPA `/verify-email?token=` -> `GET /api/v1/auth/verify-email/:token`. Resend: `POST /resend-verification` (generic response). Reset: `POST /forgot-password` -> SPA `/reset-password?token=` -> `POST /reset-password`. Dealer: `dealer.submitted`/`dealer.verified` events. Team invite: direct `sendTeamInviteEmail` (not via gateway).

## 2. Findings
| ID | Sev | Finding | Status |
|---|---|---|---|
| EM-1 | High | Dynamic text (names, car titles, dealer name, sender name, saved-search name, role) was interpolated into HTML emails unescaped, and tokens/ids were not URL-encoded -> HTML/link injection in mail sent from the KAYAD domain (cross-user: new-message sender, team-invite dealer name, saved-search name). | FIXED + tested |
| EM-2 | Med | Registration/resend/reset emails were bare unbranded `<p>` markup with unescaped name; no plain-link fallback, no footer. | FIXED (branded builders `buildVerificationEmail/WelcomeEmail/PasswordResetEmail`, escaped, with copy-paste link fallback; controller falls back to minimal escaped body if a template ever throws, so registration can never fail on templating) |
| EM-3 | Low | Welcome template said "Reply to this email" while sender is noreply and no replyTo set. | FIXED (wording; optional `BREVO_REPLY_TO` env sets Brevo replyTo) |
| EM-4 | Med | Team-invite email links to `/dealer/setup?invite=...`; no such frontend route/handler exists in `src` (grep: no match). Invitees land on a dead page. | GAP (needs product decision/UI; not changed) |
| EM-5 | Med | Team invite is sent via `sendRawEmail` with `.catch(()=>{})`: bypasses gateway ledger, rollout flag, retry; failures invisible. | GAP |
| EM-6 | Info | Registration returns 409 for an existing email (enumeration) while resend/forgot are generic. Product trade-off. | DOCUMENTED |
| EM-7 | Info | Email gate fails closed if no `communication_event_controls` row is enabled for the event. | VERIFIED OK in production (below) |
| EM-8 | Med | Sender-domain authentication (SPF/DKIM/DMARC for kayad.space / Brevo) could not be checked: sandbox DNS returns ENOTFOUND for all names (sandbox limitation, not evidence). | UNVERIFIED — see checklist |
| EM-9 | Med | Real Brevo delivery, bounce webhook round-trip, inbox placement. | NOT RUN (needs real key/sends; not authorized here) |

## 3. Production control plane (read-only SELECT)
communication_channel_controls: email=true, sms=true, whatsapp=false. Email event controls enabled=true: `registration.completed`, `account.email_verification`, `account.password_reset`, `dealer.submitted`, `dealer.verified`, `dealer.subscription_activated`, `security.alert`, `support.case_created/updated`. Disabled (by design or not yet enabled): all auction.*, escrow.*, payment.*, inspection.*, dispute.*, saved_search_match, support.contact_form, system.reminder, admin.action, dealer.subscription_expiring/expired. Decide if any of those should be on for tomorrow.

## 4. Tests run (all capture-only; global fetch mocked)
New `backend/tests/regression/onboardingEmailWorkflow.test.js` (6): escaping, link integrity (button + fallback + plain text), token encoding, Brevo request shape (sender, recipient, replyTo, api-key header, endpoint), provider rejection returns success:false without throwing, missing key reported disabled. Existing registration/login suites (securityCertification, loginTimingEnumeration) pass against the changed controller. Full backend `npm test`: Jest 88 suites / 1,257 passed; Vitest 5 files / 16 passed; node:test pass.
Not run: frontend suite after this change (frontend untouched); live Brevo.

## 5. Go-live checklist for tomorrow (operator actions)
1. Hosting env (backend): `BREVO_API_KEY`, `BREVO_FROM_EMAIL` (BOTH required by gateway), `FRONTEND_URL` = exact public origin (links are built from it; default is https://www.kayad.space), optional `BREVO_FROM_NAME`, `BREVO_REPLY_TO`, `BREVO_WEBHOOK_TOKEN`, `COMMUNICATION_WEBHOOK_SECRET`. Note: if `BREVO_API_KEY` is set and `REQUIRE_EMAIL_VERIFICATION` is unset, login REQUIRES verification — so a broken mail path locks out new users. Consider setting `REQUIRE_EMAIL_VERIFICATION=false` for day one if you cannot confirm delivery first.
2. In Brevo: verify sender address/domain; authenticate the domain (DKIM, SPF include, DMARC record). Check from Windows: `nslookup -type=TXT kayad.space` and `nslookup -type=TXT _dmarc.kayad.space` and the DKIM CNAME/TXT names Brevo shows for your account.
3. Brevo webhook -> `https://<api>/api/v1/...communication webhook` with the token header (fail-closed if unset).
4. Smoke test with YOUR OWN mailbox before announcing: register -> receive verify mail -> click -> login; resend; forgot/reset; check spam folder and the "copy link" fallback.
5. Watch `communication_deliveries` for `failed`/`dead_letter` rows during onboarding.
6. Do NOT hand out team invites until EM-4 is resolved.

## 6. Verdict
Code path: READY (PASS under mocked provider). Go-live: CONDITIONAL — blocked on operator items 1-4 (env, sender-domain auth, own-mailbox smoke test) which cannot be verified from this environment.
