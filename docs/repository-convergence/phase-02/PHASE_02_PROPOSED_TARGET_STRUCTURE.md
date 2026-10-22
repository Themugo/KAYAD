# Proposed Target Structure — Not Implemented

This is a proposal only. No paths were moved. Current package/build/runtime conventions must be preserved until an approved relocation phase.

```text
/ (repository root; keep mandatory tool/host entry files here when consumers require them)
├── src/ or existing application source roots (preserve current feature boundaries)
├── backend/ and frontend/ (only if confirmed as existing deployable boundaries)
├── tests/ and e2e/ (preserve runner-specific discovery paths until configs are updated)
├── scripts/ (group only scripts with confirmed ownership and references)
├── supabase/ (keep migrations/config/policies in their expected discovery path)
├── docs/
│   └── repository-convergence/
│       ├── phase-00/
│       ├── phase-01/
│       └── phase-02/
├── infrastructure directories already consumed by deployment (preserve paths initially)
└── root-level package/config/host files that require root placement (retain)
```

## Principles

- Do not create new source roots simply to make the tree look cleaner.
- Treat `lib/` and any ambiguous shared directories as unresolved ownership until import and runtime consumers are confirmed.
- Keep host configuration, package manifests, lockfiles, CI/CD workflow files, and migration discovery roots in place unless their consumer explicitly supports alternate paths.
- Move historical audit artifacts only in a separately approved phase, preserving exact content and provenance.
- Every proposed move must have a path-map entry, reference-update list, isolated verification plan, and rollback path.

The full candidate register and unresolved cases are in `PHASE_02_CURRENT_TO_PROPOSED_PATH_MAP.csv` and `PHASE_02_RELOCATION_DEPENDENCY_CHECKLIST.md`.
