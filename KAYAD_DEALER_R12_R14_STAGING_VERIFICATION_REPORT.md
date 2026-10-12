# R12 / R14 Migration — Staging Verification Report

**Status: production is NOT fixed.** Both migrations are drafted, confirmed correct against the application code, and verified end-to-end against an isolated staging database. Neither has been applied to your live Supabase project ("KAYAD EA", `ubvgixwhfybbyjuvxboj`). No connection to that project's data was made or attempted anywhere in this work — every verification step below ran against a separate, disposable local database with no production data in it. **This mission's standing rule — never touch production without your explicit authorization — remains in force; nothing here changes that.**

## 1. Why a real Supabase branch wasn't used

The brief asked for an isolated or staging database, and I first tried the direct route: Supabase's own branching feature (`mcp__Supabase__create_branch`), which creates a schema-only clone with its own project, no production data copied — exactly what was wanted. It returned `{"status":"cancelled"}` twice in a row, with no branch created either time (confirmed via `list_branches`). This session's Supabase CLI / Docker-based local stack (`supabase start`) also isn't usable here — Docker's client is present but its daemon can't start in this sandbox (`ulimit: Operation not permitted`).

**Substitute used instead:** a disposable local PostgreSQL 16 instance (already installed in this environment), with the `dealers` and `dealer_verifications` tables rebuilt exactly as documented in `KAYAD_DEALER_ONBOARDING_STATE_MACHINE.md` §1 (column-for-column, including the original, unfixed CHECK constraint) — this is a faithful schema replica, not a guess. It has zero network path to your production project. This gets you a real, isolated verification of the DDL and the exact writes your application code issues, but it is **not** a full Supabase stack — no PostgREST, no `auth.*` schema, no RLS enforcement layer. Section 6 below says exactly what that means is and isn't covered.

**If you want a true Supabase-branch staging run before production** (closer to your real environment, including RLS), either retry branching yourself from the Supabase dashboard (Project → Branches), or ask me to retry `create_branch` in a future session — it may simply need you to confirm/approve it on your end, or your org's plan may not have branching enabled.

## 2. Exact migration SQL

Both files are committed to `supabase/migrations/` in your repo.

**R12 — `supabase/migrations/20261012140000_dealer_onboarding_columns_r12.sql`:**
```sql
BEGIN;

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMIT;
```

**R14 — `supabase/migrations/20261012140100_dealer_verification_suspended_status_r14.sql`:**
```sql
BEGIN;

ALTER TABLE dealer_verifications
  DROP CONSTRAINT IF EXISTS dealer_verifications_verification_status_check;

ALTER TABLE dealer_verifications
  ADD CONSTRAINT dealer_verifications_verification_status_check
  CHECK (verification_status IN ('pending','approved','rejected','suspended'));

COMMIT;
```

Both differ from the versions first drafted in Phases 3/4-5 only in being made explicitly rerun-safe (`DROP CONSTRAINT IF EXISTS` added to R14; R12 already used `ADD COLUMN IF NOT EXISTS`) and wrapped in an explicit transaction. Neither alters, narrows, or drops any existing column, constraint, or row.

## 3. Confirmation against application code (not just assumed)

| Migration field/value | Confirmed against | Match |
|---|---|---|
| `bio TEXT` | `validation/dealerOnboarding.schema.js`: `bio: z.string().trim().max(2000).optional()` | ✅ string, nullable |
| `payment_details JSONB` | `validation/dealerOnboarding.schema.js`: `paymentDetails: paymentDetailsSchema` (a validated object) | ✅ object/JSON |
| `onboarding_complete BOOLEAN NOT NULL DEFAULT false` | `backend/routes/dealerRoutes.js`: `onboardingComplete: true` on success; `previousDealer.onboardingComplete ?? false` on rollback | ✅ boolean, safe default |
| `onboarding_completed_at TIMESTAMPTZ` | `backend/routes/dealerRoutes.js`: `onboardingCompletedAt: new Date().toISOString()` | ✅ timestamp, nullable |
| `'suspended'` added to the CHECK | `backend/services/dealerVerificationService.js`: `VERIFICATION_STATUSES = ["pending","approved","rejected","suspended"]` — exactly 4 values, exactly matching the migration's new allowed list, confirmed no code path writes any 5th value (`'under_review'` is read-only/filter-only everywhere in the codebase, never written to this column) | ✅ exact match, nothing over- or under-permissive |

This cross-check is now also enforced by a new, permanent regression test: `backend/tests/regression/dealerOnboardingSuspendSchemaReconciliation.test.js` (9 assertions, all passing) — if `VERIFICATION_STATUSES` or the onboarding field list ever changes without the matching migration being updated, this test fails CI rather than failing silently in production the way both original defects did.

## 4. Staging results (isolated local Postgres, zero production contact)

| Step | Result |
|---|---|
| Rebuild exact live pre-fix schema (`dealers`, `dealer_verifications`, original 3-value CHECK constraint) | Done, seeded with one realistic approved-dealer row |
| Reproduce R12: run the exact onboarding-completion write the app issues | **FAILED as expected**: `ERROR: column "bio" of relation "dealers" does not exist` — identical to the live error already confirmed in Phase 3 |
| Reproduce R14: run the exact suspend write the app issues | **FAILED as expected**: `ERROR: new row for relation "dealer_verifications" violates check constraint "dealer_verifications_verification_status_check"` — identical to the live error already confirmed in Phase 4-5 |
| Apply `20261012140000_dealer_onboarding_columns_r12.sql` | `BEGIN / ALTER TABLE / COMMIT` — no errors |
| Apply `20261012140100_dealer_verification_suspended_status_r14.sql` | `BEGIN / ALTER TABLE / ALTER TABLE / COMMIT` — no errors |
| Re-run the identical onboarding write | **SUCCEEDED**: `UPDATE 1` |
| Re-run the identical suspend write | **SUCCEEDED**: `UPDATE 1` |
| Re-apply both migrations a second time (rerun-safety check) | Both report "already exists, skipping" / clean re-apply, **no errors, no data loss** — existing row's data (`bio`, `payment_details`, `onboarding_complete`, `verification_status`, `suspension_reason`) confirmed intact afterward |
| Negative test: write an arbitrary invalid status (`'bogus_status'`) | **Correctly REJECTED** — confirms the fix is exactly scoped, not loosened beyond the 4 real values |
| Reinstate transition: `suspended → approved` (both `dealer_verifications.verification_status` and `dealers.approved`/`is_suspended`/`suspension_reason`) | **SUCCEEDED** — full round trip works |
| New regression test (`dealerOnboardingSuspendSchemaReconciliation.test.js`) | 9/9 passed |
| Full backend test battery (Jest + Vitest + node:test), after adding the new test | 80 suites/1168 Jest tests + 5 files/16 Vitest tests + 1 node:test — **all passing** (was 79/1159 before; the +1 suite/+9 tests is exactly the new file, zero regressions) |
| Full frontend test battery | 81 files/643 tests passed, 1 pre-existing skip — **no regressions** |
| `tsc --noEmit`, `vite build` | Both clean |
| `validate:supabase-migrations`, `validate:migration-hygiene` | Both PASS against the full 181-file migration set including the two new files |

## 5. Production preflight checklist (complete before applying, when authorized)

1. **Get explicit authorization from the user** (James) to proceed — not yet given as of this report. Nothing in this checklist should be executed without that.
2. **Take a fresh backup/snapshot of the production database** immediately before running anything (see §6 — this is the recovery point if anything is wrong).
3. **Confirm the target**: run `mcp__Supabase__get_project` (or the dashboard) and visually confirm the project ref is `ubvgixwhfybbyjuvxboj` ("KAYAD EA") and nothing else — never run a migration against a project you haven't just looked at and named out loud.
4. **Re-confirm current live state immediately beforehand** (read-only, via `information_schema.columns` for `dealers` and `pg_get_constraintdef` for the `dealer_verifications` CHECK) — to catch any drift since Phase 3/4-5's original read, since time has passed and other work may have touched the schema.
5. **Apply R12 first, then R14**, each as its own migration (already the case — two separate files), so if anything unexpected happens the failure is isolated to one change.
6. **Immediately after each migration**, re-run the same read-only confirmation queries to prove the column/constraint now exists as expected — do not just trust the "no error" output.
7. **Smoke-test one real, low-stakes write** through the actual application (not raw SQL) for each: submit one real onboarding completion (or use a test/staff account if one exists) and perform one real suspend+reinstate cycle through the admin UI — to catch anything the staging replica couldn't (RLS policy behavior, PostgREST-level quirks, trigger side effects) before declaring it fixed for all dealers.
8. **Only after step 7 passes** is it accurate to update the gap register's R12/R14 status to RESOLVED-IN-PRODUCTION.
9. **Monitor logs for the next real dealer onboarding submission and the next real admin suspend action** for the first 24-48 hours after deployment, specifically watching for any Postgres error referencing these two tables/columns.

## 6. Backup / recovery plan

- **Before applying anything to production**: take an explicit, timestamped backup/snapshot of the `dealers` and `dealer_verifications` tables at minimum (a full database snapshot is safer and simpler if your plan supports point-in-time recovery or on-demand backups — check your Supabase project's Database → Backups settings). Supabase Pro+ projects have daily automated backups and point-in-time recovery; confirm what tier this project is on and what recovery window it gives you, since that determines how much of a safety net already exists versus how much you need to create manually right before the change.
- **Rollback for R12** (if something goes wrong): `ALTER TABLE dealers DROP COLUMN IF EXISTS bio, DROP COLUMN IF EXISTS payment_details, DROP COLUMN IF EXISTS onboarding_complete, DROP COLUMN IF EXISTS onboarding_completed_at;` — safe, since nothing else in the schema depends on these columns (confirmed: they didn't exist before this migration, so nothing can be depending on them other than the onboarding route this fix enables). Any data written into them between apply and rollback is lost — this is why step 7 of the preflight (smoke test, not silent trust) matters.
- **Rollback for R14** (if something goes wrong): `ALTER TABLE dealer_verifications DROP CONSTRAINT IF EXISTS dealer_verifications_verification_status_check; ALTER TABLE dealer_verifications ADD CONSTRAINT dealer_verifications_verification_status_check CHECK (verification_status IN ('pending','approved','rejected'));` — reverts to the original 3-value constraint. **Caveat**: if any row was written with `verification_status = 'suspended'` between apply and rollback, this rollback will itself fail with the same constraint-violation error until those rows are first updated back to an allowed value — check for `SELECT count(*) FROM dealer_verifications WHERE verification_status = 'suspended'` before rolling back, and decide what those rows should become (most likely `'approved'` with `is_suspended` cleared, i.e. a manual reinstate) rather than silently forcing them to `'pending'`.
- **If a full restore is ever needed**: use Supabase's project-level restore (dashboard → Database → Backups → restore to a point in time, or restore from a specific backup), not a manual table-level `DELETE`/`INSERT` reconstruction — safer and auditable.

## 7. Remaining risks (disclosed, not resolved by this verification)

1. **RLS was not exercised in this staging run.** The local Postgres replica has no RLS policies at all (they weren't ported, since the point was to test the column/constraint fix, not re-audit RLS). R11's finding (no `authenticated`/`anon` base GRANT on these tables, so RLS policy text is currently moot) still holds and isn't affected by either migration — neither adds a GRANT or a policy — but this staging run is not independent evidence of that; it relies on the live-database read done in Phase 4-5.
2. **PostgREST-layer behavior wasn't exercised.** Supabase's actual request path goes through PostgREST, not raw SQL. A column-name or type edge case specific to how PostgREST serializes `JSONB` or `TIMESTAMPTZ` over the REST API wasn't tested here — low risk (these are standard, common types used identically elsewhere in this schema), but not zero, which is exactly what preflight step 7 (smoke-test through the real app) is for.
3. **No real Supabase branch was used**, for the infrastructure reasons in §1 — this is the single biggest gap between this verification and your actual production environment. If branching becomes available, re-running this exact verification there before the next production change would close this gap.
4. **Concurrent writes during the migration window weren't tested.** Both migrations run in well under a second against an empty-ish table; on production, if a dealer is mid-submission or an admin is mid-suspend action at the exact moment the migration runs, Postgres's normal DDL-vs-DML locking behavior applies (the `ALTER TABLE` will briefly wait for or block concurrent writes to that table) — standard for an additive migration like this, but worth choosing a low-traffic moment rather than peak hours.
5. **This report's "staging" is a substitute, and says so.** I am not claiming production is fixed, and the gap register's R12/R14 entries have been updated to explicitly say so. Nothing in this delivery should be read as implying otherwise.

## 8. What I need from you

Say the word (or reply to either earlier `SendUserMessage`) and I will:
1. Confirm the target project one more time out loud before doing anything.
2. Ask you to confirm a backup exists (or take one via the Supabase dashboard yourself, since this session doesn't have write access to your billing/backup settings).
3. Apply R12, confirm, apply R14, confirm — each as its own step, reporting back before moving to the next.
4. Ask you (or a staff account) to do the two real-app smoke tests in preflight step 7.
5. Only then mark R12/R14 as RESOLVED-IN-PRODUCTION in the gap register.

Until you say so, both remain exactly as they are today: broken in production, fixed and verified in staging, migrations ready and waiting in your repo.
