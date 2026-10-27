# KAYAD Phase 16B — Registration and dealer-onboarding migration proposal (NOT APPLIED)

Files (`runbooks/phase16b-20261027/`): `migration-candidate/20261027120000_phase16b_registration_and_dealer_onboarding_CANDIDATE.sql`, `…_ROLLBACK.sql`, `pg-tests/registration_dealer_onboarding_pg_checks.sh`.

## What is missing on hosted (16A read-only evidence) and where it comes from
| Missing | Defined in | Caller |
|---|---|---|
| `public.kayad_register_identity_atomic(...)` | `supabase/migrations/20261001090000_registration_onboarding_integrity.sql`, `20261001220000_database_contract_alignment.sql` | `authController.js` RPC at registration; a missing function returns an explicit "DATABASE MIGRATION REQUIRED" error |
| `dealers.bio`, `payment_details jsonb`, `onboarding_complete`, `onboarding_completed_at` | repo schema | `GET/PUT /api/dealer/onboarding` |
| `suspended` in `dealer_verifications_verification_status_check` | repo schema | dealer suspension |

## The smallest compatible migration (one transaction)
1. **Preflight** `DO` block: aborts with `PHASE16B PREFLIGHT FAILED` if prerequisite tables/columns are absent — nothing partial is applied.
2. Adds the four `dealers` columns (all defaulted/nullable-safe; existing rows unchanged byte-for-byte — tested).
3. Widens the CHECK to `pending|approved|rejected|suspended`, only when it does not already contain `suspended` (existing status meanings preserved).
4. Creates `kayad_register_identity_atomic`: `SECURITY DEFINER`, `SET search_path = public, pg_temp`, accepts only roles `user|individual_seller|dealer` (superadmin/admin/webhoist/moderator/accounts refused with `22023`), lower-cases the email, inserts `users` + `user_auth` in one transaction (all-or-nothing, idempotent on retry), `REVOKE` from PUBLIC/anon/authenticated, `GRANT EXECUTE` to `service_role` only.
5. **Deliberately excluded:** the dealer-sync trigger (the API creates the dealer row lazily), a normalised-email unique index, any owner/MFA table, any `users.role` update. **It cannot create or elevate an owner.** It does not touch `kamauwamakena@gmail.com` and does not approve anyone.

## Rollback
Guarded: refuses if any `suspended` rows or onboarding data exist (so data is never silently lost); otherwise drops the function, restores the 3-value CHECK and drops the four columns. Roll-forward after rollback is tested.

## Rehearsal (disposable clone shaped like hosted, two synthetic rows) — 47/47
Preflight refusal · apply · pre-existing rows byte-identical · grants (anon/authenticated denied, service_role allowed) · function behaviour and refused roles · atomicity · idempotency · rollback guards · rollback · roll-forward. Log: `validation-logs/phase16b/registration_onboarding_pg_checks.run1.txt`.

## Dealer workflow behaviour (disposable stack, E2E)
Verification, onboarding, approval, rejection, suspension and retry: `e2e_dealer_lifecycle` 50/50, `e2e_dealer_payments` 73/73 on the final code; 16B S3 proves a dealer cannot approve or elevate itself. **`kamauwamakena@gmail.com` is not approved or activated by anything in 16B.**

## Apply gate (needs the owner's written approval — see the approval gate)
Staging first, with a backup; run the rehearsal script against a staging clone; apply; verify with a probe registration of a synthetic address on staging only.
