# Phase 29 — Authentication Boundary & Development Setup Reconciliation

## Objective
Reconcile the committed Supabase migration history and local Windows setup with KAYAD's established production architecture.

## Changes
- Added `20260902130000_phase29_auth_boundary_reconciliation.sql` as a corrective migration.
- Removed the legacy `auth.users` profile-creation trigger and function at migration time.
- Removed the legacy `auth.uid()` policies introduced by the incompatible Supabase-Auth-oriented migration.
- Preserved RLS as a default-deny database boundary; KAYAD's backend service-role connection and Express/JWT authorization remain authoritative.
- Repaired `setup-windows.bat`, which referenced a nonexistent `frontend/` directory, MongoDB, and `npm install`.
- Windows setup now runs from the repository root, uses `npm ci`, enforces Node 22+, and documents the actual root frontend/backend layout.

## Validation
- `scripts/validate-phase29.mjs` passes.
- Migration history retains the old migration unchanged and applies a versioned corrective migration afterward, avoiding silent rewriting of previously-applied migration history.
- No live Supabase dashboard changes were assumed or claimed.
