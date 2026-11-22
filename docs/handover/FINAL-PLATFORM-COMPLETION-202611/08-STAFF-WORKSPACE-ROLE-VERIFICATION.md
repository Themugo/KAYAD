# 08 - Staff workspace role verification

**Roles.** The brief says nine; `backend/config/roles.js` (`STAFF_ROLES`) lists **ten**: admin, superadmin, marketing, technical_support, hr, accounts, escrow_officer, ad_manager, moderator, ghost_checker. No role was invented or added; permissions were not widened. (The earlier "nine" probably excludes superadmin or the platform-owner identity; not resolvable from code.)

## Evidence
| Area | Evidence | Status |
|---|---|---|
| Login and admin shell as each role (all 10), UI over 53 routes, per-role nav and page states | `BRAND-ADMIN-CONSOLIDATION-20261122/11-STAFF-WORKSPACE-PERMISSION-EVIDENCE.md`, `evidence/admin-ui-<role>.json`, screenshots 1440x900 | VERIFIED on the previous phase's code; NOT re-run on the final code. Desktop dashboard and Listings per role only; **mobile screenshots per role: NOT DONE** |
| Direct API reads (39 admin GET endpoints) as anonymous, personal, dealer and all 10 roles | same doc, `api-permission-matrix.json` | VERIFIED (previous phase) |
| **Direct API writes, denied side** | new journey `ci/db-journeys/14_staff_role_write_matrix.mjs`, `evidence/staff-write-matrix.json`, `evidence/14_staff_role_write_matrix.log`: 35 admin write routes x (8 non-admin staff roles + personal user + dealer) + anonymous = 385 real HTTP calls on a disposable stack; every role the route guard does not allow got 403 and anonymous got 401/403; 0 violations | VERIFIED |
| Guard resolution | the journey derives the allowed roles from the route source (`adminOrSuper`, `requirePermission(PERMISSIONS.X)` with aliases read from `backend/middleware/rbac.js`) and the central `ROLE_PERMISSIONS`; an earlier run flagged `accounts` on `PATCH /dealers/:id/package`, which was a parser error (`MANAGE_PAYMENTS` aliases `MANAGE_FINANCE`, which `accounts` holds), fixed in the test, not in the backend | VERIFIED |

## Limits (labelled)
- Coverage: 35 of 51 write routes in `adminRoutes.js`; 16 have guards the static analysis could not resolve (inline checks): NOT TESTED. Other admin-mounted routers (inspection governance, etc.) and global-switch routes (maintenance, panic, lockdown, recovery) were deliberately skipped.
- **Permitted writes:** of the 35 routes only 2 are open to any non-admin staff role (`accounts`; 1 of those reached its handler, the other refused at an inner check). Every other route is admin/superadmin-only, so the "permitted write succeeds" side is NOT TESTED per role (the harness does not call as admin/superadmin to avoid changing global state with empty bodies). Permitted writes for admin flows are covered by the existing journeys.
- Cross-business isolation for dealer staff (a dealer's team member reading or writing another dealer's data), logout and session-expiry behaviour per role: NOT TESTED this phase. Existing dealer journeys cover owner-to-owner isolation only.
- Mobile screenshots per role, role-by-action matrix beyond the above: NOT DONE.

## Existing findings still open (previous phase, unchanged)
`/admin/config` and `/admin/feedback` render their shell for roles whose API calls are refused (data is protected); `/api/bids/admin/all`, `/api/admin/alerts`, `/api/admin/stats` are readable by every staff role. These are least-privilege observations needing owner authority; permissions were not changed.
