# KAYAD documentation map

## Handover (start here)
- `handover/HANDOVER_GUIDE.md` — canonical handover entry point and review sequence.
- `handover/STRUCTURE_AUDIT.md` — findings from the supplied `KAYAD-FULL-1106c.zip`.
- `handover/FILE_CLEANUP_REGISTER.csv` — every file relocated in this cleanup.
- `handover/EXACT_DUPLICATE_REGISTER.md` — exact-content duplicate groups and disposition.

## Architecture and operations
- `../src/` — frontend application source.
- `../backend/` — backend application source.
- `../supabase/` — database migrations, tests, preflight and rollback material.
- `../scripts/` — project validation, maintenance, security and operational scripts.
- `../e2e/`, `../tests/`, `../load-tests/` — automated test suites and load tests.
- `../runbooks/` — dated execution/rehearsal evidence. The phase-like names are historical work identifiers, not product modules or deployment environments.
- `../proposed-patches/` — patch proposals and applied-patch evidence; review each patch's header before use.
- `archive/phase-records/` — retained historical phase reports and manifests.

## Naming rule
Runtime code stays in its established source/domain directories. New project documentation belongs under `docs/`; operational procedures belong under `runbooks/`; generated test evidence belongs under `audit-artifacts/`; proposed diffs belong under `proposed-patches/`. Do not create new root-level phase files.
