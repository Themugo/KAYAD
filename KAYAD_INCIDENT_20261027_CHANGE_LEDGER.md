# Change ledger — Incident 2026-10-27 (base: Phase 16C package, unchanged archive retained)
| File | Change | Why |
|---|---|---|
| backend/middleware/maintenanceLane.js | NEW | dependency-free allow-list of 7 requests passed through the maintenance gate; `maintenanceResponse`; `enforceMaintenanceOwnerLane` |
| backend/middleware/systemCheck.js | MODIFIED | maintenance: lane requests continue to their own handlers; all others 503 with code/`Retry-After`; helpers re-exported |
| backend/middleware/auth.js | MODIFIED | `protect`: non-owners refused (503) on the lane while maintenance is on |
| backend/controllers/authController.js | MODIFIED | `login` (after password check, before MFA/session) and `refreshToken`: non-owners refused (503) |
| src/pages/admin/PanicRoom.jsx | MODIFIED | confirm text for GLOBAL MAINTENANCE states the total blackout and how to end it |
| backend/tests/regression/incident20261027MaintenanceOwnerLane.test.js | NEW | 34 Jest tests |
| src/__tests__/pages/PanicRoom.maintenanceWarning.test.jsx | NEW | source-contract tests |
| runbooks/phase16d-incident-20261027/http/e2e_maintenance_owner_lockout.cjs | NEW | 32-check DB-backed E2E (fails before the fix) |
| runbooks/phase16d-incident-20261027/http/e2e_maintenance_owner_mfa_membership.cjs | NEW | 10-check owner-mode E2E (MFA, recovery code, revoked membership) |
| runbooks/phase16d-incident-20261027/http/browser_maintenance_owner_recovery.cjs | NEW | 8-check real-browser journey |
| KAYAD_INCIDENT_20261027_*.md, validation-logs/incident-20261027/ | NEW | reports and evidence |
No migration, no env/config change, no dependency change. Hosted untouched.
