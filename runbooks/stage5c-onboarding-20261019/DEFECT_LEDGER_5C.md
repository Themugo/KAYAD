# Stage 5C defect ledger (2026-10-19)

Tier key: **M** mocked · **R** real local stack · **P** disposable PostgreSQL · **H** hosted · **L** live provider. Every fix below is evidenced at R+P unless stated. Nothing was verified at H or L.

## Fixed in this stage

| ID | Area | Defect | Fix | Evidence |
|---|---|---|---|---|
| D5C-01 | Throttling | Rate limiter and account lockout keyed on a raw/forwarded address string inconsistently; one client could exhaust or dodge a bucket | `clientIp(req)` shared by `rateLimiter.js` and `accountLockout.js`; `authLimiter` skips csrf/profile/sessions/phone-status/refresh | `stage5c/ipKeyingAndThrottling.test.js` |
| D5C-02 | Login | Login select omitted `loginAttempts` / `lockUntil`; lock never reset after success or password reset | select extended, reset on success, `resetPassword` clears lock | role_api_a |
| D5C-03 | Profile | `updateProfile` silently dropped unsupported fields (incl. `onboardingComplete`) and answered success | 400 `PROFILE_FIELD_NOT_SUPPORTED` | role_api_a/b, `securityCertification.test.js` |
| D5C-04 | Dealer | Settlement / profile queries used camelCase columns that do not exist | rewritten to real snake_case columns | role_api_b |
| D5C-05 | Dealer dashboard | `/cars /earnings /analytics /summary /quick-stats /team` used non-existent columns and swallowed the PostgREST error, returning empty "success" | real columns, `must()` surfaces errors, earnings from `payments.dealer_amount` on the dealer's own cars, unread from `conversations.seller_unread_count`, team join via `dealer_teams_member_fkey` | role_api_b, `dealerDashboardSchemaContract.test.js`, browser UD.8b |
| D5C-06 | Dealer | `/trade-listings` and `PATCH /cars/:id/wholesale` referenced a `cars.wholesale` column that does not exist | explicit 503 `TRADE_LISTINGS_UNAVAILABLE` (a 501 tripped the repo "no 501 placeholders" gate) | contract test |
| D5C-07 | Inspector | Inspector applications reviewable by any `adminOnly` role, which includes `ghost_checker` (an inspector could approve inspectors) | `reviewerOnly = admin, superadmin, hr, technical_support` on the application routes | role_api_c, `inspectorApprovalHardening.test.js` |
| D5C-08 | Inspector | Approval promoted an existing *unverified* buyer row (address squatter) and set `emailVerified=true` without mailbox proof | 409 `INSPECTOR_EMAIL_UNVERIFIED`; existing-user branch no longer sets `emailVerified` | role_api_c |
| D5C-09 | Inspector | Set-password token was written into the in-app notification, socket payload and notification table | token only in a gateway email; notification has no token | role_api_c, onboardingFlow test |
| D5C-10 | Inspector | No worklist endpoint for assigned inspections; dashboard card had no source | `GET /api/inspections/assigned` (caller's own), `inspectionAPI.myAssigned`, DashboardHub count | role_api_c, browser UI.7 |
| D5C-11 | Inspector | Assign / start / submit left no audit trail; score unbounded | `inspection_assigned/started/submitted` audit rows; `overallScore` 0..100 | role_api_c |
| D5C-12 | Audit | `security_logs` absent => security events lost silently | fall back to `audit_logs` (`store: audit_logs_fallback`) | `securityLoggerFallback.test.js`, role_api_a |
| D5C-13 | OTP | Default event type suppressed by rollout control; send reported success though nothing was sent | namespaced `account.phone_verification`; null/failed/dead_letter => challenge `delivery_failed`, 503 `OTP_DELIVERY_UNAVAILABLE` | `otpService.test.js`, role_api_e |
| D5C-14 | OTP | OTP code persisted in the communication ledger body | category `otp` is secret-bearing; body omitted | `ledgerRedactionAndCircuit.test.js`, role_api_e |
| D5C-15 | OTP | UI/API/service disagreed on length (4 vs 6) | 6 digits everywhere, UI `maxLength=6` | role_api_e, otpService test |
| D5C-16 | OTP | Resend left earlier challenges usable | after successful delivery earlier pending challenges become `expired` | otpService test, role_api_e |
| D5C-17 | Resilience | One circuit breaker shared by every provider call (email outage blocked SMS) | key = `opts.key \|\| serviceName \|\| fn.name` | ledgerRedaction/circuit test |
| D5C-18 | OTP | OTP limiter keyed on IP only | keyed per user when authenticated, `OTP_RATE_LIMIT_MAX` (default 6/min), 429 `OTP_RATE_LIMITED` | role_api_e |
| D5C-19 | Dealer | Dealer phone regex rejected valid Kenyan mobiles | `^(?:\+?254\|0)?7\d{8}$`; `OTP_DELIVERY_UNAVAILABLE` => 503 | role_api_b |
| D5C-20 | Billing | `kayad_activate_dealer_subscription_atomic` failed on PostgreSQL (`ON CONFLICT` without the partial-index predicate) | **candidate migration** `20261019200000_…` (not executed anywhere hosted) | role_api_b; rollback rehearsal in `PREFLIGHT_REHEARSAL_ROLLBACK_5C.md` |
| D5C-21 | Tests | Four existing tests asserted the superseded behaviours of D5C-03/08/09 | updated to the new contract (105/105 in the three suites) | full regression |

## Open / not fixed (carried to the blocker report)

| ID | Item | Why not fixed |
|---|---|---|
| O5C-01 | `STAFF_ROLES` contains `ghost_checker`, so ~236 `adminOnly` routes still admit inspectors | systemic; needs a route-by-route review and owner decision (D5C-A). Only the application routes were narrowed |
| O5C-02 | Dealer team invite returns the raw `inviteToken` in the API response, sends no email; table holds `invite_token_hash` | new feature, out of scope |
| O5C-03 | `api.exports.ts` has dead `requestPhoneOTP/verifyPhoneOTP` sending `{code}`; server reads `{otp}` | unused by the SPA; remove in a cleanup |
| O5C-04 | `cars.wholesale` absent on the schema; trade listings return 503 | needs a schema decision |
| O5C-05 | Failed SMS sends still count against the per-recipient quota | design choice, documented |
| O5C-06 | `users.status='suspended'` is not enforced at login; real blockers are `is_banned`, `deactivated_at`, dealer suspension | needs an owner decision |
| O5C-07 | Reject with no reason is accepted with a generic notice | design choice |
| O5C-08 | `business_name` stored on both `users` and `dealers` | data-model cleanup |
| O5C-09 | `security_logs` presence on the hosted DB unknown (fallback covers absence) | hosted read required |
| O5C-10 | `communication_event_controls` rows for the 5B/5C events must exist on hosted, otherwise the gateway fails closed and sends nothing | hosted prerequisite |
| O5C-11 | Admin limiter (200 / window) is per source address; a shared office address can trip it while using the Owners tab (observed during browser runs from a single address; test env raised to 5000) | consider keying by user |
| O5C-12 | Inspector account created at approval carries `emailVerified=true`; mailbox proof is redeeming the emailed set-password link (account cannot sign in until then) | design note; acceptable |
