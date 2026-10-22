# Phase 23 Maintainer Handover

1. The Phase 22 archive remains unchanged and is the recovery source for all moved files.
2. Root-level legacy wrappers were moved to `evidence/legacy-maintenance-scripts/root-phase-and-git-wrappers/`; do not execute them. Their hardcoded workstation paths and mutating copy/commit/push behavior make them unsafe as maintained root entrypoints.
3. Root-level vehicle preview images without active source references were moved to `evidence/ux-convergence/legacy-root-visual-assets/`.
4. Historical records were not rewritten to conceal the old locations.
5. Review `PHASE_23_STRUCTURAL_OPERATION_LEDGER.csv` and `PHASE_23_OLD_TO_NEW_PATH_MAP.csv` before any restoration.
6. This phase does not certify application runtime or production readiness.
