# KAYAD Change Ledger — Stage 3: Security Hardening, Migration Drift & Pre-Staging Certification (2026-10-13)

Append-only record of this pass. Earlier ledgers (`KAYAD_CHANGE_LEDGER.md`, `KAYAD_STAGE*_CHANGE_LEDGER_*.md`) are unchanged.
Foundation: `origin/main` `194cc807`. Nothing was committed, pushed, deployed or executed against production.

| File | Change | User-visible impact | Risk / regression coverage |
|---|---|---|---|
| `backend/routes/leadRoutes.js` | `POST /` now `protect, dealerOnly, validate(createLeadSchema)`; `POST /:leadId/notes` adds `validate(leadNoteSchema)` | Non-dealer roles get 403 on manual lead creation; malformed payloads 400 | `leadManualCreateAuthorization.test.js` 30/30; mutation: removing `dealerOnly` → 3 fail |
| `backend/controllers/leadController.js` | `createLeadManual`: buyer≠dealer, buyer/vehicle existence, vehicle ownership, `resolveLead`, notes via `setLeadNotes`, 201/200 + `created`; `addNote`: `setLeadNotes` instead of `.save()` | Manual lead creation no longer 500s after inserting; notes endpoint works (was always 500) | same test; HEAD code → 22 fail |
| `backend/services/leadService.js` | `resolveLead()` (returns `{lead, created}`), `createLead()` delegates (contract unchanged), new `setLeadNotes()` | None for chat/auction/escrow callers | full backend Jest 96/1342 |
| `backend/validation/lead.schema.js` | **New** zod schemas (`createLeadSchema`, `leadNoteSchema`) | 400 with field messages | lead test (7 invalid-payload cases) |
| `backend/tests/regression/leadManualCreateAuthorization.test.js` | **New**, 30 tests over HTTP with the real router | Test-only | — |
| `backend/tests/auth/logoutRevocationBehaviour.test.js` | **New**, 8 behavioural logout tests | Test-only | mutations: no revoke → 4 fail; no version bump → 2 fail |
| `backend/tests/regression/protectSecurityState.test.js` | +2 suspension (`isBanned`) tests | Test-only | 8/8 |
| `backend/tests/regression/stage3CandidateRunbooks.test.js` | **New**, 14 static guards for the Stage 3 candidates and the `db push` guards | Test-only | 14/14 |
| `scripts/apply-schema.sh` | Refuses `supabase db push` unless `KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized` | Operator must acknowledge drift explicitly | fake-CLI run: refuses (exit 3) / passes with the flag; `validate:phase23` PASS |
| `scripts/bootstrap-supabase-production.mjs` | Same guard on the `--apply` path only (dry run unchanged) | Same | static test; `node --check` |
| `scripts/rehearse-stage3-lead-privileges-local.sh` | **New** local-only harness (L1–L4, I1, P1–P5) | None | 57/57 on PG 17.6 and 16.15 |
| `runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql` | **New** candidate — NOT EXECUTED | — | harness L1–L3, P3 |
| `runbooks/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql` | **New** candidate — NOT EXECUTED | — | harness P5 + onboarding assertions |
| `runbooks/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql` | **New** candidate — NOT EXECUTED | — | harness I1/I1b/I1c |
| `runbooks/STAGE3_SCHEMA_ONLY_REHEARSAL_RUNBOOK_20261013.md` | **New** procedure — NOT EXECUTED | — | — |
| `KAYAD_PRESTAGING_SECURITY_AND_MIGRATION_DRIFT_20261013.md`, `KAYAD_STAGE3_DUPLICATE_VERSION_MATRIX_20261013.tsv`, `KAYAD_STAGE3_VALIDATION_MATRIX_20261013.tsv`, this ledger, `evidence/stage3/**` | **New** documentation/evidence | Documentation | — |

## Change boundary
- 6 existing files modified (3 backend source, 1 test, 2 deployment scripts); 9 new code/test/script/candidate/runbook files; documentation and evidence added.
- No migration under `supabase/migrations/` added, renamed, edited or removed. No earlier runbook or report overwritten.
- No new route, endpoint, table, role, service or authentication mechanism. No frontend change.
- Authorization tightened on one endpoint (`POST /api/leads`) using the existing `dealerOnly` guard; no guard was weakened.
