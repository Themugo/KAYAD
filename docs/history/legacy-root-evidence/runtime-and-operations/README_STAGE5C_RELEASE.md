# KAYAD Stage 5C — onboarding, Brevo/OTP, dashboard access and owner activation readiness

Complete project tree (source, tests, validators, lockfiles, config templates without secrets, migrations, runbooks, evidence). Built from the Stage 5B certified tree plus the Stage 5C changes. **Decision: READY WITH EXPLICIT BLOCKERS** — see `KAYAD_STAGE5C_EXECUTION_CERTIFICATION_REPORT_20261019.md`.

## What this release is not
Not deployed. No commit, push, hosted migration, hosted connection, real account change or live provider call was made. Live Brevo, live SMS, hosted schema, mailbox verification and activation of the two real owner addresses are **unproven (BLOCKED)**. Neither `kayadautomotives@gmail.com` nor `jimmythemugo@gmail.com` is claimed active.

## Where things are
| Need | Path |
|---|---|
| Final report (PASS/FAIL/BLOCKED table, decision) | `KAYAD_STAGE5C_EXECUTION_CERTIFICATION_REPORT_20261019.md` |
| Defect ledger | `runbooks/stage5c-onboarding-20261019/DEFECT_LEDGER_5C.md` |
| Role authorization + journey matrix | `…/ROLE_AUTHORIZATION_AND_JOURNEY_MATRIX_5C.md` |
| Brevo / OTP evidence matrix | `…/BREVO_OTP_EVIDENCE_MATRIX_5C.md` |
| Email workflow inventory | `…/EMAIL_WORKFLOW_INVENTORY_5C.md` |
| Owner activation checklist (per address) | `…/OWNER_ACTIVATION_READINESS_CHECKLIST_5C.md` |
| Hosted prerequisite matrix + read-only SQL | `…/HOSTED_PREREQUISITE_MATRIX_5C.md`, `…/HOSTED_READONLY_PREFLIGHT_5C.sql` |
| Unresolved blockers, owner decisions | `…/UNRESOLVED_BLOCKER_REPORT_5C.md`, `…/DECISION_REGISTER_5C.md` |
| Candidate migration + rollback + rehearsal | `…/migration-candidate/`, `…/PREFLIGHT_REHEARSAL_ROLLBACK_5C.md` |
| Journey harness, results, screenshots, stubs | `evidence/stage5c-20261019/` |
| SHA-256 manifest | `KAYAD_STAGE5C_SHA256_MANIFEST_20261019.txt` |

## Re-running
Offline suites: `bash evidence/stage5b-20261019/run_all.sh <project-root> <log-dir>` (tsc, build, front vitest, back jest/vitest/node:test, validators) after `npm ci` in the root and in `backend/`.
Journeys need the disposable stack (PostgreSQL 16 + PostgREST + the stubs in `evidence/stage5c-20261019/stack/`); the harness reads `KAYAD_ROOT` to pick the tree under test. The stack scripts are written for the sandbox paths (`/home/claude/s5c/...`) and are documentation of the setup, not a portable installer. Secrets are not shipped: `backend.env.template` lists the keys with values removed. Stubs are test harness only and never certify real delivery.

## Notes
`certify:buyer-portal:staging`, `certify:v14:live-api`, `certify:v14:production-runtime`, `validate:communications:providers`, `verify:production`, `validate:live-runtime` and similar exit non-zero here exactly as in the 5B baseline because they need live/staging resources (see report).
