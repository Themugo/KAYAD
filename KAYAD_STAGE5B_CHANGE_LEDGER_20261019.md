# Change ledger — Stage 5B (base: verified Stage 5A ZIP, sha256 8aacd7db95b94085c1836f5e98e2bc33ccfc41fb1504d55f9163adc86d0c13fc)

No commit, push, deploy, hosted migration or hosted account change was made. Windows tree untouched (unreachable).

## Backend — new
- `backend/services/ownerRegistry.service.js` — membership snapshot cache (TTL, single-flight, fail-closed, legacy fallback while store absent)
- `backend/services/ownerGovernance.service.js` — invite/resend/revoke/remove/recover/accept, bootstrap, emergency recovery, step-up, audit, notices
- `backend/routes/ownerRoutes.js` — `/api/owner` (owner-only) and `/api/owner-access` (token-gated public)
- `backend/scripts/owner-bootstrap.mjs` (+ `npm run owner:bootstrap`) — operator CLI
## Backend — modified
- `config/owners.js` (id-aware predicates; env list = designation), `middleware/auth.js`, `controllers/authController.js`, `services/socketAuth.service.js` (one shared predicate everywhere), `server.js`, `routes/v1.js` (mounts, registry middleware), `services/email.service.js` (invitation/notice templates), `services/communicationEvents.service.js` + `communicationGateway.service.js` (two events; invitation body redacted), `seed.js` (legacy pre-verified owner provisioning blocked in production without named override), `package.json` (script).
## Frontend
- new `src/pages/admin/AdminOwnerManagement.jsx`, `src/pages/OwnerInviteAccept.jsx`; modified `src/features/AdminView.tsx` (Owners tab for owners), `src/App.tsx` (`/owner-invite`), `src/api/api.exports.ts` (`ownerAPI`).
## Database (CANDIDATE — not in `supabase/migrations`, not applied anywhere shared)
- `runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql`
## Tests
- Jest: `stage5bOwnerRegistry` (27), `stage5bOwnerRoutes` (13), `stage5bOwnerMigrationContract` (12), `stage5bOwnerBootstrapCli` (5) = +57 tests / +4 suites vs 5A.
- Vitest: `src/__tests__/pages/admin/AdminOwnerManagement.test.jsx` (+12).
- Intentional pin updates (same exemption semantics, new predicate): `stage4aGateClosure.test.js` G7; `scripts/validate-owner-identity-convergence.mjs` login-import check.
- PG: `pg-tests/owner_governance_pg_checks.sh` (97); real-stack API journey `evidence/.../journeys/gov_api.mjs` (136); browser journey `owner_ui.mjs` (25).
## Behaviour changes to be aware of
- Once the migration is applied the env owner list **stops granting privilege**; owners must accept bootstrap invitations (runbook §1, rollback plan).
- Wrong step-up password returns **403** (not 401) so the SPA does not treat it as session expiry.
## Docs (all under `runbooks/stage5b-owner-governance-20261019/`)
OWNER_BOOTSTRAP_AND_RECOVERY_RUNBOOK, OWNER_MANAGEMENT_GUIDE, AUTHORIZATION_MATRIX_5B, OWNER_IDENTITY_AND_SESSION_SECURITY_AUDIT_5B, MIGRATION_PREFLIGHT_READONLY_5B.sql, GATE_ROLLBACK_AND_RECOVERY_PLAN_5B, OWNER_DECISION_REGISTER_STAGE5B, EMAIL_TEST_STATUS_5B, WINDOWS_TREE_STATUS_5B, TEST_EVIDENCE_MATRIX_5B; reports at repo root.
## Test fixtures note
Journey scripts contain disposable-database test passwords (e.g. `OwnerOne!Pass#2026`) used only against the isolated stack; they are not product defaults and no product file contains a credential.
