# Phase 17 Handover and Rollback

## Recovery point
The immutable Phase 16 archive is the authoritative rollback point: `KAYAD-REPOSITORY-CONVERGENCE-PHASE-16-STRUCTURAL-CONSOLIDATION-20261022.zip`, SHA-256 `2d9e1fd2d47e7f1d74cd5147c5a186a4c18b0ef564f109a43bb61bc37f8e7af6`.

## Rollback
1. Preserve the Phase 17 archive and sidecar for forensic comparison.
2. If any move/reference update proves unsafe, restore the full verified Phase 16 archive into a new clean directory rather than applying a partial inverse.
3. Use `PHASE_17_STRUCTURAL_OPERATION_LEDGER.csv` to map moved paths.
4. Do not run the legacy `APPLY_PHASE_*.cmd` or `RUN_PHASE_2_CERTIFICATION.cmd` scripts as a rollback mechanism.

## Maintainer guidance
Read `docs/REPOSITORY_GUIDE.md`, then this phase's execution report, root classification, operation ledger, script disposition, and post-remediation reference scan. Historical phase evidence remains preserved and should not be rewritten as current-state truth.
