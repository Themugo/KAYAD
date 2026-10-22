# Phase 19 Handover and Rollback

## Foundation
Keep the Phase 18 ZIP immutable. Its SHA-256 is `b9cdb5f736b813f2e1638648b6bb2267ae5b03af4882d2ddff579197b0c3c414`.

## Structural changes
See `PHASE_19_STRUCTURAL_OPERATION_LEDGER.csv` and `PHASE_19_MIGRATION_MAP.csv`. Every moved/renamed item is recoverable from the Phase 18 archive.

## Rollback
To revert a structural move, restore the original path and payload from the Phase 18 archive after checking that the destination has not acquired new content. Do not execute legacy patch scripts as part of rollback.

## Remaining work
Review naming candidates and duplicate groups; inspect external consumers before further script moves; run application checks in an approved environment before claiming runtime readiness.
