# KAYAD Recovery Build-Stabilization Package

This document records a historical recovery package based on the recovered Phase 39 source tree. It is retained for provenance and is not a current apply procedure.

## Safety notice

`APPLY_RECOVERY_TO_REPO.cmd` has been archived under `evidence/legacy-maintenance-scripts/root-phase-and-git-wrappers/`. Do not execute it from the archive: it contains workstation-specific paths and recursive copy behavior, and relocation intentionally removes its former root-level execution context. The historical wrapper is preserved as evidence only.

For any future recovery, verify the selected checkpoint, extract into a disposable isolated directory, review a path/hash diff, and run the current project validation commands before approving any replacement. Do not apply this historical package over a working or production checkout.

## Historical fixes recorded by the package

The original package described restored auth API methods and routes, import and fixture corrections, removal of fabricated seller counters and wallet balances, inspection type restoration, notification payload compatibility, communications handling, mobile/CMS import repairs, backend test-contract updates, and a recovery validator. These are historical claims from the source document and are not independently recertified by Phase 23.

The original document reported that full dependency-backed build and test execution was not completed in its environment. Phase 23 does not upgrade that historical status.
