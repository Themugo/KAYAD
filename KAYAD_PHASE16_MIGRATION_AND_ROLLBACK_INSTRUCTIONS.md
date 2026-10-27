# KAYAD Phase 16 — Migration and rollback instructions

**Nothing here has been applied to any shared/hosted database.** Both items are *candidates* kept outside `supabase/migrations` so that nothing runs them by accident.

## Candidates (apply in this order, only after the hosted drift is reconciled)
| # | File | Purpose | Rollback |
|---|---|---|---|
| 1 | `runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql` | owner memberships, invitations, append-only events, atomic functions (**second-owner capability**) | `…_ROLLBACK_CANDIDATE.sql` (export `owner_membership_events` first) |
| 2 | `runbooks/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_CANDIDATE.sql` | `owner_mfa_factors`, `owner_mfa_recovery_codes` (RLS on, service-role only, no policies) | `…_ROLLBACK_CANDIDATE.sql` (drops only those two tables) |

Both are idempotent, additive, touch no existing table, and are `BEGIN/COMMIT` wrapped.

## Preconditions (hosted)
1. The migration-history drift (38 hosted-only / 63 repo-only) is reconciled and `KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized` is deliberately set — `scripts/apply-schema.sh` refuses otherwise.
2. Run `MIGRATION_PREFLIGHT_READONLY_5B.sql` (read-only) first.
3. Environment: `WEBHOIST_EMAIL` (designated owners), `OWNER_MFA_ENCRYPTION_KEY` (`openssl rand -base64 32`; store it in the secret manager and back it up), optional `OWNER_MFA_POLICY`.
4. Take a backup / PITR marker.

## Order of operations
1. Apply candidate 1 → the registry switches to *database* mode only when the functions exist. Existing designated owners keep working until memberships exist.
2. `npm run owner:bootstrap -- --plan`, then `--apply …` (runbook §1); each owner accepts the e-mailed link.
3. Apply candidate 2 → owners can enrol from **Admin → Owners → Your two-factor sign-in**. Until the tables exist the service reports “not installed” and sign-in is unchanged.
4. Optionally raise `OWNER_MFA_POLICY` to `required` after both owners are enrolled.

## Rollback
* Candidate 2 rollback: drops the MFA tables → owners can sign in with password only again (nothing else depends on them). Re-applying later requires re-enrolment.
* Candidate 1 rollback: see `GATE_ROLLBACK_AND_RECOVERY_PLAN_5B.md` (memberships do not come back; run bootstrap again).
* Application rollback: redeploy the Phase 15 build; it ignores both sets of tables.

## Rehearsal evidence (disposable PostgreSQL 16, repo migrations fully replayed — 0 failures, 208 tables)
| Check | Result | Log |
|---|---|---|
| Stage 5B owner governance (apply, privileges, constraints, atomic functions) | **97 pass / 0 fail** | `evidence/phase16-20261026/owner_governance_pg_checks.txt` |
| Stage 5B upgrade + rollback | **15 pass / 0 fail** | `…/owner_governance_pg_upgrade_rollback.txt` |
| Phase 16 MFA migration: fresh install on the Phase 15 schema, idempotent re-apply, RLS/privileges (anon/authenticated none), constraints, cascade, rollback + rollback idempotency | **23 pass / 0 fail** | `…/owner_mfa_pg_checks.txt` |
| Dealer/owner separation dry run | **10 pass / 0 fail** | `…/dealer_separation_dryrun.txt` |

## Supabase compatibility needed to replay the repo on plain PostgreSQL
Publication `supabase_realtime`, function `public.rls_auto_enable()`, extensions `uuid-ossp`, `pg_trgm`, `citext`, `pgcrypto` (`runbooks/phase16-20261026/supabase_shim.sql`, `build_full_schema.sh`). On hosted these exist natively.
