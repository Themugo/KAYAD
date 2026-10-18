# KAYAD Stage 4 — Migration-Chain Rehearsal Runbook (2026-10-18)

**Status: NOT EXECUTED against any hosted database. Every step that writes requires explicit owner authorization.**
Nothing in this folder is placed under `supabase/migrations/`, and nothing here may be run with `supabase db push --include-all`.

## 1. Evidence tier of this document
| Tier | What was done in Stage 4 |
|---|---|
| Static | Chain parsed (`scripts/analyze-migration-chain-stage4.py`): risk matrix + dependency inversion report (0 inversions) |
| Disposable local DB (PostgreSQL 16, own cluster, socket only) | Onboarding chain double-apply, execute-privilege matrix, G2 low-lock candidate (23 checks), preflight SQL validity |
| Staging / production | **None.** Every expected outcome below for those tiers is a prediction until the preflight is run there |

## 2. Execution order and why
The eight onboarding-chain migrations depend on one another in this order and on **no other pending migration** (verified both directions):

1. `20260930110000` — **DESTRUCTIVE / IRREVERSIBLE**: drops plaintext `refresh_tokens.token`. *(Stage 4A correction: it first backfills `token_hash = sha256(token)`, so live sessions survive; it FAILS atomically if a row has neither token nor hash. See `../stage4a-gate-closure-20261018/MIGRATION_SAFETY_PACK_THREE_MIGRATIONS.md`.)*
2. `20260930111500`
3. `20260930112000` — creates `uq_users_email_normalized`; **fails if normalised duplicate emails exist**.
4. `20260930113000`
5. `20261001090000` — creates `kayad_register_identity_atomic` (SECURITY DEFINER). Registration returns 503 `DATABASE_MIGRATION_REQUIRED` until applied.
6. `20261001220000` — creates `uq_user_auth_user_canonical`; **fails if a user has several credential rows**.
7. `20261011090000`
8. `20261011121000` — adds `profiles.updated_at`, definer trigger `sync_profile_role_from_user()` (search_path pinned) and a **one-time reconciliation of profiles.role to users.role** (data-changing; list diffs first).

Separate from the chain, owner-gated:
- `20261008120000` — backfills `escrow_capability_status='granted'` for every `individual_seller` with status `none`. This grants a money-handling capability in bulk; the owner must approve the population (count it first).
- G2 (decision D3) — `03B_G2_CANDIDATE_cars_status_rejected_LOW_LOCK_NOT_APPLIED.sql`: add `rejected` to `cars_status_check` via NOT VALID + VALIDATE (short lock). Not applied; not in `supabase/migrations`.

Risk matrix: `stage4_migration_risk_matrix.tsv` (14 unique-index migrations, 11 non-rerunnable). Inversions: `stage4_dependency_inversions.tsv`.

## 3. Preflight (read-only)
Run `01_READONLY_IDENTITY_LIFECYCLE_PREFLIGHT.sql` on the **approved, identified** target (staging branch preferred), plus the Stage 3 preflight and `runbooks/ONBOARDING_V2_1_PREFLIGHT_READONLY.sql`. The script is `BEGIN TRANSACTION READ ONLY … ROLLBACK`, emits counts only, no personal data.

| Section | Expected | Abort condition |
|---|---|---|
| 0 | target identity matches the approved target | any doubt about the host |
| S1 soft-delete columns | 4 × true | any false → do not deploy Stage 4 backend |
| I1 duplicate emails | 0 groups | >0 → block step 3; reconcile with owner (no merge/delete from this script) |
| I3 users↔user_auth | 0 / 0 / 0 | >0 for multiple credentials → block step 6; others are accounts that cannot sign in |
| I4 roles | 0 outside allowlist, 0 mismatch | mismatch >0 → list diffs (`select p.id,p.role,u.role from profiles p join users u on u.id=p.id where p.role is distinct from u.role`) and get owner sign-off before step 8 |
| R1 refresh_tokens | token present before step 1 | rows with neither token nor hash >0 → migration would fail; owner decides (Stage 4A: use preflight A2) |
| F1 register function | definer, search_path pinned, anon/authenticated exec = false, service_role = true | any deviation → record, diff against repository |
| C1 cars | no status outside list | soft-deleted sold listings >0 → report ids to owner |
| D1 dispute columns | all present | any missing |
| G1 feature_flags | absent (per repository) | exists → capture columns, do not guess |
| M1 history | compare with migration inventory | unexplained versions |

## 4. Backup and restore requirements (before ANY write)
- A **verified** backup of the target (restore tested into a disposable database, row counts compared for `users`, `user_auth`, `profiles`, `refresh_tokens`, `cars`, `escrows`).
- Step 1 cannot be undone from inside the database; the backup is the only path back. Record backup id, time, and restore test result in the evidence file.
- Rollback limits: see `ONBOARDING_V2_4_ROLLBACK_LIMITS.sql`. Indexes/constraints can be dropped; dropped plaintext tokens and the profiles.role reconciliation cannot be reconstructed without the backup.
- Maintenance window: sessions are preserved by the hash backfill (Stage 4A correction); still choose a quiet window for the lock on `users`/`refresh_tokens`.

## 5. Rehearsal procedure (disposable DB or approved staging branch only)
1. Create the target from a restore of the backup (never the live database). Confirm identity (section 0).
2. Run preflight; capture output to `evidence/<date>/preflight.txt`. Resolve aborts first.
3. Apply steps 1–8 **one at a time**, each in its own session with `lock_timeout` set (e.g. 5s) and `statement_timeout`; stop at the first error.
4. After each step run the matching check from `ONBOARDING_V2_3_POSTVERIFY_READONLY.sql` / `ONBOARDING_V3_3_POSTVERIFY_READONLY.sql`.
5. Apply `03B` only if D3 = canonical `rejected`; then verify `convalidated = true` and a `rejected` write succeeds on a throwaway row in the disposable copy.
6. Smoke the backend against the rehearsal target: register (new email), duplicate register (409), login, refresh, logout, revoke; no real accounts, no financial calls.

## 6. Post-migration verification
- `refresh_tokens.token` absent; `token_hash` populated for all live rows.
- `uq_users_email_normalized` and `uq_user_auth_user_canonical` valid.
- `kayad_register_identity_atomic`: definer, pinned search_path, privileges as F1.
- `users_profiles_role_mismatch = 0`; trigger present; `profiles_role_check` unchanged.
- Escrow capability counts equal the owner-approved population.

## 7. Evidence capture
Per step: command, timestamp, target identity, output, row counts before/after, backup id. Store alongside the Stage 4 report. Do not record emails, tokens, hashes or keys.

## 8. Not done / needs authorization
No hosted run was performed. Staging rehearsal, any production application, and the D3 decision are pending the owner.
