# Stage 5D defect ledger
| ID | Finding | Status |
|---|---|---|
| D5D-01 | Two committed regression suites (`logoutBehavior`, `leadControllerPersistence`) fail to load on `main` (stale mocks) and were absent from the 5B/5C/5C.1 archives, so never ran in certification | **FIXED** (tests only; see reconciliation doc). Full jest: 133 suites / 1941 tests pass |
| D5D-02 | `PROVENANCE_RECORD_5C1.md` §3 misattributes origin of the five files | CORRECTED in 5D docs; released ZIP unchanged |
| D5D-03 | 5B rollback without confirm flag prints refusal but exits 0 | OPEN (script-level; wrappers must check output); no code change in 5D |
| F5D-04 | Hosted `kayad_activate_dealer_subscription_atomic` lacks EXECUTE for service_role | OPEN — needs authorized staging change |
| F5D-05 | anon/authenticated TRUNCATE/REFERENCES/TRIGGER on `otp_challenges` | OPEN — needs authorized change |
| F5D-06 | Hosted schema 63 migrations behind; 38 hosted-only migrations not in repo | OPEN |
| N5D-07 | `tsc -p tsconfig.app.json` (non-canonical invocation) prints errors, identical in the 5C.1 tree; the project's own `npx tsc --noEmit` exits 0 and `npm run build` succeeds (extracted-copy run) | NOT A DEFECT — recorded to avoid re-reporting |
