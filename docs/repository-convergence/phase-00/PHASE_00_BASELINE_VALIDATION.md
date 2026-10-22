# KAYAD Phase 0 — Baseline Validation

- Date (UTC): 2026-10-22T10:37:33.097918+00:00
- Foundation archive: `KAYAD-PHASE6-UPDATED-FULL-PROJECT-20261022.zip`
- Calculated SHA-256: `18fb1e4bff1ab079e8f640d8002303a384724cbd15e7f0ecd32628d8a168c3e6`
- Sidecar SHA-256: `18fb1e4bff1ab079e8f640d8002303a384724cbd15e7f0ecd32628d8a168c3e6`
- Checksum match: PASS
- ZIP integrity test: PASS (`unzip -tq`, exit 0)
- Extracted project file count before Phase 0 reports: 6215
- Extracted directory count before Phase 0 reports: 479
- Root-level files: 439
- Root-level directories: 23
- Git metadata included: NO
- `node_modules` directories included: 0
- Node.js runtime available: `v22.16.0`
- npm runtime available: `10.9.2`
- Declared root Node engine: `>=22.22.2`
- Root lockfile SHA-256: `f0d1c9032c9389945b3243e77e8851dd42f5464bf1b8489743fa7a7a741608ba`
- Existing non-example `.env`-style files detected by filename: 0
- Non-example environment-like paths: none detected

## Results

- Foundation identity and archive integrity: PASS
- Runtime baseline: BLOCKED for project validation because the available Node.js runtime does not satisfy the declared engine if version is below 22.22.2.
- Dependency-backed build/tests: BLOCKED; no `node_modules` directories are included in the foundation.
- Git commit/branch/remotes/working tree: UNAVAILABLE because `.git` metadata is not included. No GitHub checkout was substituted.
- Source changes: NONE. Phase 0 adds only baseline inventory and report artifacts.

## Important file-name review flags

The inventory marks files with names such as `secret.yaml` or environment-like names for review based on filenames only. This is not a finding that the files contain secrets. Their contents must be reviewed securely before any later packaging or release decision. Secret values are not reproduced in this report.
