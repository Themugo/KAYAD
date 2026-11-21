# Phase 16B runbook (disposable local stack only — never point at staging or production)

| Path | What |
|---|---|
| `migration-candidate/…CANDIDATE.sql` / `…ROLLBACK.sql` | registration function + dealer onboarding columns + `suspended` CHECK. **Candidate, not applied.** |
| `pg-tests/registration_dealer_onboarding_pg_checks.sh` | 47-check rehearsal on a hosted-shaped clone of a disposable DB |
| `http/e2e_phase16b_owner_dealer_separation.cjs` | owner/dealer separation, mass assignment, stale sessions, KAYAD-domain addresses, MFA lockout race (needs owner-governance + owner-MFA candidates applied, `WEBHOIST_EMAIL=owner148@example.test`, `OWNER_MFA_ENCRYPTION_KEY`) |
| `http/browser_16b_real_stack.cjs` | real-stack Playwright + axe check (needs the SPA served by `runbooks/phase13k-20261026/ui/serve-spa.mjs`) |
| `harness/*.sh` | the scripts used to reset the disposable DB, start the backend and sweep the suites. They contain **local paths from the audit machine** and must be adapted; the MFA key is generated at run time |

Reuses `runbooks/phase16-20261026/{e2e_lib.cjs,role_matrix_probe.cjs,classify_500s.cjs}`. Disposable DB credentials, ports and the throwaway JWT secret in the harness are test-only values.
