# Phase 3 Verification and Rollback Plan for a Future Authorized Phase

## Before each future batch
1. Verify the exact phase checkpoint SHA-256 and ZIP integrity.
2. Create a per-batch file/path manifest with SHA-256 hashes.
3. Confirm the approval register authorizes every path in the batch.
4. Confirm all known import, configuration, script, test, deployment, documentation, dynamic path, and framework-discovery references.
5. Confirm an isolated compatible environment and the exact verification commands.

## After each future batch
1. Compare old/new inventories and verify only explicitly approved paths differ.
2. Verify moved-file bytes match the pre-move hashes.
3. Search for references to old and new paths.
4. Run relevant typecheck, lint, build, unit/integration, and browser tests where available.
5. Validate script working directories, build roots, start commands, asset paths, migration discovery, and CI/CD references when relevant.
6. Capture actual command outputs and exit codes. Mark unavailable checks as blocked, not passed.
7. Package a full-project checkpoint and compute its SHA-256.

## Rollback triggers
- Any unexplained missing or changed file.
- Any unresolved reference to a relocated path.
- A failed required validation gate.
- Changed runtime behavior or broken operational instructions.
- Unclear provenance or unexpected consumers.

## Rollback procedure
1. Stop further batches.
2. Restore exact original paths and bytes from the verified pre-batch snapshot.
3. Revert only reference updates made by that batch.
4. Re-run inventory, hash, reference, and relevant test checks.
5. Create a recovery report and checkpoint before resuming.

Do not claim application/runtime certification based only on successful file operations.
