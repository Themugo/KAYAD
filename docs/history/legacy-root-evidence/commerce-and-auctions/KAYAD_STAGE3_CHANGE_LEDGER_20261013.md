# KAYAD Stage 3 Change Ledger — 2026-10-13

This file is a Stage 3 addendum. It does not replace prior reports, logs, migration runbooks, or candidate SQL.

## Entry 2026-10-13 — Pre-staging security and migration drift pass

### Foundation
- Input archive: `KAYAD-MIGRATION-PROVENANCE-STAGING-CERTIFICATION-20261013(2).zip`
- Input size: 31,225,888 bytes
- Input SHA-256: `e29679f362cd9810b96d9b542042fef46d678c50a8ef417a46f11a39d13df21f`
- Archive extracted to a separate working copy. Original upload preserved.
- No `.git` directory was present; Git commit/branch/remote/dirty state could not be independently checked.

### Local source changes
1. `backend/controllers/leadController.js`
   - Added an explicit `dealer`/`admin` role boundary to manual lead creation, consistent with the existing route section and neighboring lead handlers.
   - Replaced invalid `lead.save()` usage in manual creation and note creation with `updateLeadNotes`.
2. `backend/services/leadService.js`
   - Added `updateLeadNotes`, backed by the existing database adapter `findById` and `update`.
3. `backend/tests/regression/leadControllerPersistence.test.js`
   - Added coverage for successful persistence, no-notes path, non-dealer denial before mutation, owner authorization and note activity.
4. `backend/tests/regression/logoutBehavior.test.js`
   - Added behavioral coverage for logout revocation, token-version increment, cache invalidation, cookie clearing and revocation failure.
5. `backend/tests/regression/onboardingV3CandidateRunbook.test.js`
   - Replaced an incorrect claim that the lead RPC necessarily requires a unique index with checks for the observed advisory lock/key lookup behavior. The unique-index file remains a candidate and was not applied.
6. `docs/domains/INTEGRATION_GUIDE.md`
   - Replaced three secret-shaped sample values with explicit placeholders to avoid packaging credential-like literals.

### New documentation
- `KAYAD_PRESTAGING_SECURITY_AND_MIGRATION_DRIFT_20261013.md`
- `runbooks/APPROVED_READONLY_SCHEMA_REHEARSAL_20261013.md`
- `KAYAD_STAGE3_CHANGE_LEDGER_20261013.md`

### SQL / external actions
- No new SQL migration created.
- No SQL executed.
- No production export, hosted staging creation, deployment, Git commit/push, real communication or payment was performed.

### Validation evidence
- `node --check` passed for the two modified source files and three relevant test files.
- `scripts/validate-supabase-migrations.mjs`: PASS (181 migration files, 181 unique versions).
- `scripts/validate-communications-initiative.mjs`: PASS.
- `scripts/validate-transaction-integrity.mjs`: PASS (14/14).
- Root `npm test -- --runInBand`: exit 127, `vitest: Permission denied`.
- Root `npm run typecheck`: exit 2; output included missing dependency/type modules and TypeScript errors. Environment not sufficient to certify source type correctness.
- Root `npm run build`: exit 127, `vite: Permission denied`.
- Backend runtime suites, PostgreSQL rehearsals, Playwright and native Windows validation: not run because the required working environment was unavailable.

### Unresolved release blockers
- No Git metadata to re-verify the reported Stage 2 commit or historical migration pair provenance.
- Six reported inverted migration pairs and 38 production-only records remain unresolved.
- Three same-name production migration contents remain unverified against authoritative SQL.
- Current production `inspector_applications` shape and function ACL/RLS state were not queried in this pass.
- New behavioral tests have not been executed.
- Supported Node/dependency environment and real PostgreSQL 17.6 local rehearsal are still required.

### Packaging verification
- Complete archive created at `KAYAD-PRESTAGING-SECURITY-MIGRATION-DRIFT-20261013.zip`.
- Archive extracted to a fresh verification directory.
- All 4,286 manifest-covered files matched their SHA-256 values.
- The archive contains 4,287 entries including the manifest.
- No real `.env` file, `.git`, `node_modules`, build output or cache directory was included.
- Archive SHA-256 and exact byte size are supplied in the delivery summary; the manifest excludes its own self-hash.

### Decision
`BLOCKED — INSUFFICIENT ENVIRONMENT ACCESS`. This is a source-level pass and documentation package, not production or staging certification.
