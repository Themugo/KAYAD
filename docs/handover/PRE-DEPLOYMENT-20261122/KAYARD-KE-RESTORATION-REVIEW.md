# KAYARD KE — Restoration review (`kayad_register_identity_atomic`)

Review date 2026-11-22. **Inspection and preparation only. Nothing was applied to hosted, committed, pushed, merged or deployed.** Hosted Supabase was used for read-only catalogue/aggregate/log queries. Status labels: VERIFIED / FAILED / BLOCKED / NOT TESTED.
Naming note: the brand is **KAYARD KE**. Identifiers (`kayad_register_identity_atomic`, `kayad_*` tables/functions), the sending domain `kayad.space` and the hosted project's display name "KAYAD EA" are technical names that exist as-is; they are quoted literally and are not brand text.

## 1. Verdict
The proposed restoration is **technically sound and ready for owner approval**, subject to the four preconditions in `KAYARD-KE-DEPLOYMENT-AND-ROLLBACK-PLAN.md` §2 (project identity, recovery point, approval, drift check). It is not yet proven in the real environment: that needs the production acceptance run (plan §6).

## 2. Confirmed root cause and how the function was replaced
**Confirmed (evidence):**
| # | Fact | Evidence |
|---|---|---|
| C1 | The hosted function is a placeholder: role check, then the comments `-- Other function logic` / `-- Remaining registration logic`, then `END`. It never inserts and never returns, so every call fails with 2F005 "control reached end of function without RETURN". | `pg_get_functiondef` (read-only): 709 chars, md5 `f414d98a357862f9270796a4965d6900`. Reproduced byte-for-byte on a disposable database: the same md5 and the same failure (rehearsal P0). |
| C2 | The placeholder text never existed in the repository. | `git log --all -S"Other function logic"` and `-S"Remaining registration logic"`: no commit. Repo-wide search finds it only in the reports/tests written in this work. So it did **not** come from a migration or a commit. |
| C3 | The change is not in the hosted migration history. | `list_migrations`: last entry 20260922; none of the October/November migrations recorded. |
| C4 | The change was made by pasting SQL, not by a migration. | The stub contains Windows `\r\n` line endings, as does the hosted `sync_dealer_profile_from_user` (identical to the repo's hand-run `runbooks/dealer-onboarding-hosted-patch-20261102/APPLY_dealer_onboarding_minimum.sql`); a function created through a migration (`sync_profile_from_user`) has `\n`. |
| C5 | The stub was derived from the **2026-11-10 draft** of the function. | It declares `v_seller_approval_required boolean := false;`, a variable that exists only in `20261110140000_private_seller_free_access_defaults.sql` (0 occurrences in `20261001090000`, `20261001220000` and the hosted minimum patch). The body between the declaration and the role check, and everything after it, was replaced by placeholder comments. |
| C6 | It was written on or about 2026-11-10, after the last successful registration and around when that migration was committed. | The last successful registration (verification + welcome email rows) is 2026-11-09 07:17 UTC. Ordering the function row's `xmin` against rows with known timestamps brackets its last write between rows stamped 2026-11-10 11:37 and 17:12 UTC. The commit that first added `20261110140000` is 2026-11-10 20:08 +03 (17:08 UTC). |
| C7 | It is failing live. | Hosted API log: `POST /rest/v1/rpc/kayad_register_identity_atomic` → 400 twice on 2026-11-22 at 13:11:10 and 13:11:40 UTC. |

**Most likely cause (inference, not proof):** on or about 2026-11-10 someone ran an abbreviated copy of the then-new function (the free-seller-policy redefinition) directly in the hosted SQL editor, or through a SQL tool, and the "…other logic…" placeholders in the abbreviated text were executed literally. This replaced the working function (most probably the minimum-patch version, which behaves identically for `user` and `dealer`). `CREATE OR REPLACE` kept the ACL, so the function stayed correctly locked down while becoming useless.

**Not established (assumptions / unknowns):** who ran it and through which tool; the exact minute (the `xmin` bracket is approximate, and `xmin` also moves on a `GRANT`, so it dates the last catalogue write, not necessarily the body change); whether other registration attempts failed between 10 and 22 November (the retained API logs cover only the latest 24 hours; no Postgres log line for the failures was retained); whether this project is the database behind the live API (see plan §2).

## 3. Comparison with every known definition (VERIFIED, normalised diff)
| Definition | Where | Relation to the proposed function |
|---|---|---|
| Hosted placeholder | hosted | replaced entirely |
| `20261001090000_registration_onboarding_integrity.sql` | repo (original) | proposed adds the onboarding-policy lookup and policy-aware status |
| Hand-run minimum patch (2026-11-02) | `runbooks/dealer-onboarding-hosted-patch-20261102/` | body identical to `20261001090000` (comments aside); `user`→approved and `dealer`→pending behave the same as proposed |
| `20261110140000_private_seller_free_access_defaults.sql` | repo (latest) | proposed is **identical except one guarded statement** (below) |
| Proposed `20261122200000_restore_register_identity_atomic.sql` | patch v1 | — |

The single difference from the latest repo definition: the legacy-role capability insert is written only when `public.private_seller_capabilities` exists (it is absent on hosted), via `to_regclass` + `EXECUTE`. The backend never sends `individual_seller` (it maps it to a personal `user`), so ordinary registration is not affected either way.
A byte-for-byte copy of the earlier hosted function does not exist in the repository; "last known working" is therefore taken to be the minimum patch / `20261001090000` behaviour, corroborated by the 3 users and the 8 delivered emails recorded between 2026-10-20 and 2026-11-09.

## 4. Contract and architecture checks
| Check | Result |
|---|---|
| Signature (10 parameters, order and types) and `RETURNS jsonb` | identical to hosted and to all repo definitions; the backend passes exactly these named arguments (`authController.register`) and maps the returned row with `mapRowIn("users", …)`. VERIFIED (source + journey 20) |
| Account creation | inserts `users` then `user_auth` in the one function call (one transaction). The existing `AFTER INSERT` triggers (`trg_sync_profile_from_user`, `trg_sync_dealer_profile_from_user`) create the profile and, for dealers, the `dealers` row; both exist on hosted. VERIFIED (rehearsal F1–F4) |
| Role assignment | only `user`, `individual_seller`, `dealer` accepted (else 22023); `admin`/`superadmin`/staff roles impossible. Backend maps everything except `dealer` to `user`. Unified account preserved. VERIFIED (F6, journey 20 C6) |
| Status | `user`→`approved`; `dealer`→`pending`; legacy seller `approved` unless the policy says `required`. Hosted `onboarding_policy` has no `privateSellerApprovalMode`, so it resolves to approved. Allowed by hosted `users_status_check`. |
| Duplicates | hosted unique index `users_email_key` on `email`; the function lower-cases/trims the address, so a mixed-case duplicate is rejected with 23505; the backend answers 409 (or the idempotent replay). VERIFIED (F5). Note: hosted has **no** `lower(btrim(email))` index and no `dealers_business_name_unique` index (both exist in the repo migration chain only), so the "company name taken" rule is not enforced at database level on hosted. Pre-existing drift, unrelated to this restore, not changed. |
| Atomicity | a failure in the credential insert leaves no `users` row (F7); the migration itself is one transaction and a post-check refuses to commit anything that is not the full function (this guards exactly the truncated-paste failure mode; rehearsal N1 shows preflight aborting atomically). |
| Constraints / required columns | the only NOT NULL-without-default columns are `users.name`, `users.email`, `user_auth.user_id`, `user_auth.password`; all supplied. Role/status CHECKs satisfied. All 14 columns the preflight needs exist on hosted. |
| `SECURITY DEFINER`, search path | definer, owner `postgres`, `SET search_path = public` (same as hosted today and as every repo definition). Optional hardening `public, pg_temp` is **not** applied, to stay equal to the tested contract (static guard `stage4IdentityLifecycle` asserts `SET search_path = public`). All relations are schema-qualified. |
| Execute permissions | hosted ACL today `{postgres=X/postgres, service_role=X/postgres}`; `anon` and `authenticated` cannot execute. `CREATE OR REPLACE` preserves it and the migration restates REVOKE (PUBLIC, anon, authenticated) / GRANT (service_role). VERIFIED (rehearsal A2, S1; journey 20 A6). Access boundary: only the backend's service-role key can call it. |
| RLS | `users`, `user_auth`, `dealers` have RLS enabled on hosted; the definer function runs as `postgres` (as the earlier working function did). |

## 5. Security review
* No new privilege, grant or table; the migration cannot widen access (the post-check does not touch the ACL, and the rehearsal shows it unchanged).
* The function stores only a bcrypt hash and the SHA-256 of the verification token; raw tokens never reach the database.
* Exposure of the function through the public REST endpoint is blocked by the ACL (anon/authenticated denied, verified).
* Open item (pre-existing, hosted): `sync_dealer_profile_from_user` has a NULL ACL (default PUBLIC execute). The repo's later migration restricts it; it is a trigger function and cannot be called as an RPC with arguments, so risk is low; not part of this change.
* Do not use `supabase db push` for this: hosted history stops at 2026-09-22, so a blanket push would replay ~90 migrations, and `20261110140000` aborts its own preflight because `private_seller_capabilities` is absent.

## 6. Future-overwrite risks (VERIFIED by reading)
1. Re-running the hand-run patch `APPLY_dealer_onboarding_minimum.sql` (documented "safe to repeat") would replace the restored function with the older body (functionally equivalent for `user`/`dealer`, but loses the policy lookup). Recommendation: mark it superseded after the restore.
2. Applying `20261001090000` out of order later (e.g. `db push --include-all`) would also redefine it with the older body.
3. Any future paste into the SQL editor. Mitigation: after the restore run `90_POST_CHANGE_VERIFY_READONLY.sql` after **every** hosted SQL session that touched functions, and consider a scheduled read-only drift check (this query returns false rows for a placeholder).
4. `20261110140000` can only be applied once `private_seller_capabilities` is reconciled (separate decision).

## 7. Files changed by this review
Nothing in the repository was changed. New, in the delivery package only: the four KAYARD-KE reports, the SQL scripts (`sql/`), `evidence/rehearse-register-restore.sh` and its log. The frozen patch `kayard-registration-email-repair-v1.patch` is unmodified (migration copy verified identical to the patch's).

## 8. Exact SQL proposed
`sql/10_APPLY_20261122200000_restore_register_identity_atomic.sql` (identical to the migration inside the v1 patch): preflight, `CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(...)` (full body in the file), REVOKE/GRANT, post-check, `NOTIFY pgrst, 'reload schema'`. Read-only companions: `00_PRE_CHANGE_SNAPSHOT_READONLY.sql`, `90_POST_CHANGE_VERIFY_READONLY.sql`. Rollback and cleanup: `95_…`, `99_…` (both need approval).

## 9. Test results (all local; none is production verification)
| Check | Result |
|---|---|
| Restore rehearsal on a hosted-shaped disposable database, starting from the byte-identical hosted placeholder | **19/19** (reproduces failure; preflight abort is atomic; apply; ACL preserved; definer/search_path; anon/authenticated denied; user/dealer/legacy flows; duplicate; bad role; atomicity; idempotent re-apply; rollback to exact md5; post-verify SQL all true) |
| Verification SQL run read-only against hosted today | correctly reports 2 failing checks (placeholder, no inserts) |
| Registration journey (disposable stack, loopback email stub) | 54/54 (from the previous task) |
| Database journey gate | all journeys pass, 211/211 migrations (previous task) |
| Backend | 253 suites, 4,189 tests passed (previous task) |
| Frontend registration/auth tests; registration validators | passed (previous task) |
Not re-run in this task (no code changed): the above previous-task results stand for the tree they were run on.
**To repeat after integration** (with the release-consistency v3 and command-centre v2 patches applied in the order v3 → command-centre v2 → registration repair): `tsc`, full frontend suite, full backend suite, the full journey gate (including journey 20), and the registration validators.
