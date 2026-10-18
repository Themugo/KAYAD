# KAYAD Owner Identity Convergence — 2026-10-15

## Scope
A bounded source-level correction pass based on the account/admin audit. This package does not connect to or modify production services or data.

## Corrections
1. `backend/controllers/authController.js` now imports `isOwnerEmail` from the canonical `backend/config/owners.js`. This removes the controller's duplicate `WEBHOIST_EMAIL`-only allowlist, so login serialization and middleware authorization share normalization and support both `WEBHOIST_EMAIL` and `WEBHOIST_EMAILS`.
2. `backend/seed.js` now fails closed in `NODE_ENV=production` before opening a Supabase connection. The legacy provisioner independently upserts `users` and `user_auth`; it is not an approved atomic recovery mechanism and could overwrite an existing identity or leave partial state.
3. The legacy seed normalizes configured owner addresses before using them and propagates per-owner errors rather than swallowing them and returning a misleading partial-success result.
4. Added `scripts/validate-owner-identity-convergence.mjs` and npm script `validate:owner-identity-convergence` to guard the source contracts.

## Validation performed
- `node --check backend/controllers/authController.js` — PASS
- `node --check backend/seed.js` — PASS
- `node scripts/validate-owner-identity-convergence.mjs` — PASS, 7/7
- `npm run validate:recovery` — PASS, 19/19

## Explicitly not certified
- No full backend/frontend test suite was run; this extracted source package does not include installed `node_modules`.
- No live login, password reset, owner bootstrap, production schema, RLS/grant, provider, or deployment certification was performed.
- No database, environment variable, migration history, deployed service, or existing dealer identity was changed.
- Production owner recovery remains blocked until a transactional, auditable bootstrap/recovery path is designed and verified against the actual production schema. Do not run the legacy seed in production.

## Follow-up blockers
- Resolve the missing `public.kayad_register_identity_atomic` RPC through a migration-drift reconciliation and approved staging certification process; do not blindly push migrations into production.
- Reconcile owner environment configuration in the deployment without exposing secret values. Verify that the intended owner email has a corresponding existing `users` + `user_auth` identity before attempting password recovery.
- Build an atomic owner-recovery path that refuses to overwrite an existing identity, records an audit event, validates preconditions, and fails transactionally if any step fails.
