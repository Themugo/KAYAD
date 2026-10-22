# Phase 4 Batch 01 — Approval and Plan

**Status: NOT EXECUTED — NO PER-FILE APPROVAL / SAFETY EVIDENCE**

## Decision
No application file relocation is authorized by the supplied Phase 3 evidence alone. The Phase 3 register requires individual review and approval for historical reports, utility scripts, and checkpoint/evidence groupings. The register contains batch-level conditions, not explicit source-to-destination approval for a specific file. In keeping with the Phase 4 prompt, the smallest safe batch is therefore an empty batch.

## Candidate scope reviewed
- Root remediation register: all entries reviewed at register level ({len(rootreg)} entries).
- B1 historical reports: deferred pending per-file provenance, old/new path consumer review, and explicit approval.
- B2 utility scripts: deferred pending script side-effect, working-directory, invocation, and CI/CD/runbook review.
- B3 checkpoint/audit evidence: deferred pending authoritative provenance review and explicit approval.
- B4 root configuration/runtime: preservation boundary; no moves considered eligible.

## Approved paths
None.

## Planned source/destination mapping
None. No file is moved and no references are updated.

## Before hashes and snapshot
The full baseline SHA-256 manifest is `PHASE_04_BASELINE_HASH_MANIFEST.csv`. The untouched Phase 3 ZIP is the authoritative recovery point. The extracted baseline is preserved in the checkpoint; no batch snapshot was needed because no path was changed.

## Required validation
- Verify every original archive path and file byte is preserved in the Phase 4 checkpoint.
- Validate all generated CSVs.
- Validate final ZIP integrity and SHA-256 sidecar.
- Confirm no unexpected application file changes.

## Rollback triggers and procedure
Because no relocation or reference update was performed, rollback was not triggered. If a future approved batch fails, discard the working output, re-extract the exact verified Phase 3 foundation, restore original paths/bytes, verify hashes, and re-run relevant reference checks before reconsideration.

## Approval status
**No individual candidate approved for movement in this phase.**
