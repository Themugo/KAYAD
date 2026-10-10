# Phase 38 — Canonical Transaction Boundary Reconciliation

Phase 38 removes the misleading Mongo/Mongoose-style transaction-session compatibility layer from the Supabase/PostgreSQL runtime and retires the unsupported legacy `escrow_vaults` subsystem.

## Changes
- Removed the no-op `supabaseSession` transaction shim.
- Removed `.session()` compatibility methods from the Supabase model adapter.
- Bid placement now relies solely on the existing PostgreSQL atomic bid RPC and distributed lock.
- Favorites and reviews no longer advertise fake transaction semantics.
- Removed the legacy `EscrowVault` model/controller/routes/API and stale reconciliation paths.
- Canonical escrow remains `public.escrows` with the existing escrow state-machine/RPC architecture.
- Removed stale escrow-vault navigation, validation and OpenAPI contracts.

## Validation
See `scripts/validate-phase38.mjs`.
