# KAYARD KE — Deployment and rollback plan (for owner approval)

**Nothing here has been executed.** No hosted write, no commit, push, merge or deploy. Never run a blanket `supabase db push` (hosted history stops at 2026-09-22; a push would replay ~90 migrations and `20261110140000` fails its own preflight).

## 1. Files (package `KAYARD-KE-restoration-review-v1/sql/`)
| File | Writes? | Purpose |
|---|---|---|
| `00_PRE_CHANGE_SNAPSHOT_READONLY.sql` | no | captures current definition; expects md5 `f414d98a357862f9270796a4965d6900`, length 709, ACL `{postgres=X/postgres,service_role=X/postgres}`. If md5 differs: STOP |
| `10_APPLY_20261122200000_restore_register_identity_atomic.sql` | **yes (one function)** | the restoration; byte-identical to the migration in `kayard-registration-email-repair-v1.patch` |
| `90_POST_CHANGE_VERIFY_READONLY.sql` | no | 9 boolean checks, all must be true |
| `95_ROLLBACK_RESTORE_CAPTURED_DEFINITION.sql` | yes | re-creates the placeholder (restores the outage); needs separate approval |
| `99_TEST_ACCOUNT_CLEANUP_NEEDS_APPROVAL.sql` | yes | deletes only the acceptance test account; separate approval |

Exact SQL change: `CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(...)` (same signature/return), `REVOKE ALL ... FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE ... TO service_role`, then `NOTIFY pgrst, 'reload schema'`. Only this one function object is affected; no table, data, trigger or policy changes.

## 2. Preconditions (owner)
1. Confirm the Render backend's `SUPABASE_URL` points at project ref `ubvgixwhfybbyjuvxboj`, and state whether it is production or staging.
2. Create a recovery point: confirm a dashboard backup/PITR restore point exists, or take a `pg_dump` (schema+data, 31 MB) with the password supplied via environment and never printed. Record its timestamp.
3. Written approval to apply `10_...sql`.
4. Run `00_...sql`; proceed only if md5 and ACL match.

## 3. Sequence
1. Preconditions 1-4.
2. Apply `10_...sql` as one script in the SQL editor or with `psql -f` (it is one transaction; the post-check aborts the whole thing if the body is not the full function).
3. Run `90_...sql`: all 9 must be true.
4. Deploy backend code through the normal pipeline, patch order **v3 → command-centre v2 → registration repair** (reverse order conflicts in `run.sh`). Re-run tests listed below on the combined tree first.
5. Set `BREVO_FROM_NAME` (owner decision) and confirm Brevo key/sender/domain.
6. Run the live acceptance (§6).
7. Clean up the test account with `99_...sql` after separate approval.
8. Mark `runbooks/dealer-onboarding-hosted-patch-20261102/APPLY_dealer_onboarding_minimum.sql` as superseded (re-running it would replace the restored body with the older equivalent).

## 4. Tests to repeat after integration (combined tree)
`tsc`; full frontend suite; full backend suite (expect all suites to pass; earlier 253 suites / 4,189 tests on the repair tree); full journey gate including journey 20 (earlier 54/54, gate 211/211); registration validators; `ci/rehearse-register-restore.sh` (earlier 19/19). Do not weaken any test.

## 5. Rollback and recovery
* The apply is atomic: any failure leaves the previous (placeholder) function untouched.
* Preferred recovery after a bad outcome is a **forward fix** (re-apply the corrected function). Accounts registered after the restore must be kept.
* `95_...sql` restores the captured placeholder exactly (md5 verified in rehearsal) but **restores the outage**; use only if the owner explicitly wants that state.
* Full-database restore from the recovery point is the last resort and would discard newer data.
* Overwrite guard: run `90_...sql` after any future hosted SQL session.

## 6. Production acceptance criteria (each needs captured evidence)
1. A real test user registers through the production site (HTTP 201).
2. The account persists (row in `users`/`user_auth`, profile created).
3. A real verification email arrives in the authorised mailbox (headers and time saved; ledger row `sent`; `delivered` only if webhook-confirmed).
4. The link verifies the account (`email_verified` true).
5. Login works.
6. A password reset is requested.
7. The reset email is received in the mailbox.
8. The reset completes and login works with the new password.
Until all eight pass, registration and email delivery remain **unverified in production**.

## 7. Status
Rehearsal 19/19 (local); everything hosted-write, provider, domain and mailbox related is BLOCKED or NOT TESTED pending the owner. **Approval requested before any step in §3.**
