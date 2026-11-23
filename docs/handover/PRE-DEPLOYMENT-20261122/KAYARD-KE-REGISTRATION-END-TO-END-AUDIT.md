# KAYARD KE — Registration end-to-end audit

Date 2026-11-22. Inspection only. Evidence tiers: S source, M mocked, L local disposable stack with loopback provider stub, H hosted read-only, P provider acceptance (none obtained), D mailbox delivery (none obtained).

## 1. Confirmed root cause
The hosted `kayad_register_identity_atomic` is a placeholder (md5 `f414d98a357862f9270796a4965d6900`, 709 chars): role check, then comments, no insert, no RETURN. PostgreSQL raises 2F005, PostgREST answers 400, every registration fails (H: two live 400s on 2026-11-22 13:11:10 and 13:11:40 UTC). Before the repair the backend turned this into a generic 500. Full provenance, with confirmed / inferred / unknown separated, is in `KAYARD-KE-RESTORATION-REVIEW.md` §2.

## 2. Assumptions (not proven)
* The placeholder was pasted manually around 2026-11-10 (inference from CRLF endings, a variable that exists only in the 2026-11-10 draft, and `xmin` ordering). Who/why is unknown.
* The hosted project `ubvgixwhfybbyjuvxboj` ("KAYAD EA") is the database behind the live API. Not confirmed (needs Render `SUPABASE_URL`).
* The earlier working function matched the repository's minimum patch. Corroborated only by behaviour (3 users, 8 emails, 2026-10-20 to 2026-11-09).

## 3. Flow and where each step stands
| Step | Behaviour | Evidence |
|---|---|---|
| Form → `POST /api/v1/auth/register` | validation, role mapping (only `dealer` stays a dealer; every other role is a personal `user`; unified account preserved) | S, M, L |
| RPC `kayad_register_identity_atomic` | inserts `users` + `user_auth` atomically; triggers create profile/dealer rows | L (journey 20 B, C; rehearsal F1-F7). **H: broken today** |
| Token | raw token emailed; only SHA-256 stored; 24 h expiry | S, L |
| Email dispatch | asynchronous after commit via `communicationGateway.deliver` → `communication_deliveries` (queued → sent → delivered only by Brevo webhook) | S, L |
| Verify link → `verifyEmail` | token consumed, user marked verified; on a failure after consumption the token is restored (repair) | L (journey 20 F) |
| Login | blocked until verified when `REQUIRE_EMAIL_VERIFICATION=true` (or `BREVO_API_KEY` set and variable unset) | S, L |
| Resend | 60 s per-account cooldown; new token committed only after provider acceptance | S, L |
| Reset | request and complete | S, L |

## 4. Code changes (in `kayard-registration-email-repair-v1.patch`, 19 files, unmodified by this review)
`authController.js` (register: invalid/empty RPC result → coded 503 `DATABASE_MIGRATION_REQUIRED`, `PGRST202|42883|2F005` mapped likewise; verifyEmail restores the token if the later write fails), migration `20261122200000_restore_register_identity_atomic.sql`, `ci/db-journeys/20_registration_email_lifecycle.mjs`, `run.sh` registration, `fakePostgrest.js` (additive option), new test `registrationRepair.e2e.test.js`, guard updates in `stage4IdentityLifecycle` and `securityCertification`, eight mocks made async, three earlier reports. No escrow, payment, payout, commission or ledger file touched.

## 5. Journey status
| Journey | Local (L) | Hosted today |
|---|---|---|
| Register user | VERIFIED | FAILED (placeholder) |
| Register dealer | VERIFIED | FAILED |
| Duplicate / invalid data / idempotent replay | VERIFIED | NOT TESTED (writes forbidden) |
| Verify email, login before/after | VERIFIED | NOT TESTED |
| Expired link and resend | VERIFIED | NOT TESTED |
| Password reset request and completion | VERIFIED (loopback stub) | NOT TESTED |
| Legacy `individual_seller` role | VERIFIED (becomes personal user) | NOT TESTED |
No hosted write was performed by this audit, so no hosted journey could be exercised.

## 6. Security review
Function ACL is service-role only (anon/authenticated blocked, VERIFIED). Definer + `search_path=public`. No secrets in repository, logs or reports (journey 20 H). Hosted drift noted: no `lower(btrim(email))` unique index, no dealer business-name unique index, `sync_dealer_profile_from_user` ACL unrestricted — pre-existing, unchanged.

## 7. Database safety assessment
Project ref `ubvgixwhfybbyjuvxboj`, org `mbhrihjoanavafrmpekb`, eu-central-1, PG 17.6, created 2026-08-31, no branches, 31 MB, rows users/user_auth/dealers/profiles 3/3/2/3. Production vs staging: **NOT confirmed**. Backup/PITR: **NOT confirmable** from here (`archive_mode=on` only). Both are owner preconditions.

## 8. Test results (local only)
Rehearsal 19/19 (this task). Previous task: journey 20 54/54, journey gate 211/211, backend 253 suites / 4,189 tests, frontend registration/auth 326 tests, validators pass. Four legacy `verify-*` scripts fail identically on the untouched base (pre-existing, unrelated).

## 9. Outstanding requirements
Owner: confirm project/Render link and environment; recovery point; approve apply; Brevo key, sender and domain evidence; real test mailbox. See the deployment plan.

## 10. Deployment sequence and acceptance criteria
See `KAYARD-KE-DEPLOYMENT-AND-ROLLBACK-PLAN.md` §3 and §6. This report makes **no** production-readiness, delivery, or production-verification claim.
