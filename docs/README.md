# KAYAD documentation map

## Handover (start here)
- `handover/HANDOVER_GUIDE.md` — canonical handover entry point and review sequence.
- `handover/STRUCTURE_AUDIT.md` — findings from the supplied `KAYAD-FULL-1106c.zip`.
- `handover/FILE_CLEANUP_REGISTER.csv` — every file relocated in this cleanup.
- `handover/EXACT_DUPLICATE_REGISTER.md` — exact-content duplicate groups and disposition (as found on 2026-11-06; see the 2026-11-16 register for what was removed).
- `handover/CLEANUP_REGISTER_20261116.csv` — every file deleted, moved or renamed in the 2026-11-16 structure audit, with the reason.
- `audits/` — all dated audit, remediation, verification and certification reports (`KAYAD_<TOPIC>_<YYYYMMDD>.md`), plus `audits/20261111-master-audit/` and `audits/screenshots/before-after/`.

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
