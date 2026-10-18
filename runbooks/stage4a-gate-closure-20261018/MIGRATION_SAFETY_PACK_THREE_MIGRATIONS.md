# KAYAD Stage 4A — Safety pack for the three flagged pending migrations (2026-10-18)

**Status: NOT EXECUTED on any hosted database.** Disposable-database evidence only (PostgreSQL 16.15, own cluster, unix socket, synthetic data, database names `rehearsal4a*`; logs in `evidence/stage4a-20261018/`). Do not use `supabase db push --include-all`. Do not infer the hosted schema from the 2026-10-11 catalog report; the preflight SQL reads the real target.

Assets (all outside `supabase/migrations/`):
- `02_READONLY_PREFLIGHT_PENDING_THREE_MIGRATIONS.sql` — SELECT-only, counts only, no personal data.
- `03_READONLY_POSTVERIFY_PENDING_THREE_MIGRATIONS.sql` — SELECT-only, each check states its expected value.
- Earlier assets: `../stage4-rehearsal-20261018/` (identity preflight, G2 candidate, migration runbook), `../ONBOARDING_V2_*`, `../ONBOARDING_V3_*`.

## Correction to the Stage 4 report
Stage 4 said `20260930110000` "ends sessions". That was wrong. The migration backfills `token_hash = sha256(token)` (identical to `models/RefreshToken.js hashToken`) **before** dropping `token`, so live sessions survive (disposable run: 20 live sessions before, 20 after). What is irreversible is the loss of the plaintext column. What can fail is `SET NOT NULL` on rows that have neither a token nor a hash (disposable run: the whole migration aborts and rolls back when applied in one transaction, table unchanged), or the unique index if tokens collide.

## Common requirements (all three)
1. Target identified as the approved staging branch or a restored copy (preflight section 0). Never an unidentified host.
2. Verified backup, restore tested into a disposable database; record row counts of `users`, `profiles`, `refresh_tokens` before and after restore.
3. Apply each migration in its own session, in a single transaction (`psql -1`), with `lock_timeout` and `statement_timeout` set, one at a time, stopping at the first error.
4. Capture preflight → apply output → postverify as evidence. No emails, tokens or hashes in evidence.
5. Application deploy order: the Stage 4A backend does not depend on these three; the pre-existing backend already requires `token_hash` (`RefreshToken.js`), so `20260930110000` must be applied before any backend that no longer reads `token`.

## M1 — 20260930110000 advanced identity/session hardening  (DESTRUCTIVE / IRREVERSIBLE: DROP COLUMN token)
| | |
|---|---|
| Data impact | Adds columns; hashes every existing token; fills `family_id`/`session_id`; unique index on `token_hash`; `token_hash NOT NULL`; **drops `token`**; creates `kayad_rotate_refresh_token` (definer, `search_path=public`, execute only for `service_role`); enables RLS. |
| Preflight | `02` section A: shape (A1), population and unusable rows (A2), collisions (A3). |
| Expected | `rows_with_neither_token_nor_hash = 0`, `duplicate_plaintext_tokens = 0`, `duplicate_existing_hashes = 0`. |
| Abort | Any non-zero above (the migration would fail, or lose data). Do **not** delete rows from the script; owner decides about unusable rows. No verified backup ⇒ no apply. |
| Post-verify | `03` A1–A7: token column gone, `token_hash` NOT NULL and uniquely indexed, no NULL family/session, rotate function privileges exactly as stated, RLS on, live-session count equals the preflight value. |
| Rollback | Not possible for the plaintext column. Restore from backup. Everything else can be dropped manually. Sessions: users keep working (hash was backfilled); if a rollback to a backend that reads `token` is needed, those sessions end. |

## M2 — 20261008120000 escrow seller capability authority
| | |
|---|---|
| Data impact | Adds four columns, a CHECK constraint (validates all `users` rows under ACCESS EXCLUSIVE), an index, and **sets `escrow_capability_status='granted'` for every `individual_seller` still at `none`**, with reason "Stage 9 backfill". The migration states this preserves the former role-hardcoded eligibility; it is nonetheless a bulk grant of a money-handling capability. |
| Preflight | `02` section B: columns (B1), exact population including banned/deactivated and legacy flags (B2), invalid existing values (B3). |
| Expected | `will_become_granted` equals the number the owner expects to keep eligible; `invalid_existing_status = 0`. |
| Abort | Population differs from the owner's expectation; any invalid value; large `users` table in a busy window (lock). |
| Post-verify | `03` B1–B5: valid values, granted count equals preflight, backfill-reason rows equal preflight, **no non-seller role granted**, index present. |
| Rollback | Constraint/index/columns can be dropped; the grants are reversible by `UPDATE … SET escrow_capability_status='none' WHERE escrow_capability_reason LIKE 'Stage 9 backfill:%'` (run only on explicit authorization). |
| Owner decision | D14: approve the population (including banned/deactivated sellers) or replace the backfill with an explicit allow-list. |

## M3 — 20261011121000 profiles.role sync repair
| | |
|---|---|
| Data impact | Adds `profiles.updated_at`; definer trigger `sync_profile_role_from_user` (`search_path=public, pg_temp`); **overwrites `profiles.role` with `users.role` for every mismatch**. RLS policies read `profiles.role`, so this can **raise** (profile gains admin) or **lower** (profile loses admin) database-level privilege. |
| Preflight | `02` section C: pairs (C1), privilege direction (C2), coverage and constraint compatibility (C3). |
| Expected | Only the pairs the owner already knows about. `diffs_whose_target_violates_profiles_role_check = 0`. |
| Abort | Any unexpected pair; `profile_gains_admin_rls > 0` without owner sign-off for each; constraint-violating targets. |
| Post-verify | `03` C1–C5: zero mismatches, trigger present, function privileges, `updated_at`, admin-like population equals the approved list. |
| Rollback | Not exactly reversible (previous `profiles.role` values are overwritten): **save the C1 pair list and a role snapshot of the affected ids in the backup before applying.** The trigger is droppable. |
| Not repaired | `users` rows without a `profiles` row stay without one until their role changes (preflight `users_without_profile`). |

## Order and independence
The three are independent of each other and of the rest of the pending set (dependency analysis: 0 inversions). Recommended order if all are approved: M1 → M3 → M2 (session integrity first, privilege reconciliation second, capability grant last), each with its own post-verify before the next.

## G1 — approved sequence for the canonical `rejected` listing status (requires D3 = approved)
1. Preflight (`../stage3-database-contract-20261018/01_READONLY_PREFLIGHT_G1_G2_G3.sql` G2-a/b and `../stage4-rehearsal-20261018/01_…` C1) on the approved target: live `cars_status_check` definition; **no** row outside the new list.
2. Verified backup.
3. Run `../stage4-rehearsal-20261018/03B_G2_CANDIDATE_cars_status_rejected_LOW_LOCK_NOT_APPLIED.sql` step by step (ADD … NOT VALID → VALIDATE → swap), each in its own short transaction.
4. Post-verify: `convalidated = true`, a `rejected` write succeeds on a throwaway row in the rehearsal copy, `hidden`/`sold` transitions unchanged.
5. Only then promote the candidate into `supabase/migrations/` as a new timestamped file through the project's normal review. Until then the three `rejected` writers (admin moderation, duplicate removal, report queue) fail with a constraint violation against a database built from the repository.
Rollback considerations: valid only while no row has `status='rejected'` (see the candidate's header).
