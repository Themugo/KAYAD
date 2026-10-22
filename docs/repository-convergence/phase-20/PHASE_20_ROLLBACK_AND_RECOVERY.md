# Phase 20 Rollback and Recovery

The Phase 19 checkpoint is immutable and remains available at `/mnt/data/kayad-phase19-work/KAYAD-REPOSITORY-CONVERGENCE-PHASE-19-FULL-REPOSITORY-STRUCTURAL-NORMALIZATION-20261022.zip` with SHA-256 `363176f90adef81eee9dc2a37c1024a21a22fc57f6e16ebfcfbce1ca22a2d4d5`. Phase 20 did not mutate existing application paths. To recover the exact pre-Phase-20 project, extract the Phase 19 archive into a new directory and verify its `.zip.sha256` sidecar. Do not overlay the archive on a live checkout.
