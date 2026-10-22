# Historical Evidence Index — Phase 14

## Phase chain
The repository contains the Phase 13 handover package at `docs/repository-convergence/phase-13/`. Phase 14 adds this folder and does not rewrite Phase 13 records. Earlier phases and other historical audit/release records may exist in `docs/`, `evidence/`, `reports/`, `runbooks/`, `validation-logs/`, and root-level files.

## Traceability guidance
- Use each phase's own manifest and checksum sidecar to verify the checkpoint artifact.
- Do not treat a historical report as current runtime evidence without re-running the relevant check.
- Preserve the exact file, date, phase, and hash when citing evidence.
- Reconcile conflicts through a discrepancy register; do not silently overwrite earlier claims.

## Known discrepancy
The Phase 13 executive summary records a Phase 12 foundation hash that differs from the Phase 12 digest recorded as independently verified in the prior checkpoint. This discrepancy is documented in `PHASE_14_PHASE13_RECONCILIATION.csv` and `PHASE_14_DISCREPANCY_REGISTER.csv`; it is not silently corrected.

## Protected evidence
Historical audit reports, release-specific README files, phase logs, manifests, support matrices, and change ledgers are retained. No consolidation was authorized or performed.
