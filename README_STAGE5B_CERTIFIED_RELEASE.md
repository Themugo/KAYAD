# KAYAD — Stage 5B owner-governance certified release (full project)

**Package:** `KAYAD-STAGE5B-OWNER-GOVERNANCE-CERTIFIED-FULL-PROJECT-20261019.zip` — a *complete* project (frontend, backend, config, lockfiles, 181 Supabase migrations, tests, validators, fixtures, runbooks). It is not a changed-files package.

## Foundation
* Stage 5A foundation: `KAYAD-STAGE5A-LAUNCH-GATE-CLOSURE-FULL-PROJECT-20261019.zip`, sha256 `8aacd7db95b94085c1836f5e98e2bc33ccfc41fb1504d55f9163adc86d0c13fc` (re-verified against the file at closure).
* Stage 5B input: `KAYAD-STAGE5B-MULTI-OWNER-GOVERNANCE-FULL-PROJECT-20261019.zip`, sha256 `1b2bf64fbdde18f22476664d978842a7e78403d45d8136dced5d975c42fce03a` (unchanged; the owner committed it as `88d6813f` on branch `stage5b-multi-owner-governance`).
* This release = 5B + the closure corrections in `runbooks/stage5b-owner-governance-20261019/DEFECT_LEDGER_5B_CLOSURE.md`. The working tree has no `.git`; the Windows tree was **not** reachable and was not inspected.

## What this release is not
The migration `migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql` is **NOT APPLIED** anywhere shared and **NOT APPROVED**. Neither `kayadautomotives@gmail.com` nor `jimmythemugo@gmail.com` is claimed to be an active, verified or controlled owner account; they are designated identities only. No hosted system, e-mail provider or production secret was touched. Production readiness is **not** claimed.

## Build requirements
Node 22.x, npm 10.x. No `.env` is shipped; copy `*.env.example` and fill disposable values for local runs. `node_modules` is excluded (run `npm ci` in the root and in `backend/`).

## Validation commands
```
npm ci && (cd backend && npm ci)
npx tsc --noEmit
npm run build
npx vitest run
cd backend && npm run test:jest && npm run test:vitest && npm run test:node
bash evidence/stage5b-20261019/run_all.sh "$PWD" /tmp/kayad-run     # everything above + validators
```
Owner-governance PostgreSQL checks (disposable local PG only; the script refuses non-loopback hosts and databases not ending `_disposable`):
```
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres bash runbooks/stage5b-owner-governance-20261019/pg-tests/owner_governance_pg_checks.sh <base>_disposable <abs path to candidate.sql> <log>
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres bash runbooks/stage5b-owner-governance-20261019/pg-tests/owner_governance_pg_upgrade_rollback.sh <base>_disposable <candidate.sql> <rollback.sql> <log>
```
(`<base>_disposable` = a database with the repository's migrations replayed; see `pg-tests/`.) The real-stack journeys under `evidence/stage5b-20261019/journeys/` document the local harness (PostgREST + prefix proxy + Brevo capture stub).

## Where things are
| Item | Path |
|---|---|
| Runbooks (bootstrap, management, recovery) | `runbooks/stage5b-owner-governance-20261019/` |
| Closure audit (15 invariants) | `…/STAGE5B_CLOSURE_AUDIT_REPORT.md` |
| Defect ledger | `…/DEFECT_LEDGER_5B_CLOSURE.md` |
| Authorization matrix / decision register | `…/AUTHORIZATION_MATRIX_5B.md`, `…/OWNER_DECISION_REGISTER_STAGE5B.md` |
| Test evidence matrix | `…/TEST_EVIDENCE_MATRIX_5B.md` |
| Hosted prerequisites / preflight / rollback | `…/HOSTED_SCHEMA_PREREQUISITES_5B.md`, `…/MIGRATION_PREFLIGHT_READONLY_5B.sql`, `…/GATE_ROLLBACK_AND_RECOVERY_PLAN_5B.md` |
| Unresolved blockers | `…/UNRESOLVED_BLOCKERS_5B.md` |
| Closure report | `KAYAD_STAGE5B_CLOSURE_CERTIFICATION_REPORT_20261019.md` |
| Manifest (per-file SHA-256) | `KAYAD_STAGE5B_CERTIFIED_SHA256_MANIFEST_20261019.txt` |

## Excluded local state
`.git`, `node_modules`, `dist`, `logs`, coverage and test-result folders, `uploads.sqlite*` (local data, never packaged), and any non-template `.env` (the packager refuses to run if one exists).
