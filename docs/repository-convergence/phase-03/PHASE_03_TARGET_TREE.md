# Phase 3 Proposed Target Tree (Planning Only)

This tree is a conservative organization proposal, not an implementation order. Existing root entry points and subsystem directories remain at their current locations until a later approved batch proves a move is safe.

```text
/
├── [KEEP] package manifests, lockfiles, build/test configs, deployment configs,
│          environment templates, runtime entry points, and ecosystem dotfiles
├── src/                    [KEEP EXISTING APPLICATION BOUNDARY]
├── backend/                [KEEP EXISTING BACKEND BOUNDARY]
├── public/                 [KEEP EXISTING PUBLIC-ASSET BOUNDARY]
├── tests/                  [KEEP EXISTING TEST BOUNDARY]
├── e2e/                    [KEEP EXISTING E2E BOUNDARY]
├── supabase/               [KEEP MIGRATION/POLICY DISCOVERY PATH STABLE]
├── scripts/                [KEEP; only move individually proven standalone utilities]
├── docs/
│   └── repository-convergence/
│       ├── phase-00/
│       ├── phase-01/
│       ├── phase-02/
│       └── phase-03/       [NEW AUDIT OUTPUTS ONLY]
├── reports/                [EXISTING; assess ownership before adding/moving files]
├── evidence/               [EXISTING; preserve provenance]
├── runbooks/               [EXISTING; validate human/operational path references]
├── validation-logs/        [EXISTING; preserve historical records]
└── remaining existing subsystem directories
    [KEEP CURRENT PATHS UNTIL CHILD-LEVEL EVIDENCE SUPPORTS CHANGE]
```

## Rules for future refinement

- Do not invent a new `archive/` or `tools/` hierarchy unless it is justified by actual ownership and consumers.
- Do not move active configuration merely to make the root visually smaller.
- A future history/documentation destination must preserve provenance and update every confirmed link and automation reference.
- Existing `docs/`, `reports/`, `evidence/`, `runbooks/`, and `validation-logs/` must not be merged until their distinct roles and consumers are reconciled.
- Root-level operational scripts require individual inspection, including relative working-directory assumptions.
- All proposed paths remain provisional; no file moves were performed in Phase 3.
