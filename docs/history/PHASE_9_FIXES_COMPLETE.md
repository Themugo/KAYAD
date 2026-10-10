# KAYAD Phase 9 — Repository Error Fixes & Production Cleanup

## Scope
This pass was performed against the Phase 8 repository snapshot and focused on concrete production defects found in the transaction/escrow/ledger paths plus removal of unused production-facing mock marketplace code.

## Fixed
- Corrected direct Supabase ledger queries to use the authoritative snake_case columns `user_id` and `created_at`.
- Made successful M-Pesa callbacks retry-safe when downstream settlement fails: the callback is only finalized after authoritative settlement work completes.
- Made purchase escrow creation idempotent by payment reference so a provider retry cannot create duplicate escrows.
- Added a forward migration that removes vehicles inserted by the historical demo-vehicle seed from databases where those rows exist.
- Removed unused legacy production-facing marketplace components containing hard-coded vehicle demo data.
- Removed unused non-test mock datasets from `src/data/` that had no production imports.

## Validation
- JavaScript syntax checks passed for the changed backend services.
- Repository scans found no remaining `MOCK_VEHICLES` / `MOCK_VEHICLE` references in source, and no imports of the deleted legacy marketplace tree.
- The authoritative Phase 8 migration defines `cars.sold` and `cars.isPaid`, so escrow release/refund references to those columns are valid.
- Full Vite/test execution was environment-limited in this build container because dependencies are not installed and the available Node.js version (`22.16.0`) is below the repository's `jsdom@30.0.1` engine requirement (`^22.22.2 || ^24.15.0 || >=26`).

## Important
This archive is a cleaned engineering snapshot. It is **not** a claim of production certification. Run `npm install`, `npm run build`, and `npm test` on the Windows development environment before committing this pass.
