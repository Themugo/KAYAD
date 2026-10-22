# Phase 20 Blockers and Exceptions

1. **Exact duplicate groups (376):** review provenance and consumers before merge/removal. See `PHASE_20_EXACT_DUPLICATE_REGISTER.csv`.
2. **Name-pattern candidates (1349):** phase/stage/temp-like names need contextual review; no bulk rename performed. See `PHASE_20_NAMING_INCONSISTENCY_REGISTER.csv`.
3. **Near-duplicate filename candidates (3565):** candidates are filename-similarity hints only, not proof of content similarity. Manual review required.
4. **External consumers:** external CI, hosting, scheduled jobs, developer scripts, and ownership records were not available to inspect.
5. **Runtime certification:** application build/typecheck/unit/E2E/database/payment/deployment tests were not run.
