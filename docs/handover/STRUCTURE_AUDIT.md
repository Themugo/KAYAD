# KAYAD structure and naming audit

## Scope and method
Inspected the supplied `KAYAD-FULL-1106c.zip` archive. It contains 3,270 files (plus directory entries). Inventory included top-level placement, major directory boundaries, package script targets, exact SHA-256 duplicates, root-level phase artifacts, and selected suspicious paths. This was a static archive review; no connected database, hosted environment, credentials, or browser session was available.

## Executive findings
- The application has a recognizable core layout: `src/` (frontend), `backend/`, `supabase/`, `lib/`, `scripts/`, `e2e/`, `tests/`, and infrastructure/deployment directories.
- The root was polluted by 75 loose phase report/manifest files plus delivery-specific files. These were historical project evidence, not application modules. They have been grouped under `docs/archive/phase-records/`.
- `README_PHASE14_4.md` and `PACKAGE_MANIFEST.txt` were delivery-specific artifacts at root; archived with the phase records.
- `scripts/src/hello.ts` was a single sample `console.log` scaffold in a source-like subfolder. No package script target or import reference was found. It was moved to `docs/archive/unclassified-scaffold/` rather than deleted.
- The root `README.md` referenced a `docs/` documentation index and architecture/runbook pages that were not present in this archive. A real `docs/README.md` and handover entry point have now been added; the root README's documentation section now points to them.
- `package.json` contains 166 scripts. Every simple `node scripts/...` target parsed from the manifest exists in the supplied archive (0 missing targets detected).
- 18 groups of exact byte-identical files were detected. They were not deleted because most are historical runbook snapshots; details and disposition are in `EXACT_DUPLICATE_REGISTER.md`.
- Phase-like directories under `runbooks/` remain in place. Their date/phase identifiers are historical execution IDs and are not part of the deployed app's module structure. Moving them would risk breaking runbook-relative paths and reproducibility.

## Canonical structure for handover
| Area | Meaning |
|---|---|
| `src/` | Frontend application |
| `backend/` | Backend/API application |
| `supabase/` | Database migrations, tests, preflight and rollback assets |
| `lib/` | Shared libraries and API/database clients |
| `scripts/` | Validators, maintenance, security and operations |
| `e2e/`, `tests/`, `load-tests/` | Automated and performance tests |
| `.github/`, `helm/`, `k8s/`, `nginx/`, root deployment files | CI/CD and infrastructure |
| `runbooks/` | Dated operational execution records |
| `audit-artifacts/`, `certification-20261101/` | Audit and certification evidence |
| `docs/archive/phase-records/` | Historical phase reports/manifests |
| `proposed-patches/` | Patch diffs; `PROTECTED_*` files explicitly indicate proposals, not applied source |

## Naming and placement rules applied
1. Runtime source files were not renamed or relocated.
2. Root-level historical phase documents were grouped into `docs/archive/phase-records/`.
3. The one unreferenced scaffold sample was moved out of `scripts/`.
4. Duplicate files were catalogued, not removed.
5. Runbook directory names were retained to preserve their historic execution identity.
6. The root README was corrected to point at an actual documentation index and handover guide.

## Important integrity qualification
The historical phase SHA-256 manifests are retained byte-for-byte under `docs/archive/phase-records/`. Their internal file lists refer to the original root paths, so they must be treated as frozen historical manifests, not as current whole-tree checksum certificates after this organizational cleanup. A fresh package-level SHA-256 is supplied alongside this handover ZIP.

## Validation performed
- ZIP extraction/listing: successful.
- Archive entry inventory: 3,270 files.
- Package manifest script target existence: 166 simple Node script commands inspected; 0 missing.
- Exact duplicate detection: 18 groups catalogued.
- Full dependency install, frontend build, lint, backend tests, browser E2E, and live integration certification: **not run**. Dependencies/services are not available from a static ZIP inspection and must be run in the designated CI/staging environment.
