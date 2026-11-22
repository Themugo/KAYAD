# 06 — Rollback and Recovery

**Status: PLAN ONLY on staging (NOT EXECUTED). Local forward/rollback of the new migration on the disposable DB: see below.**

## Strategy
Migrations are forward-only. Recovery = (a) pre-change backup/PITR point, (b) forward "undo" migration, (c) backend rollback to previous release.

## Migration `20261122120000_listing_creation_idempotency`
- Additive: 2 nullable columns, 1 CHECK, 1 partial unique index, 1 trigger, function replaced (3-arg → 4-arg).
- **Not backward-compatible for the old backend**: old code calls the dropped 3-arg RPC. Rollback order if needed: (1) redeploy previous backend, (2) apply undo migration recreating the 3-arg function from `20261121…`'s definition, (3) optionally drop trigger/index/columns (safe: nullable, no dependents). Dropping columns loses stored keys (replay protection) — acceptable only with explicit approval.
- Undo draft (not shipped, not applied anywhere): recreate prior function text; `DROP TRIGGER kayad_cars_creation_key_immutable`; `DROP INDEX uq_cars_owner_creation_key`; `ALTER TABLE cars DROP CONSTRAINT cars_creation_idempotency_key_chk`; `DROP COLUMN` x2.

## Recovery runbook (staging/production, to be rehearsed)
1. Freeze writes (maintenance flag) before risky step.
2. Record backup ID/PITR timestamp; verify restore on staging first.
3. Apply; run invariants; on failure stop, restore or forward-fix.
4. Verify payments/escrow/ledger totals equal pre-change snapshot.

## Not tested
Backup restore, PITR, undo migration on a hosted copy, failover. All NOT TESTED.
