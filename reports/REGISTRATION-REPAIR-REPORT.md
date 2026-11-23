# Registration and email repair report

Base `origin/main` bfe3735, worktree `/home/claude/p10`. Nothing committed, pushed, merged or deployed; **no hosted migration or hosted write**. Hosted Supabase was used for read-only catalogue/aggregate/log queries only. No dealer financial logic, escrow, payment, payout, commission or ledger code was touched, and no v2/v3/command-centre deliverable was modified or regenerated (checksums re-verified at the end).

## Final acceptance status
| Requirement | Status |
|---|---|
| A real test user registers, receives the email, opens the link, verifies, logs in; password recovery works | **NOT VERIFIED in the intended environment (BLOCKED).** Verified only on a disposable local stack with a loopback email stub. Missing: authorised test mailbox, Brevo credentials/dashboard access, production API URL/credentials, and permission to apply the hosted repair. |
| Root cause of "registration fails" | **Identified (hosted DB function is a placeholder), repair written, NOT applied.** |
| Code repair | VERIFIED locally. |

Do not treat this task as complete until the production checks in "Deployment requirements" are run by someone with access.

## Root causes
1. **R1 (critical, hosted):** `kayad_register_identity_atomic` on the hosted project was overwritten with a placeholder body (no insert, no return) outside the migration history → every registration fails (2 attempts seen at 13:11 UTC on 2026-11-22, HTTP 400 from the RPC). Details in `REGISTRATION-END-TO-END-AUDIT.md`.
2. **R2:** the backend reported that as a generic 500 that invited blind retries.
3. **R3:** `verifyEmail` burned the single-use token before marking the user verified.
4. **R4:** a function result with no user row was not rejected.
No defect was found in the email provider adapter, delivery ledger, resend, or recovery logic; their failure modes are already observable and recoverable (see `EMAIL-DELIVERY-AUDIT.md`). Hosted email health after 9 Nov is **unknown**, because nothing has reached the email step since.

## Exact files changed
Added:
* `supabase/migrations/20261122200000_restore_register_identity_atomic.sql` — forward-only, idempotent restore of the function (same signature/contract; legacy `individual_seller` capability row written only if `private_seller_capabilities` exists, which it does not on hosted); preflight on tables/columns; post-check that refuses to commit a non-full definition; keeps REVOKE/GRANT (service_role only). **Not applied anywhere hosted.**
* `backend/tests/regression/registrationRepair.e2e.test.js` (4 tests)
* `ci/db-journeys/20_registration_email_lifecycle.mjs` (54 checks)
* `reports/REGISTRATION-END-TO-END-AUDIT.md`, `EMAIL-DELIVERY-AUDIT.md`, `REGISTRATION-REPAIR-REPORT.md`
Modified:
* `backend/controllers/authController.js` — register: reject a function result without a user row; map 2F005 / invalid result to 503 `DATABASE_MIGRATION_REQUIRED` with an operator log naming the restore migration. verifyEmail: restore the consumed token (same expiry) if marking the user verified fails.
* `backend/tests/helpers/fakePostgrest.js` — additive `brokenFunctions` option to simulate a placeholder function.
* `backend/tests/regression/stage4IdentityLifecycle.test.js` — the static guard that lists which migrations may define the function now lists the restore migration **and additionally asserts it is the full function** (insert users, insert user_auth, `RETURN to_jsonb(v_user)`, no placeholder text); every final-state assertion still applies.
* `backend/tests/security/securityCertification.test.js` — the verifyEmail test now mocks the new pre-read (assertions unchanged).
* `ci/db-journeys/run.sh` — registers journey 20.
* Test-mock hygiene (8 files): `registerMediaUploadFailure: jest.fn()` → `jest.fn(async () => ({}))` in `softDeletedListingReadOnly`, `listingCreationIdempotency`, `carPosterImage`, `personalListingPhotoRemoval`, `listingDeletionGuard`, `stage5aSellerSelfPublication`, `stage1ListingWriteBoundaries`, `carAuctionLockAndUpdate`. Reason: the real service returns a promise and `carController` calls `.catch` on it. With the old mocks a leaked upload-failure path threw an unhandled `TypeError` that killed the whole jest process once an extra suite changed worker scheduling (reproduced with my new test present; not present on the untouched base run). Test-only; no assertion changed; no production file touched.
No frontend change was needed (the form already renders the coded 503 as "Nothing was created").

## Test results
| Check | Result | Tier |
|---|---|---|
| Journey 20, registration/email/recovery, real backend+DB, loopback email stub | **54/54** | L |
| Full journey gate (`ci/db-journeys/run.sh`), clean disposable DB, 211/211 migrations incl. the new one | all journeys pass, overall PASS (includes legacy registration journeys 21/21 idempotency) | L |
| Full backend jest | 253 suites passed, 1 skipped, 0 failed; 4,189 tests passed, 21 skipped | M/L |
| Registration repair tests | 4/4; **3 of 4 fail against the original controller** (proves they test the fix) | M |
| Frontend registration/auth tests | 25 files, 326 tests passed | M |
| Registration validators (onboarding 47/47, e2e contract 14/14, role matrix 34/34, unified onboarding, email reliability 8/8, email-only 11/11, explicit auth flows, premium auth surfaces, drawer auth loading) | pass | S |

Journey 20 covers: placeholder function → 503 and nothing persisted; restore migration (twice, and without the optional table) → registration works; function privileges; success; invalid data; duplicate verified/unverified/same-attempt retry; legacy role → personal account; dealer; verification email content/link; login before and after verification; invalid, expired, replayed link; resend (generic reply, new link, no duplicates within cooldown, unknown/verified addresses); provider failure (registration stays up and fast, failure recorded with `last_error`, recovery via resend, failed resend keeps the old link valid); database failure while verifying (token restored, retry succeeds); forgot/reset (generic reply, token hashed, weak password, invalid/expired/replayed token, old password refused, sessions); no secrets in logs or ledger.

**Outstanding / not run (stated, not hidden):**
* Provider timeout against real Brevo: only mocked (the stub can return 500, not hang).
* Hosted run of anything; real mailbox; SPF/DKIM/DMARC; Brevo logs/webhooks: NOT TESTED / BLOCKED.
* Pre-existing, unrelated: `scripts/verify-brevo-email-integration.mjs`, `verify-migration-integrity.mjs`, `verify-migration-deployment-static.mjs`, `verify-database-contract.mjs` exit 1 on the **untouched base** too (they reference migrations from another project's history, or an old migration lacking `search_path`). Not changed.
* One suite (`stage5f5OwnerIdentityLifecycle`) failed in a run on a scratch export of the base but passes in this worktree; I did not investigate it further.

## Deployment requirements (owner approval needed for each)
1. **Apply the restore** to the hosted database (read-only pre-check done: every table/column the migration's preflight needs exists on hosted, `users.role`/`status` CHECK constraints allow the values it writes, `onboarding_policy` exists in `system_settings`, and the only NOT NULL columns without defaults are `users.email`, `users.name`, `user_auth.user_id`, `user_auth.password`, all supplied; the migration itself has **not** been run on hosted): either only `20261122200000_restore_register_identity_atomic.sql`, or the proper October/November chain (the hosted migration history stops at 2026-09-22, so a normal `supabase db push` would also try to replay many other migrations; do not do that blindly). After applying, verify read-only: function body is the full one; `service_role` can execute; `anon` cannot.
2. Find out **how** the function was replaced (SQL editor / an AI-generated "repair"), and stop it recurring; consider a CI/read-only drift check on `pg_get_functiondef` hash.
3. Deploy the backend change (503 mapping + token restore) through the normal pipeline.
4. Controlled live test per `runbooks/stage5-onboarding-20261019/EMAIL_PROVIDER_CONFIGURATION_AND_VERIFICATION_RUNBOOK.md` §4 with a mailbox you control: register → email arrives (check spam) → link host equals `FRONTEND_URL` → verify → replay shows the generic error → resend → log in → forgot password → reset → log in. Record each step (registration response, ledger status `sent`, mailbox receipt, verification, login).
5. In the hosted ledger, `delivered` appears only if the Brevo webhook is configured; `sent` = accepted by Brevo, not received.

## Manual configuration / DNS still required (not done, not inspectable from here)
* Render env present and correct: `BREVO_API_KEY` (active, not IP-blocked), `BREVO_FROM_EMAIL`, `FRONTEND_URL` (exact public origin), explicit `REQUIRE_EMAIL_VERIFICATION=true`, `BREVO_WEBHOOK_TOKEN` + webhook in Brevo.
* Brevo: sender `noreply@kayad.space` / domain authenticated; account not over quota.
* DNS for `kayad.space`: SPF including Brevo, Brevo DKIM record, DMARC policy. No DNS or CDN change was made or attempted.

## Evidence limits (what each claim rests on)
Local tests and a loopback stub prove source and database behaviour. They are **not** Brevo acceptance, **not** mailbox delivery and **not** hosted behaviour.

## Applying together with the other deliverables
Base for all patches is `bfe3735`. File overlap between this patch and the release-consistency v3 patch: none. Overlap with `kayard-dealer-command-centre-v2.patch`: only `ci/db-journeys/run.sh`; journey 20 is registered on its own line so the textual overlap is zero **when this patch is applied last**. Verified on scratch exports: (a) this patch alone; (b) v3, then command-centre v2, then this patch: all apply cleanly and `bash -n run.sh` passes. **Applying this patch before command-centre v2 fails** (context overlap in `run.sh`), so keep the order v3 → command-centre v2 → this patch, or use `git apply --3way`. This patch contains no generated asset, so no `dark-theme.generated.css` regeneration is needed for it. The combined tree was not re-run through the full test and journey gates (NOT TESTED combined).
