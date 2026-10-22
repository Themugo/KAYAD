# Phase 1 Validation Report

**Status:** PASS WITH DOCUMENTED LIMITATIONS for structural inventory; runtime-dependent application validation remains BLOCKED.

## Foundation verification
- Foundation archive: `KAYAD-REPOSITORY-CONVERGENCE-PHASE-00-FOUNDATION-20261022.zip`
- Expected SHA-256: `abfa07776ba400682dd0f79df7f45515fd12f0c3dc6c0658cd522fa8306e5c48`
- Actual SHA-256: `abfa07776ba400682dd0f79df7f45515fd12f0c3dc6c0658cd522fa8306e5c48`
- Sidecar comparison: PASS
- ZIP integrity: PASS (`testzip` returned `None`)
- Archive entries: 6219
- Phase 0 reports found: PASS (`PHASE_00_FOUNDATION_BASELINE.md`, `PHASE_00_FILE_INVENTORY.csv`, `PHASE_00_BASELINE_VALIDATION.md`, `PHASE_00_FOUNDATION_SHA256.txt`)
- `.env.example` and `backend/.env.example` present: True
- Git metadata present in extracted archive: False

## Runtime baseline
- Node.js: `v22.16.0`
- npm: `10.9.2`
- Declared Node engine: `>=22.22.2`
- `node_modules` present: False
- Dependency installation: NOT RUN (Phase 1 prohibits dependency installation and lockfile changes).
- Typecheck/build/Vitest: NOT RUN; do not infer success. Runtime version is below the declared engine requirement if the declaration is `>=22.22.2`.

## Structural inventory checks
- Root immediate items: 439 files, 23 directories.
- Files inventoried recursively: 6219.
- File classification rows generated: 6219.
- Exact-content duplicate groups found by SHA-256: 375 groups covering 1596 path occurrences. This is a candidate list only; it does not establish that files are safe to delete.
- Test/validator register rows: 450.
- Deployment/infrastructure register rows: 57.
- Unknown/low-confidence review rows: 202.
- Package scripts declared: 158.
- CSV reports were generated with headers and rows; parsing validation is recorded below.

## Commands/checks performed
- SHA-256 calculation using Python hashlib: PASS.
- ZIP archive integrity using Python zipfile test: PASS.
- Root and recursive filesystem inventory: PASS.
- package.json JSON parse: PASS.
- Runtime version query: Node `v22.16.0`, npm `10.9.2`.
- No application tests were run.
- No database, network, production, deployment or credential-changing operations were performed.

## Limitations
- The archive contains no `.git` metadata, so the original commit, branch and working-tree state cannot be verified from this package.
- Classifications based on directory/name are explicitly confidence-rated and require reference/content review.
- A hash match establishes identical file bytes, not identical operational purpose.
- No actual secrets are reproduced in this report; sensitive-risk classification uses paths and metadata only.
