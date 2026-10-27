# Change ledger — selective maintenance & owner recovery (2026-10-27)

Base: `KAYAD-INCIDENT-20261027-OWNER-MAINTENANCE-LANE-FIX.zip` (original archive, sidecar and integrity log untouched). Everything below is local; nothing was committed, pushed or deployed; no hosted data was changed.

## Audit of the incident fix (what was preserved, what was replaced)
| Item | Finding | Action |
|---|---|---|
| `middleware/maintenanceLane.js` (owner-only lane) | Correct, but owner-only and hard-wired to "maintenance = global" | **Replaced** by the central policy; the owner lane behaviour (login, `/auth/me`, refresh, logout, recover while maintenance is on) is preserved and re-tested (E2E lockout 32/32, MFA/membership 13/13) |
| `/auth/me` session-verification endpoint | Required for owner recovery | Kept in the `session` class; allowed for owners and technical staff under global |
| MFA | Owner login/step-up unchanged | Unchanged; re-verified (owner governance 73/73, 16B 41/41, 16C 40/40 + 8/8) |
| Legacy `kill-switch full_maintenance` / `recover maintenance` | Global-only, last-write-wins, no audit of scope | Return 400 `MAINTENANCE_USE_SCOPED_CONTROL`; feature switches kept, now atomic |

## New files
| File | Purpose |
|---|---|
| `backend/config/maintenancePolicy.js` | Pure central policy: scopes, route classes, identities, `decide`, state normalisation |
| `backend/middleware/maintenanceEnforcement.js` | Identity-aware gate (`enforceMaintenance`), dealer-team lookup (10 s cache), honest 503 on lookup failure |
| `backend/services/maintenanceControl.service.js` | CAS state writer, activate/recover, validation, audit |
| `backend/routes/maintenanceControlRoutes.js` | `/api/admin/system/maintenance/{status,recover,activate}` |
| `backend/tests/regression/maintenancePolicyMatrix.test.js` (37), `maintenanceControlService.test.js` (16), `maintenanceEnforcementPolicy.test.js` (19) | Unit/contract regression |
| `src/components/admin/MaintenanceControl.jsx` | Panic Room scope picker, impact preview, confirmation, status, recovery (server-confirmed state only) |
| `src/pages/admin/PlatformRecovery.jsx` | Permission-gated recovery page for technical staff |
| `src/__tests__/components/admin/MaintenanceControlPanel.test.jsx` (14), `src/__tests__/platformRecoveryPermission.test.ts` (2) | Frontend regression |
| `runbooks/phase16e-maintenance-scopes-20261027/http/e2e_maintenance_scopes.cjs` (67), `.../ui/browser_maintenance_scopes.cjs` (19) | Real-stack DB E2E and real-browser journey |

## Modified files
| File | Change |
|---|---|
| `backend/middleware/systemCheck.js` | Rewritten around the policy: sets `req.maintenance`, applies pre-auth decision (global, anonymous registration); `/bid` & `/payment` feature pauses and fail-open-on-read-error unchanged |
| `backend/middleware/auth.js` | `protect()` calls `enforceMaintenance` after owner/verification gates (stale sessions and tokens cannot bypass) |
| `backend/controllers/authController.js` | login (after password match, before verification/MFA/session issue) and refresh call `enforceMaintenance`; `serializeUser` adds a display-only `platformRecovery` hint for non-owner holders |
| `backend/routes/adminRoutes.js` | legacy kill-switch/recover refactor (see above); feature switches via atomic writer |
| `backend/server.js` | mounts the control routes before `/api/admin` |
| `backend/config/roles.js`, `src/utils/permissions.ts` | `PERM.PLATFORM_RECOVERY = "platform_recovery"` (assignable, labelled, **in no role default**); page permission map |
| `backend/utils/auditAfterCommit.js` | maintenance activate/update/scope change/recover are CRITICAL audit actions |
| `src/api/api.exports.ts` | `maintenanceStatus/Activate/Recover` |
| `src/pages/admin/PanicRoom.jsx` | embeds `MaintenanceControl`; feature kill-switch handler only |
| `src/context/AuthContext.tsx`, `src/components/admin/AdminRouteSurface.tsx`, `src/components/admin/AdminSidebar.tsx` | `/admin/platform-recovery` route (no role opens it), lazy page, permission-gated sidebar link (`LifeBuoy`) |
| `scripts/validate-super-admin-phase1-navigation.mjs` | expected destinations 30 → 31 (adds `/admin/platform-recovery`); match stays exact. Justification: the new link is permission-only (invisible to every role without the explicit grant) and the validator is an exact-set guard, precedent: Phase 13H |
| `runbooks/phase16d-incident-20261027/http/e2e_maintenance_owner_lockout.cjs`, `e2e_maintenance_owner_mfa_membership.cjs` | adapted to the new control endpoint (password step-up); same assertions plus step-up checks |

## Deleted (superseded)
`backend/middleware/maintenanceLane.js`, `backend/tests/regression/incident20261027MaintenanceOwnerLane.test.js`, `src/__tests__/pages/PanicRoom.maintenanceWarning.test.jsx`. Their coverage moved into the new suites.

## Not changed
Public marketplace routes, design/pages, rate limiters, CSRF, MFA services, owner rank protection, owner tables/migrations, hosted data, env vars. No database migration is required.
