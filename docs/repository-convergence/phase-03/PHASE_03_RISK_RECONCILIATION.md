# Phase 3 Risk Reconciliation

Phase 2 risk register rows reviewed: **6232**. Phase 2 path-map rows reviewed: **6232**. Phase 2 path map contains **351** rows with a distinct proposed path (not an authorization to move).

## Phase 2 risk distribution

- `UNRESOLVED`: 1098
- `RELOCATION_REQUIRES_REFERENCE_UPDATES`: 2698
- `RELOCATION_HIGH_RISK`: 217
- `PRESERVE_PATH_UNTIL_RUNTIME_VERIFICATION`: 2160
- `PRESERVE_FOR_PROVENANCE`: 59

## Decision

All Phase 2 proposals remain **planning-only**. The Phase 3 relocation evidence register carries forward the original risk and reference information and adds a no-move disposition, pre-move evidence requirements, and rollback requirements.

No source changes, path moves, renames, deletions, or consolidations were performed. Static reference graphs cannot conclusively detect all dynamic filesystem reads, external user workflows, or undocumented CI/CD consumers. Those remain explicit pre-move checks.
