# KAYAD Phase 41 — Authoritative Vehicle Detail & Session Collection Hardening

## Objective

Continue the production consolidation work without adding speculative features. Vehicle detail resolution and saved-vehicle state must remain authoritative to the real backend and must never depend on seeded/demo IDs or the current inventory slice alone.

## Completed

- Vehicle detail navigation now resolves a vehicle ID through the real `GET /api/cars/:id` endpoint when that vehicle is not already present in the loaded inventory.
- Browser vehicle deep links and refreshes now use the same authoritative single-vehicle lookup instead of treating an ID outside the current inventory page as automatically missing.
- Missing/invalid vehicle IDs are reported only after the backend lookup returns no vehicle or fails.
- Saved-vehicle state no longer starts with fabricated `v1`/`v2` IDs.
- Logout is a hard collection/session boundary: authenticated saved vehicles are cleared when the user session ends.
- Existing authenticated favorites behavior remains backend-backed, optimistic, reconciled, and rollback-safe.
- Regression coverage was updated for the new empty initial collection contract and logout isolation.
- Added `scripts/validate-phase41.mjs` with seven static regression checks.

## Explicit non-goals

- No new database schema.
- No Supabase Auth migration.
- No new Edge Function.
- No new demo/seed data.
- No fabricated seller, dealer, financing, inspection, or payment data.
- No redesign of the marketplace UI.

## Validation

Static Phase 41 validation: **7/7 passed**.

Dependency-backed `npm run lint` / `npm run build` must be run on the user's development machine. The build environment used while assembling this archive has Node `22.16.0`, while the repository declares Node `>=22.22.2`, so a dependency-backed build was not claimed here.

## Completion gate

Phase 41 is ready to apply when the local repository reports:

- `npm run lint` passes
- `npm run build` passes
- `node scripts/validate-phase41.mjs` reports `7/7 passed`
- existing Phase 40 validation remains `23/23 passed`
- `git status` is clean after commit
