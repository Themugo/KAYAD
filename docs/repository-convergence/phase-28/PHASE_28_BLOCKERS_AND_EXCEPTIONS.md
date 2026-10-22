# Phase 28 Blockers and Exceptions

1. **Runtime version mismatch:** local Node `v22.16.0`; repository and CI specify `>=22.22.2` / `22.22.2`. Targeted validator passes are real, but not fully environment-conformant.
2. **Release validator withheld:** its implementation deletes `api-governance-report.json` if present and launches many validators with 30-second per-validator timeouts. The transitive execution effects were not fully reviewed; no execution attempted.
3. **External consumers incomplete:** local workflow files were available, but there is no direct evidence here for remote CI runs, hosting platform settings, scheduled tasks, or external operator automation.
4. **No application certification:** build/typecheck/test suites, database, payments, communications, deployment and production checks were outside the executed scope.

No path change or source correction is approved on this evidence.
