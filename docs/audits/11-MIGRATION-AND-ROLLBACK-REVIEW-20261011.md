# Migration and rollback review — Supabase reconciliation phase

Two new migrations. Both are additive, idempotent, tolerant of hosted drift, and were applied **only** to disposable local PostgreSQL 16. **Not applied to staging or production. No historical migration was edited.**

| Verification | Result |
|---|---|
| Full replay from an empty database, plain | `applied=175 failed=0` |
| Full replay with Supabase default privileges (`SUPABASE_DEFAULT_PRIVILEGES=1`) | `applied=175 failed=0` (`evidence/certification-20261011/migration-chain/`) |
| Re-apply each new migration on top of itself | OK (`reapply_new_migrations.txt`) |
| `scripts/validate-supabase-migrations.mjs` | PASS — 175 files, 175 unique versions (`validate_supabase_migrations.txt`) |
| Harness `apply_chain.sh` correctness | **fixed in this phase**: it judged success by grepping psql output for ERROR/FATAL, so a stopped PostgreSQL ("connection … failed") counted as *applied*; it now uses psql's exit status and fails fast if the database cannot be created |

## 1. `20261011120000_client_role_least_privilege.sql`
| Change | Why (evidence) | Risk |
|---|---|---|
| `ALTER POLICY … USING ((SELECT public.is_admin()))` on 14 SELECT policies that granted `authenticated` `USING (true)` (governance, risk, releases, experiments, improvements, ideas, war rooms, …) | `m10` before: an `authenticated` JWT with any `sub` read `governance_policies` / `risk_assessments` | none for the application (the API uses `service_role`, which bypasses RLS); Supabase-Auth admins keep read access (`m10` #11) |
| `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` on every public **trigger** function and on `refresh_inspection_provider_starting_price(uuid)` | 23 functions remained client-executable under hosted default privileges (`m10` #3 before) | triggers still fire for `service_role` (`m10` #10: ledger immutability + `updated_at`); `service_role`/`postgres` keep EXECUTE |
Each step checks existence first (works when hosted objects differ).
**Rollback:** `ALTER POLICY <name> ON public.<table> USING (true);` for the 14 policies (list in the migration) and `GRANT EXECUTE ON FUNCTION <fn> TO anon, authenticated;` for the revoked functions. Rolling back re-opens RLS-1 — not recommended.

## 2. `20261011121000_profiles_role_sync_repair.sql`
| Change | Why | Risk |
|---|---|---|
| `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()` | `trg_profiles_updated_at` sets `NEW.updated_at`; the column never existed → **every UPDATE of profiles failed** | additive; default fills existing rows; brief `ACCESS EXCLUSIVE` lock on `profiles` (PG ≥ 11: no table rewrite for a constant default — `now()` is evaluated once) |
| `sync_profile_role_from_user()` + `AFTER UPDATE OF role ON users` trigger | the foundational migration documents that `profiles.role` mirrors `users.role` (authority), but only an INSERT trigger existed → promotions/demotions never reached `profiles`, and `is_admin()` (RLS) kept demoted admins as admin | the function is `SECURITY DEFINER`, `search_path` pinned, EXECUTE revoked from client roles; the role CHECK sets of both tables are identical |
| one-time `UPDATE profiles SET role = users.role WHERE they differ` | realign existing drift to the documented authority | **data change** — run `PREFLIGHT_FINANCIAL_AND_ROLE_STATE.sql` first (counts `profiles_role_mismatch`, `profiles_role_admin_but_user_not_admin`) |
**Rollback:** `DROP TRIGGER trg_sync_profile_role_from_user ON public.users; DROP FUNCTION public.sync_profile_role_from_user();` (the `updated_at` column can stay; dropping it re-breaks every profiles update). The realignment cannot be "undone" without a snapshot — take one if the preflight shows mismatches: `create table profiles_role_backup_20261011 as select id, role from profiles;` (operator, before applying).

## 3. Previously added migration (security sweep) — re-reviewed
`20261011100000_chat_message_outbox.sql`: still applies cleanly and re-applies idempotently; with Supabase default privileges its explicit `REVOKE` leaves `anon`/`authenticated` without access to the table and functions (`m10` #9, `m8` #9). Rollback unchanged (`docs/audits/06-MIGRATION-AND-ROLLBACK-REVIEW-20261011.md`).

## 4. Deploy order
1. Run the read-only preflights in **staging**: `INVENTORY_SCHEMA_SECURITY.sql` (compare with `scripts/supabase-reconcile.mjs`), `PREFLIGHT_MISSING_SCHEMA_OBJECTS.sql`, `PREFLIGHT_FINANCIAL_AND_ROLE_STATE.sql`.
2. Apply to staging **all pending repository migrations in order** (production is 52 behind, see §6), including `20261011100000`, `20261011120000`, `20261011121000`. `supabase db push` works only once the 38 hosted-only versions are present locally.
3. Deploy the backend (security-payment store, fieldMap aliases, command-center notification fix). This phase's code does not need the two new migrations. The **current backend as a whole does need** the earlier pending migrations (outbox, idempotency, `users.deactivated_at`, auction tables), so it must not be deployed to a production database still at 2026-09-22.
4. Run the staging checklist (`17-…`). Production only after sign-off, by the owner.

## 5. Explicitly not done
No `transactions` table, no `config_*`/`disputes`/`error_budgets`/governance tables were created (contracts unknown, hosted state unknown — see `08-…`). No change to `supabase_realtime` publication, cookie flags, default privileges, Cloudinary settings.


## 6. Hosted reality (production read-only, 2026-10-11) — consequences for deployment
* Production's last migration is `20260922060457`, and **52 repository migrations are newer**. The 3 from this phase and the outbox migration are among them. They depend on earlier repository objects (for example the auction tables from 20261002193000), so they **cannot be cherry-picked**: the 52 must be applied in order.
* Production has **38 versions with no repository SQL** (2026-09-19 → 22: `p0a_*`, `phase4`–`phase22_*`, `v14_*`, `*_effect_capture_*`). Statement digests are in `evidence/hosted-readonly-20261011/production-migration-statement-digests.tsv`. `supabase db push` refuses while they are missing locally. Running `supabase migration repair --status reverted` on them would rewrite history and is **not** recommended.
* 5 older repository migrations are not in production by name (`20260908070000`, `20260908080000`, `20260908113000`, `20260920203000`, `20260920220000`). A push would apply them. Diff each one against production on the staging clone first; their effects may already be present through the hosted reconcile/effect-capture migrations.
* Safe route (owner, staging first):
  1. Clone production schema-only into staging (`supabase db dump --schema-only` from production, restore into a staging project), so staging starts as production, not as the repository.
  2. Export the 38 hosted migrations (`supabase migration fetch`, or read `statements` from `supabase_migrations.schema_migrations`), review them for embedded configuration, and commit them under their production versions **without editing historical files**.
  3. On staging, run the 5 unmatched and 52 newer migrations in version order, one transaction each, recording failures.
  4. Run `INVENTORY_SCHEMA_SECURITY.sql` + `supabase-reconcile.mjs`, then checklist `17-…`.
  5. Rehearse rollback for 20261011120000/121000 (§1–§2).
  6. Production in a change window, then deploy the backend.
* None of this was executed: no migration was applied to any hosted project.
