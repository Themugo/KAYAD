# Baseline and change register

* Baseline: `origin/main` at `1eb1489`, worktree detached. **No commits were made**; every change (the earlier DA-01..07 work and this phase) is uncommitted.
* Checkpoint: the complete patch against `1eb1489` and a full-project ZIP (see FINAL-RELEASE-READINESS.md for locations and checksums). Removed legacy files are copied in the patch's companion folder and are recoverable from git history.
* Baseline test state on unmodified `origin/main`: the same 6 validators fail; the other suites were green on the prior phase.
* Changed files vs baseline: 24 tracked files modified or deleted plus new files (migrations `20261121160000`, `20261121170000`, new tests, journeys, docs).
* Personal-account code paths were not modified except `personalListingMutationGuard.service.js` / `carController.js` from the earlier phase; personal and dealer data and permissions remain separate (journeys j7 / j10 pass).
