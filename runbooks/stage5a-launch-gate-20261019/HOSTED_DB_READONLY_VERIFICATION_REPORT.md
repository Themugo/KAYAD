# Gate C — Hosted database read-only verification (Stage 5A, 2026-10-19)

**Target:** Supabase project "KAYAD EA" (`ubvgixwhfybbyjuvxboj`, eu-central-1, ACTIVE_HEALTHY, PostgreSQL 17). The other project in the account ("CALQULUS PMS") is unrelated and was not touched.
**Method:** SELECT-only queries through the Supabase SQL tool. No writes, migrations, accounts, settings or role changes. No connection string or key was printed.
**Evidence:** `evidence/gateC_hosted_preflight_result_20261019.txt`, `evidence/gateC_hosted_applied_migrations.txt`.

## Verdict: **NOT COMPATIBLE with the Stage 5A application until a migration is authorized.** (Gate C = BLOCKED, owner approval needed.)

| Check | Hosted | Disposable PG (181-file chain) |
|---|---|---|
| `kayad_register_identity_atomic` (registration RPC) | **MISSING** | OK |
| `kayad_apply_dealer_verification_atomic` | OK (SECURITY DEFINER) | OK |
| RPC not executable by anon/authenticated | OK (vacuous — RPC absent) | OK |
| `system_settings` unique key + `updated_at` (revision token) | OK | OK |
| RLS on system_settings / users / cars / audit_logs; anon & authenticated have no table grants, service_role does | OK | OK |
| `cars_status_check` admits `hidden`, excludes `rejected` | OK (the supported state) | OK |
| `users.status`, `email_verified`, `dealer_approved_at`; `dealers.approved` | OK | OK |
| `user_auth.email_verify_token/expire` (hashed token persistence & consumption) | OK | OK |
| `refresh_tokens.session_id` / `family_id` (session revocation) | **MISSING** | OK |
| `users.deactivated_at / granted_permissions / revoked_permissions / last_active` | **MISSING** | OK |
| case-insensitive unique email index | **MISSING** | OK |
| audit_logs actor columns | OK | OK |

Other facts: 2 users, 0 email-verified; `system_settings` has 10 rows and **no** `onboarding_policy` row (the app therefore uses the launch defaults — restrictive, see Gate D); applied migration history has 135 entries whose file names do not match the repository's 181 files (many re-numbered duplicates), so migration *names* cannot be used as the compatibility test — the object-level preflight is the test.

## What this means for onboarding
* **Registration will fail** (RPC missing): fail-closed, no account is created. This alone blocks onboarding a first seller or dealer.
* Sign-in/refresh/revocation code paths reference session columns that do not exist hosted; do not enable public onboarding before migration.
* Owner provisioning: with 2 unverified users and no approved bootstrap procedure, the owner account must be intentionally provisioned **after** migration (see Gate A and decision D6).

## Prepared (not applied)
* `GATE_C_PREFLIGHT_READONLY.sql` — 16 checks; run hosted = 12 OK / 4 MISSING; run on the disposable chain = 16 OK.
* `GATE_C_APPLY_ORDER_NEEDS_AUTHORIZATION.sql` — approval gate + ordered candidate (repo chain, replayed 181/181 with 0 failures on the disposable PostgreSQL; see `evidence/pg_replay_20261019.log`) with a mandatory branch rehearsal.
* `GATE_C_ROLLBACK_AND_RECOVERY_PLAN.md`.
