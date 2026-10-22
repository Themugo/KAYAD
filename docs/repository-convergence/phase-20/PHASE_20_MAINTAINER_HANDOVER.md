# Phase 20 Maintainer Handover

1. Treat Phase 19 ZIP as the immutable rollback baseline.
2. Start with `PHASE_20_FULL_NESTED_PATH_INVENTORY.csv` for the repository-wide path map.
3. Review exact duplicate groups by group ID; verify provenance, consumer references, and manifest roles before removing any copy.
4. Review naming candidates in context. Do not mass-rename phase-labelled utilities.
5. Verify external CI, hosting, scheduled automation, and owner workflows before moving root operational scripts.
6. Continue only with isolated changes, path-specific hash checks, updated references, and a new checkpoint.
7. This checkpoint does not certify application runtime or production readiness.
