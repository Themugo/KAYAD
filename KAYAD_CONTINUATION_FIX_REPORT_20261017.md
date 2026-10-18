# KAYAD continuation fixes — 2026-10-17

## Foundation
- Continued from `KAYAD-DESIGN-UPGRADE-20261016.zip`.
- Input SHA-256: `e2406a6a5bcfa2c9a4b8f5fa491bdd4a8514f06c13ea78bae79fe3edea3210d3`.
- No repository reset, redesign, deployment, production connection, migration execution, account mutation, or Git commit/push was performed.

## Changes in this continuation

1. **`/api/v1/auth/me` now uses the canonical safe user serializer.**
   - Exported `serializeUser` from `backend/controllers/authController.js`.
   - The `/me` route now returns `serializeUser(user)` rather than a raw database user object with only `password` excluded. This keeps the response field allowlist and owner-role normalization consistent with login/profile responses.

2. **Governance audit persistence errors are no longer silently swallowed.**
   - `backend/controllers/governanceController.js` now awaits `AuditLog.create` without an empty catch.
   - The realtime control-plane event is emitted only after the audit insert succeeds.
   - **Remaining limitation:** the domain write and audit insert are not one database transaction. If audit persistence fails after a domain write, the domain write may already have occurred while the request reports an error. Atomic domain-write-plus-audit persistence remains a staging-gated follow-up, not certified here.

3. **Governance mutation payloads reject reserved control/audit fields.**
   - Generic governance create/update handlers reject caller-supplied identifiers, audit timestamps/actors, review/approval/submission metadata, checksums, and generic status/stage changes.
   - Risk status changes now use an explicit status allowlist (`open`, `active`, `monitoring`, `resolved`, `escalated`, `mitigated`) and write only the status plus server-controlled audit metadata.
   - Release status updates no longer spread the full request body into the database update; only the requested status and server-controlled update metadata are written. The current migration defines no release-status CHECK constraint, so the accepted status remains bounded to a non-empty string of at most 40 characters pending a formally agreed lifecycle enum.

4. **Validation contract updated** to check safe `/me` serialization, propagated audit failures, reserved governance-field rejection, and risk-status allowlisting.

## Validation performed in this environment

- `node --check backend/controllers/authController.js` — PASS
- `node --check backend/routes/authRoutes.js` — PASS
- `node --check backend/controllers/governanceController.js` — PASS
- `node --check scripts/validate-master-identity-authz-corrections.mjs` — PASS
- `node scripts/validate-owner-identity-convergence.mjs` — PASS, 7/7
- `node scripts/validate-master-identity-authz-corrections.mjs` — PASS, 14/14
- `node scripts/validate-governance-lifecycle.mjs` — PASS, 53/53

## Not certified

- `npm ci` initially refused because the available runtime is Node `v22.16.0`, while the project requires Node `>=22.22.2`.
- A retry with `npm ci --engine-strict=false` did not complete within the execution window; dependency installation was incomplete. Therefore no full Vitest run, TypeScript check, Vite production build, browser E2E, or complete dependency-security audit is claimed for this continuation.
- Staging database schema/migration reconciliation, transactional audit durability, owner-recovery rehearsal, live login, socket authorization, production deployment, and financial runtime checks remain blocked until verified isolated staging access and the required Node runtime are available.

## Safety boundary

This ZIP is a local continuation checkpoint only. It is not production-certified. Do not run owner recovery, seed provisioning, migration repair/push, financial actions, or production deployment based solely on this report.
