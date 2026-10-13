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

---
# Continuation 3 — Communications Launch Audit (2026-10-13)

Foundation: uploaded `KAYAD-main_1.zip` (SHA-256 `1e6ab9e326f97cf60b41f01cce90be0e3f9517f20b5551de7348759a025a6b27`) compared with the working tree: identical except `.github/workflows/security.yml`, where the ZIP (actual main) is newer (adds `GITHUB_TOKEN` env) — the ZIP's version was adopted. No git history is available in the ZIP/scratch, so commits `4a97e59f`/`d7c85a5b` could not be located by hash (**UNVERIFIED**); the content equals merged main `1cc0e31b` + this work.

## C-1. Canonical Brevo transport (determined from code)
**Transactional email REST API** (`POST https://api.brevo.com/v3/smtp/email`, `api-key` header) via `services/emailProvider.service.js`. No `nodemailer`/SMTP/`@getbrevo` dependency exists (grep of both package.json). Single adapter; `workers/emailWorker.js` and the gateway both call `sendRawEmail`. **Decision: keep the API transport; do not configure SMTP.** Credential: a Brevo **v3 API key** (`xkeysib-…`) in `BREVO_API_KEY`. An SMTP key (`xsmtpsib-…`) will NOT work for this adapter. The SMTP setup wizard in the Brevo dashboard is irrelevant to this code.

## C-2. Root cause of the missing registration email — CONFIRMED (read-only production evidence)
| Hop | Evidence | Result |
|---|---|---|
| Registration persisted | production `users`: 2 rows, 0 verified, last created 2026-09-30 | account created |
| Control-plane gate | `communication_channel_controls.email=true`; `account.email_verification`, `registration.completed`, `account.password_reset` enabled | PASS |
| Delivery ledger | `communication_deliveries`: **0 rows ever** | stops here |
| Why | hosted table has NO `idempotency_key` column (column list queried); `schema_migrations` newest = `20260922…`, so migrations `20260930111500` and `20260930113000` were never applied | `deliver()` runs `findOne(… idempotencyKey …)` first -> PostgREST error -> throws before `sendRawEmail`; caller swallowed it with `console.warn` |
| Brevo | never contacted -> zero transactional logs | explains the empty dashboard |
Reproduced on a local PG16 table built from the hosted column list: INSERT with `idempotency_key` -> `column does not exist`; `status='dead_letter'` -> CHECK violation. After applying the two repo migrations: both succeed, duplicate key -> 23505 (the path `deliver()` already handles), re-run is a no-op. Email-ledger fix = `runbooks/COMMS_STEP2_APPLY_NEEDS_AUTHORIZATION.sql` (**NEEDS AUTHORIZATION — not applied**). **Superseded caveat (see C-10): this is necessary but NOT sufficient if the deployed backend is current main.**
Not established: whether `BREVO_API_KEY`/`BREVO_FROM_EMAIL` are set on the deployed backend, and whether the deployed build is current (**UNVERIFIED**; no hosting access). After the SQL fix `GET /health` -> `checks.communications` shows readiness and `checks.brevo` shows configuration.
Why users must not be left stuck: the 2 existing accounts can use "resend verification" once the SQL is applied (generic response, rate-limited, replaces old token).

## C-3. Code changes this session (smallest safe)
| File | Change |
|---|---|
| `backend/services/communicationReadiness.service.js` (new) | probes required ledger columns; returns ready / schema_mismatch / unknown; no error text leaked; 60s cache |
| `backend/routes/healthRoutes.js` | `/health` adds `checks.communications`; schema_mismatch -> status `degraded` |
| `backend/controllers/authController.js` | verification, welcome, resend and reset dispatch failures now `logError` (structured, Sentry-visible) with userId+event, instead of `console.warn` |
| `backend/services/communicationGateway.service.js` | default email body `<p>${message}</p>` now HTML-escaped |
| `src/pages/admin/AdminSettings.jsx` | default support email `support@kayad.co.ke` -> `support@kayad.space` (do not pre-migrate to the future domain) |
| `backend/tests/regression/communicationsLaunchReadiness.test.js` (new, 4, mock-based) | readiness states + migration content |
Earlier this engagement (merged): escaped/branded onboarding templates, URL-encoded tokens, `BREVO_REPLY_TO`.

## C-4. Test evidence (commands run in repo; mock-based unless stated)
- Backend `npm test`: Jest 89 suites / 1,261 passed; Vitest 5 files / 16; node:test pass — `evidence/test_logs/comms_backend_npm_test.txt`
- Frontend `npm run lint` (tsc) exit 0; `npx vitest run` 81 files / 643 passed, 1 skipped; `npm run build` exit 0 — `evidence/test_logs/comms_*.txt`
- Validators (backend-boot, dependency-security, deployment-readiness, deployment-runtime-drift, phase39-deployment-security, phase39, phase7-security-release) all exit 0; `npm audit --omit=dev` 0 vulnerabilities (root + backend).
- Local PG16 reproduction of the root cause (before/after) — transcript summarised in C-2.
- **NOT RUN:** any live Brevo call, Brevo event inspection, mailbox receipt, real link click (no credentials/authorization). Live certification = BLOCKED until the operator steps below.

## C-5. Configuration inventory (names read by code)
Mandatory email: `BREVO_API_KEY` (v3 API key), `BREVO_FROM_EMAIL` (must be a Brevo-validated sender), `FRONTEND_URL` (exact public origin; link base; code default `https://www.kayad.space`), `BACKEND_URL`. Optional: `BREVO_FROM_NAME`, `BREVO_REPLY_TO`, `BREVO_WEBHOOK_TOKEN` (webhook fail-closed without it), `COMMUNICATION_WEBHOOK_SECRET`, `REQUIRE_EMAIL_VERIFICATION` (default: required iff `BREVO_API_KEY` set). Optional channels: `AT_API_KEY`+`AT_USERNAME` (SMS), `TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_NUMBER`.
Deployment alignment: `render.yaml`/`render-staging.yaml` set `BREVO_FROM_EMAIL=noreply@kayad.space`; `k8s/backend/configmap.yaml` sets `no-reply@kayad.space` — **inconsistent spelling**; the value must equal the sender verified in Brevo or Brevo rejects every send. Operator must choose ONE (brief asks `no-reply@kayad.space`) and make render.yaml, the Render dashboard value and Brevo's verified sender match. Which platform serves production (Render vs Kubernetes) is **UNVERIFIED** — repo contains both; k8s/helm do not appear to be the live path (Vercel + Render files are the active deploy files), but confirm. Optional SMS/WhatsApp are gated by `providerConfigured` and skipped (logged) when unset — they cannot block email (verified in code `sendUserCommunication`).

## C-6. Channel / area findings
| Area | Finding | Status |
|---|---|---|
| Support inbox | No monitored mailbox can be verified; `support@/dealers@/business@/marketing@kayad.space` existence UNVERIFIED. Outbound sender is noreply-style; replies need `BREVO_REPLY_TO` -> a real inbox | BLOCKED (operator) |
| Webhooks | Brevo token (Bearer or header) fail-closed; shared-secret/Twilio-signature paths fail-closed; status machine monotonic; dedup via hashed provider event id. Note: if Brevo omits event `id` the code uses message-id as event id so later events (e.g. delivered after request) would be treated as duplicates | PARTIAL |
| Bounces / suppression | bounces update delivery status only; **no suppression list**, no automatic stop on hard-bounce | GAP |
| Marketing | No campaign/broadcast sender exists. Only saved-search alerts use `category=marketing`; default opt-in required (no prefs row => blocked), event control `marketplace.saved_search_match` is OFF in production. **No unsubscribe endpoint, no suppression list, alert footer links to /settings only** | BLOCKED for any promotional send |
| Dealer comms | `dealer.verified` email+in-app emitted on admin approval (works once ledger fixed). `dealer.submitted` is enabled in production but **never emitted** (no "application received" email). **No rejection / missing-information email** exists. Team invite bypasses gateway (no ledger/retry), and `/dealer/setup` page is missing | GAP |
| Admin control | Channel/event rollout controls exist in DB (`communication_*_controls`, templates, preferences). Sender/reply-to are env-only (not admin-editable) — correct for secrets; audit history of control changes not verified | PARTIAL |
| Account enumeration | resend/forgot generic; register returns 409 for existing email | DOCUMENTED |
| Tokens | 32-byte random, sha256 at rest, 24h/1h expiry, atomic one-time consumption, tokenVersion bump on reset | PASS (code + tests) |
| SMS / WhatsApp | webhook auth fail-closed; provider skip when unconfigured; production: sms control=true, whatsapp=false; no live test | PARTIAL / NOT RUN |

## C-7. Operator steps (exact, in order)
1. **Determine the deployed backend build first** (Render -> service -> Deploys: commit SHA; and `buildId` from the health payload), then follow the staged plan in C-10. Do not run STEP 2 before reading C-10.
2. **Brevo:** Senders, Domains & Dedicated IPs -> add/verify the sender you will use (`no-reply@kayad.space`); Authenticate `kayad.space` (Brevo shows DKIM + a `brevo-code` TXT + DMARC suggestion). Create/confirm a **v3 API key** (SMTP & API -> API keys). Do not use the SMTP key.
3. **DNS (kayad.space) — do not overwrite anything:** add only the records Brevo displays. Keep ONE SPF TXT record (merge `include:spf.brevo.com` into the existing SPF if one exists; never create a second `v=spf1`). Add DKIM exactly as shown. Add `_dmarc` TXT starting with `v=DMARC1; p=none; rua=mailto:<monitored address>` and tighten later. Do not touch MX unless you are adding a mailbox host. Check with `nslookup -type=TXT kayad.space`, `nslookup -type=TXT _dmarc.kayad.space`, and the DKIM names Brevo lists. (Sandbox DNS is blocked — DNS status is **UNVERIFIED**.)
4. **Mailbox host:** create a real mailbox or forwarding alias for `support@kayad.space` (and `dealers@`) pointing to a monitored inbox; then set `BREVO_REPLY_TO=support@kayad.space`.
5. **Render (backend service) env:** `BREVO_API_KEY`, `BREVO_FROM_EMAIL` (identical to the verified sender), `BREVO_FROM_NAME=KAYAD`, `FRONTEND_URL=https://www.kayad.space` (or the exact live origin), `BACKEND_URL`, `BREVO_WEBHOOK_TOKEN`, `COMMUNICATION_WEBHOOK_SECRET`, `BREVO_REPLY_TO`. Deploy latest main. Confirm `/health` shows `checks.brevo.status=env_present` (env only — not a key validity check) and `checks.communications.schema=schema_ready`.
6. **Brevo webhook:** add `https://<api-host>/api/communications/webhooks/brevo/events` (mount confirmed in `server.js:835` + route `/brevo/events`) with header `Authorization: Bearer <BREVO_WEBHOOK_TOKEN>`.
7. **Live certification with your own mailbox:** register a fresh account; check Brevo -> Transactional -> Logs; check inbox/spam; click link; verify; sign in; resend; forgot/reset. Record Brevo acceptance, delivery event, mailbox receipt, and link success separately. The 2 existing unverified accounts: use "resend verification".

## C-8. Launch verdicts
| Channel | Verdict |
|---|---|
| Transactional email (registration, verify, resend, reset) | **BLOCKED** on (a) deployed-build identification + staged production schema plan (C-10), (b) Brevo sender/key/env; code path PASS under mocks |
| Support inbox | **BLOCKED** (mailbox/forwarding not verifiable) |
| Dealer communications | **PARTIAL** (approval email wired; submitted/rejected/missing-info/team-invite gaps) |
| Marketing | **BLOCKED** (no unsubscribe/suppression; none should be sent) |
| SMS / WhatsApp | **PARTIAL / NOT RUN** — optional, must not block launch |
| Domain authentication (SPF/DKIM/DMARC) | **UNVERIFIED** |
| Live end-to-end certification | **BLOCKED** (needs steps 1-5) |

## C-9. Rollback and future `kayad.co.ke` migration
Rollback: SQL step is additive (drop the index/column only if needed; harmless to leave); code changes revert by redeploying the previous Render deploy; setting `REQUIRE_EMAIL_VERIFICATION=false` temporarily removes the login gate if email stalls (re-enable after verification works). Migration to `kayad.co.ke`: (1) control the domain and create mailboxes; (2) authenticate it in Brevo (DKIM/SPF/DMARC) alongside kayad.space; (3) add as a second verified sender; (4) warm up with low-volume transactional only; (5) change `BREVO_FROM_EMAIL`, `BREVO_REPLY_TO`, `FRONTEND_URL` together once the frontend is live on the new origin (links are built from `FRONTEND_URL`); (6) keep kayad.space redirects and sending authorized for at least 30 days so in-flight verification/reset links still resolve; (7) update CORS and cookie domains. Do not change links before the new origin is deployed.


---
# C-10. Final migration safety review (2026-10-13) — read-only against production; NOTHING applied

## C-10.1 Source migrations (exact) and line-by-line comparison
| Change | Source file | SHA-256 |
|---|---|---|
| `idempotency_key` column + 3 indexes | `supabase/migrations/20260930111500_advanced_communication_idempotency.sql` | `2e224b43360fe98d62d1055bc3c6d74affd7600520b40c2b6b45cf74eefa1aef` |
| `dead_letter` status | `supabase/migrations/20260930113000_communication_state_machine_hardening.sql` | `633c3758f8d30ed4f9de223ad3c510710f9e1aa0766dbbcccc66a05774aa6368` |
`runbooks/COMMS_STEP2_APPLY_NEEDS_AUTHORIZATION.sql` contains the same 6 DDL statements, in the same order, identical after whitespace/comment normalisation (script check, plus Jest test `communicationsLaunchReadiness` which fails if they ever diverge). Preserved: column `text`, nullable, no default; `uq_communication_delivery_idempotency` UNIQUE (provider, channel, idempotency_key) WHERE idempotency_key IS NOT NULL; `uq_communication_delivery_provider_event` UNIQUE (provider, provider_event_id) WHERE provider_event_id IS NOT NULL; `idx_communication_delivery_source_event` partial btree; status CHECK = 8 values incl. `dead_letter`, same constraint name. Added by the runbook only (not in migrations): BEGIN/COMMIT, `SET LOCAL lock_timeout='5s'`, `statement_timeout='30s'`, and a guard that aborts if duplicate (provider, provider_event_id) rows exist.
Note: the earlier `COMMS_PRODUCTION_SCHEMA_FIX_NEEDS_AUTHORIZATION.sql` is **replaced** by STEP1-4 (it lacked a transaction, timeouts, guard and rollback).

## C-10.2 Dependencies — the two changes are NOT the only missing ones
Production state (read-only): newest applied migration `20260922060457`; Postgres 17.6. Repo has 61 migrations after 20260922. Onboarding-relevant ones and what current-main code needs:
| Missing in production | Needed by (code evidence) | Migration |
|---|---|---|
| `communication_deliveries.idempotency_key`, `dead_letter` | `communicationGateway.deliver` | 20260930111500, 20260930113000 |
| function `kayad_register_identity_atomic` (+ `sync_dealer_profile_from_user`, dealer columns, trigger) | `authController.register` (rpc call) | 20261001090000 (+ 20261001220000 re-states grants on that function and FAILS if the function is absent) |
| `refresh_tokens.token_hash`, `family_id`…, function `kayad_rotate_refresh_token`; DROPS plaintext `token` column | `models/RefreshToken.js` (every login/refresh) | 20260930110000 (destructive but `refresh_tokens` has 0 rows today) |
| `users.deactivated_at`, `granted_permissions`, `revoked_permissions`, `last_active` | `middleware/auth.js protect()` on EVERY authenticated request | 20261011090000 |
| unique index `uq_users_email_normalized` | DB-level email uniqueness (2 users, no duplicates, so safe) | 20260930112000 |
| RLS/grant re-statements for comms/ledger | defence in depth | 20261001220000, 20261002120000 |
Consequence: **if the deployed backend is current main, sign-in and registration already fail against this database independently of email.** If the deployed backend is an older build, it may not call these objects. Which is true is **UNVERIFIED** (no hosting access). Evidence consistent with an older/mid build: the 2 users were created 2026-09-30 (before the registration RPC existed) and `communication_deliveries` has 0 rows (a build that calls `deliver()` with an idempotency key).
Not claimed: that the six migrations above are a *sufficient* set for the full journey (dealer onboarding R12/R14 columns, other tables). Sufficiency can only be proven on staging (none exists — see C-10.7). R12/R14 remain NOT to be applied without separate authorization.
Other facts: 2 existing users are both `dealer`, `pending`, unverified, with no `dealers` row; 20261001090000 would create their `dealers` rows. Their stored verification tokens were written by an older build; verification hashes the presented token, so they must use "resend verification".

## C-10.3 Rerun / partial-execution safety — tested on local PG16 (hosted is PG17.6: version difference is a stated limitation)
Local table rebuilt from the hosted column list, defaults, constraints, indexes, RLS, policy and grants. Results:
- Forced error before COMMIT -> nothing persisted (24 cols, 6 indexes, old constraint).
- Real apply -> STEP 3 13/13 PASS. Rerun -> only NOTICEs, rows preserved, 13/13 PASS.
- Piecemeal pre-state A (constraint dropped only) and B (column + one index only) -> STEP 2 completes, 13/13 PASS.
- Pre-existing same-named index with wrong definition: `IF NOT EXISTS` silently skips it — preflight check 8 flags REVIEW and STEP 3 catches it (FAIL on that index). Resolve before applying.
- Duplicate (provider, provider_event_id) rows -> guard aborts, no change. Existing `dead_letter`/idempotency data preserved on rerun.
- Concurrent session holding the table lock -> STEP 2 fails in 5s ("lock timeout"), no hang, no partial state.
- Rollback script -> dead_letter rows converted to failed, old constraint restored, column and indexes dropped, 24 columns.
Production rows that could block the migration (read-only): **none** — 0 rows in `communication_deliveries`, 0 status violations, 0 duplicate provider events, no same-named indexes, no triggers or dependent views, no active sessions touching the table.

## C-10.4 Transactions, locks, rollback, backup
- STEP 2 is one transaction (`BEGIN … COMMIT`): atomic; a failure leaves the schema unchanged. Run it as a single execution (paste whole file).
- Locks: `ADD COLUMN` nullable/no default = catalog-only; `ADD CONSTRAINT CHECK` and non-concurrent `CREATE INDEX` take ACCESS EXCLUSIVE / SHARE locks and scan the table — table is 56 kB / 0 rows, so milliseconds. `lock_timeout=5s` prevents queuing behind other sessions; email sends during the window would error and are retried by the ledger/resend flow.
- Rollback after COMMIT: STEP 4. Limits: dropping the column discards stored idempotency keys; `dead_letter` rows become `failed`; it does not touch other tables.
- Backup: data at risk is nil (0 rows), but take a restorable point first: Supabase Dashboard -> Database -> Backups (availability of daily backups / point-in-time recovery depends on your plan — **UNVERIFIED**), and save the STEP 1 output as the schema snapshot. A `pg_dump --schema-only -t public.communication_deliveries` needs your DB connection string; I did not and will not handle it.

## C-10.5 Application compatibility and deployment ordering
- Current main + AFTER STEP 2: compatible for the ledger. Old build + AFTER STEP 2: compatible (additive nullable column; widened CHECK; new unique indexes only reject duplicate keys/provider events).
- Current main + BEFORE STEP 2: every `deliver()` fails (the incident).
- Current main against today's production DB: also fails on login/auth middleware/registration (C-10.2) -> do NOT deploy current main until the dependent migrations are applied.
## C-10.6 Health check semantics (code changed this session)
`GET /health` -> `checks.communications` now reports four independent layers and never the word "ready":
`schema` (`schema_ready` | `schema_mismatch` | `unknown`) — structural only; `providerConfig` (`env_present` | `not_configured`) — variables exist, key/sender NOT validated against Brevo; `providerAcceptance` (`observed` | `none_observed` | `unknown`) — a ledger row with status sent/delivered/read exists, i.e. Brevo returned 2xx at some point; `mailboxDelivery` (`observed` | `none_observed` | `unknown`) — a Brevo `delivered`/`read` webhook was recorded. None of these proves a particular user's email arrived; only the own-mailbox test does. `checks.brevo.status` was renamed `configured` -> `env_present` for the same reason. Tests: 8 in `communicationsLaunchReadiness` (mock-based).
## C-10.7 Staging
No staging database exists: the Supabase organisation has only the production project (KAYAD EA) and an unrelated inactive project. Creating a branch/project is a billable write that was not authorized. Proof is therefore local PG16 only; PG17-specific behaviour and the real hosted extensions/roles are not exercised. **Do not treat C-10.3 as staging proof.**

## C-10.8 Safe execution order
1. Identify the deployed backend commit (Render deploy list / `buildId`). Record it.
2. Take a backup point; run STEP 1 (read-only) and keep the output. Stop on any BLOCKER/REVIEW in rows 1-14.
3. Choose ONE path:
   - **Path A (deployed build is older than 20260930):** run STEP 2 -> STEP 3 (all PASS) -> own-mailbox registration test. Do not deploy current main.
   - **Path B (deployed build is current main, or you want to move to it):** get written authorization for the dependent migration set in C-10.2 (ideally proven on a Supabase branch/staging first), apply in filename order, run STEP 3 and re-run STEP 1 rows 20-24 (all OK), THEN deploy/keep current main.
4. Set Brevo env (key, validated sender, FRONTEND_URL, webhook token); check `/health`: `schema_ready`, `env_present`.
5. Own-mailbox end-to-end test; confirm Brevo transactional log, mailbox receipt, link click, verified state; then `providerAcceptance`/`mailboxDelivery` should read `observed`.
6. Existing 2 users: "resend verification".
Rollback: STEP 4 for the schema; Render "rollback to previous deploy" for code.
