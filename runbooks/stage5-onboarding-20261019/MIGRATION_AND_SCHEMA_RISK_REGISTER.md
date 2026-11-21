# Migration and schema-risk register (Stage 5)

**Stage 5 added no migration.** The owner policy uses the existing `system_settings` table. Nothing was added to `supabase/migrations`; no unapproved candidate is in the active chain.

## Evidence obtained on a disposable local PostgreSQL 16.15 (loopback only; never a shared database)
| Check | Result | File |
|---|---|---|
| Replay of all 181 migrations in order on an empty database (with a local Supabase stand-in: roles, `auth` schema, realtime publication, `rls_auto_enable` stub) | **181 applied, 0 failed** | `evidence/stage5-20261019/pg/replay_summary.txt` |
| Atomic registration function: roles, status, duplicates (case/space), orphan rollback, privileges, concurrency | 18 checks pass | `pg/pg_checks.log` (A1–A8) |
| `system_settings` as the policy store: unique key, compare-and-swap under a real row lock, anon/authenticated denied | 9 checks pass | `pg/pg_checks.log` (B1–B8, with B5b) |
| `cars_status_check` | does **not** include `rejected` (D3 still gated) | `pg/pg_checks.log` (C1) |
| Candidate 03B on a **copy** of the disposable DB | applies; constraint becomes valid and includes `rejected`; re-run leaves exactly one constraint | `pg/candidate_03B_rehearsal.log` |
| Duplicate indexes (identical definitions) | 5 pairs | `pg/duplicate_indexes.txt` |
Limits of this evidence: the stand-in is not Supabase; PostgREST/RLS-through-API behaviour, the hosted schema and data volume were **not** tested.

## Findings
| ID | Item | Risk | Disposition |
|---|---|---|---|
| M1 | `system_settings`: RLS enabled, **no policies**, grants only to `service_role` in the final chain (earlier migrations created public read; later hardening removed it) | Low. Backend uses the service role, so it works; policy values are not publicly readable | Verified on replay. Also verify on the hosted DB (checklist 5) |
| M2 | Duplicate unique indexes: `dealers(user)` ×2, `user_auth(user_id)` ×2, `inspection_providers(user_id)` ×2, `inspection_transactions(reference)` ×2, plus one non-unique pair on `support_tickets` | Low (write overhead, noise). Dropping needs a reviewed migration | **Not changed.** Candidate cleanup, owner approval |
| M3 | `user_auth.email_verify_token` has a non-unique index; tokens are 256-bit random hashes | Negligible collision risk; lookups remain indexed | None |
| M4 | `users` has both `users_email_key` (exact) and `uq_users_email_normalized` (`lower(btrim(email))`) uniques | Good: case/space variants cannot duplicate (tested) | None |
| M5 | `cars_status_check` excludes `rejected` (D3) | Single-listing reject fails at the database | Candidate 03B (low-lock, three short steps, idempotent in rehearsal) — **requires explicit authorization; not applied** |
| M6 | Registration function missing in a target environment | Registration returns a stable "migration required" error (existing) | Deployment gate: checklist 5/6; recovery = apply `20261001090000_registration_onboarding_integrity.sql` through the normal migration flow after approval |
| M7 | Verification-token storage is `user_auth.email_verify_token` (hash) + `email_verify_expire` | OK; one valid token per user | None |
| M8 | Dealer approval state is `dealer_verifications.verification_status` + `dealers.approved` + `users.status`, written by separate statements (no single transaction) | Medium: partial failure can leave the three out of step. Mitigated by a conditional update on the verification row first, and by consistent writes on all approval endpoints | Longer-term: one database function per decision (already recommended as D9 option B/C) |
| M9 | Gated migrations from earlier stages (escrow capability backfill D14, role reconciliation D15) | See decision register | Unchanged |
| M10 | Migration filenames/ordering: 181 files replay in lexical order without error | OK on a clean database. A database that already holds a partial/different history was not tested | Staging rehearsal below |

## Sequence and preflight for an approved staging rehearsal (not executed here)
1. Identify the target by URL/project ref and confirm it is the approved staging project; take a backup and record the id.
2. Run `runbooks/stage4-rehearsal-20261018/01_READONLY_IDENTITY_LIFECYCLE_PREFLIGHT.sql` (read-only); save output.
3. `supabase migration list` → expect the repository chain; apply only pending *active-chain* files in order.
4. Run the real-PostgreSQL checks: `PGHOST=<host> ./runbooks/stage5-onboarding-20261019/disposable-pg/20_onboarding_pg_checks.sh <db>` — the script **refuses** non-loopback hosts and database names not ending `_disposable`; for staging, copy the SQL statements and run them by hand against test rows only.
5. Only with a separate go-ahead, apply 03B (three steps), then re-run C1 (expect `rejected` included).
6. Rollback: 03B has a documented rollback in its header; configuration rollback is the Settings page.
