# Stage 5 security and privacy audit (Workstream F)

Method: repository audit + tests (mocked tier) + disposable PostgreSQL. No live system was probed. "Fixed" = code change with a test; "Documented" = left for a decision.

| ID | Area | Finding | Status |
|---|---|---|---|
| F1 | Privilege escalation via registration | Role limited to `user/individual_seller/dealer` by the DB function; client `status/approved/emailVerified/isVerifiedDealer` ignored (tested at controller and at the DB function with `admin/superadmin/webhoist/ghost_checker`) | Verified |
| F2 | Email verification granting power | Verification sets `email_verified` only; role and `users.status` unchanged (tested) | Verified |
| F3 | Seller features without verified email | Previously enforced only if the email provider was configured | **Fixed** (`dealerOnly`, always on, strict boolean) |
| F4 | Token replay/expiry/malformed | Single-use atomic consume; replay, expired, malformed and 3-way concurrent use tested | Verified |
| F5 | Token leakage to logs | Raw token in `GET /auth/verify-email/:token` path was logged by request serializers and morgan | **Fixed** (`utils/redactUrl.js`, tests) |
| F6 | Open redirect / email injection | Verification and reset URLs are built from `FRONTEND_URL`, not the request; HTML escaping of names tested (`onboardingEmailWorkflow`, new welcome tests) | Verified |
| F7 | User enumeration | Resend and forgot-password return generic responses. **Registration still answers 409 "An account with that email already exists"** (pre-existing; tradeoff with usability) | Documented (owner may accept) |
| F8 | Unauthorized dealer approval | Three approval endpoints were usable by any `admin` | **Fixed** (decision-authority guard; owner-only default) |
| F9 | Concurrent/duplicate approval | Read-then-write race | **Fixed** (conditional update; 409) |
| F10 | Moderation bypass by sellers | Bulk status, dealer-platform bulk and duplicate-listing could publish | **Fixed** |
| F11 | Dealer approval published pending listings regardless of moderation policy | | **Fixed** |
| F12 | Inconsistent approval endpoints (`users.status` not set by `verify-dealer`/`approve-dealer`) | | **Fixed**; `approve-dealer` now also refuses non-seller accounts |
| F13 | Owner by email only; unverified or unregistered owner | Owner-only controls now require verified owner email. The generic bypass in `protect`/login for owners is unchanged | Partly fixed; **launch checklist 4** |
| F14 | Mass assignment on settings | Unknown keys, inherited keys (`__proto__`), non-string values, `revision`/`updatedBy` overrides rejected (found and fixed a real bug: inherited-key bypass) | **Fixed** |
| F15 | CSRF/origin | Unchanged existing middleware; new write route is under `/api/admin` (authenticated, owner-only) | Not retested live |
| F16 | Rate limits | Registration/verification/resend limiters unchanged and existing; no new public write endpoints (the public policy GET is read-only, `no-store`) | Not retested live |
| F17 | IDOR | Approval endpoints take ids but are decider-gated; no new id-addressed endpoints | Verified by inspection |
| F18 | Audit failures hiding actions | `auditAfterCommit` (existing) never converts a committed action to failure; `onboarding policy` and `dealer/listing decision` are now critical (retry once + alert) | Existing + extended |
| F19 | PII in logs | Policy audit stores actor id/name only; no emails or tokens | Verified |
| F20 | Public exposure of policy | Public endpoint returns two registration modes + trust flag only; authorities and actor ids are admin-only | Verified |
| F21 | Missing RLS/constraints | `system_settings` service-only (replay); registration function not executable by anon/authenticated | Verified on disposable DB |
| F22 | Failure paths returning success | Failed policy writes return 500/503/409 and never a success audit row (tested) | Verified |
| F23 | Welcome email told unapproved dealers "Your account is ready" | | **Fixed** |
| F24 | Verification link is a GET that consumes the token (scanner pre-fetch) | | Documented |

## Not changed on purpose (business-policy decisions, still gated)
Finance-read policy (D5/D6), referral economics (D17), escrow capability backfill (D14), role reconciliation (D15), feature-flag retirement (D8). Where one of them touches onboarding (D14: dealers do not get escrow just by being approved) it was left unchanged and listed in the decision register.
