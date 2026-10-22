# Phase 16 Handover and Rollback

## Handover
The root-level historical evidence relocation is recorded in `PHASE_16_STRUCTURAL_OPERATION_LEDGER.csv` and `PHASE_16_PATH_MIGRATION_MAP.csv`. Historical source filenames and contents are preserved. Use `docs/REPOSITORY_GUIDE.md` as the navigation entry point.

## Rollback
Use the verified Phase 15 archive as the pristine recovery point. To reverse an individual move, locate its row in the operation ledger and move the recorded destination back to the recorded old root path. Verify the file SHA-256 against the ledger before and after. Do not overwrite a path if another file has since been created there; reconcile manually.

## Outstanding work
Review phase-labelled operational scripts, perform link/reference scans in a controlled follow-up, and run application checks in the project's intended runtime environment. No deployment or production state was changed.
