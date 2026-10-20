# KAYAD Stage 5F.5 — Defect Register

Foundation: KAYAD-STAGE5F4-OWNER-ROLE-GOVERNANCE-FULL-PROJECT-20261020.zip (SHA-256 c637876836f2783bbbd8cba165ad81a44224fa216e3bb8a9de4b86bade4e0c43).
Every "Fixed" row has a regression test that was mutation-checked (fails without the fix) unless marked otherwise. Nothing was applied to a hosted system.

## A. Defects found and fixed in this stage

| ID | Severity | Defect (proved from source and/or the disposable real stack) | Fix | Evidence |
|---|---|---|---|---|
| D-1 | High | `PATCH /api/admin/dealers/:id/package` had no route-level permission: any staff member passing the coarse path guess could grant a dealer package. | Requires `MANAGE_PAYMENTS` (finance) in addition to admin gate. | stage5f5AdminGovernance.test.js, role matrix, role_api_5f5 |
| D-2 | High | `POST /api/admin/zero-cost-onboarding` (bulk dealer onboarding at zero cost) open to any staff role. | `adminOrSuper` + `MANAGE_PAYMENTS`. | same |
| D-3 | Medium | `POST /api/admin/audit-log` let a caller write arbitrary action names/details, so forged entries looked like system events. | Action charset/length validated; details bounded plain object; stored as `manual.<action>` with `manualEntry: true`. | same |
| D-4 | Low/Med | `PUT /api/admin/staff/:id` accepted non-boolean `isBanned` and unbounded `name`. | Strict validation (boolean; trimmed non-empty name ≤120). | stage5f5StaffGovernance.test.js |
| D-5 | Med/High | The primary owner could be suspended through `PUT /staff/:id` body `isBanned`. | `protectAccount` rule 4 blocks `true`/`"true"` for the primary owner. | stage5f5StaffGovernance.test.js, stage5f5OwnerIdentityLifecycle.test.js |
| D-6 | High | Four permission names used by the path-layer guard (`MANAGE_STAFF`, `MANAGE_INSPECTIONS`, `MANAGE_SUPPORT`/`VIEW_LOGS`, `MANAGE_MODERATION`) were undefined in `rbac.js`, so the guard silently became a no-op for audit-log, chat/support, inspection and staff paths. | Aliases defined; guard now fails closed (`PERMISSION_NOT_CONFIGURED` 403); chat/support is any-of support∪moderation. | stage5f5PermissionKeysDefined.test.js, role matrix (280 cases) |
| D-7 | Medium | Command-centre snapshot undercounted (capped fetch) and fabricated zeros when a source failed. | Exact `count()` per metric via `Promise.allSettled`; unreadable ⇒ `null` + `unavailable[]`. | stage5f5CommandCenterSnapshot.test.js (17) |
| D-8 | Medium | `/api/admin/stats` was all-or-nothing (one failing source blanked every tile — the hosted-database symptom) and defaulted failures to 0. | Per-metric settle; `null` + `unavailable`; real zero stays 0. | stage5f5AdminStatsContract.test.js (8) |
| D-9 | Medium | "Pending dealers" tile and the list it opened disagreed (list included individual sellers / all roles). | Tile opens Users filtered `role=dealer&pendingApproval=true`; backend honours explicit role. | adminCommandCentre.test.tsx, ui_5f5_admin C2 |
| D-10 | Low | Unrouted `EnterpriseCommandCenter.jsx` showed hard-coded "Live" and `?? 0` values. | Removed; "Data coverage" Complete/Partial, `—` for unknown. | source review |
| D-11 | Medium | A 403 on one command-centre source was displayed as an outage. | Per-source 403 ⇒ "Not included in your role … access boundary, not an outage"; other failures still show the outage banner. | adminCommandCentre.test.tsx |
| D-12 | High (hosted-like) | Granting staff permissions returned 500: handler wrote nonexistent columns `permissions_updated_at/by`. | Write only existing columns; read returns `updatedAt: null`. | real stack (role_api_5f5), staff governance test |
| D-13 | High | Staff list returned 500: selected nonexistent `users.last_login`. | Select `lastLoginAt`, map to `lastLogin`. | real stack |
| D-14 | Medium | Path-layer regex matched UUID fragments (a dealer id beginning "ad…" was treated as an ads route and refused "Missing permission: manage_ads"). | Path normalised (UUID/numeric → `:id`), ads regex anchored on word boundaries. | stage5f5AdminGovernance.test.js |
| D-15 | Medium | Staff-governance changes had no before/after audit rows. | Four `auditAfterCommit` events (permissions changed, account created, staff record updated, account deleted) with before/after, no passwords/emails; "staff governance" added to CRITICAL pattern. | stage5f5StaffGovernance.test.js, stage4AuditAfterCommit |
| D-16 | Medium | UI permission mirror `src/utils/permissions.ts` had drifted from the server: role `accounts` lacked escrow finance permissions, hiding menu entries it is entitled to. | Mirror aligned to `backend/config/roles.js`; parity test added (5). | src/__tests__/utils/permissionsParity.test.ts |
| D-17 | Medium (a11y) | Command centre failed WCAG 2 A/AA colour contrast on phone/tablet/desktop (axe: #94A3B8, #718792, #647D86, #138A83 text). | Text colours darkened (`StatWidget`, table header, AdminView labels). | ui_5f5_admin C9 (axe), 0 serious/critical |

## B. Findings recorded, NOT changed (pre-existing / out of scope / owner decision)

| ID | Finding | Why not changed |
|---|---|---|
| F-1 | `GET /api/admin/chats` returns 500 on a migration-built schema (legacy camelCase `chats` table; selects `updated_at`). | Needs a data-model decision; hosted-DB shape unknown. |
| F-2 | `mediaEventRoutes.js` is unmounted dead code referencing nonexistent roles. | Not reachable; no runtime risk. |
| F-3 | Public favourite counter is `optionalAuth` + rate-limited. | Low; by design. |
| F-4 | `/api/admin/stats` is cached 300 s (`CACHE_TTL.STATS`), so tiles can lag the database by up to 5 minutes; a response containing `unavailable` is cached too. | Product decision (staleness vs load). Harness restarts the backend to clear it. |
| F-5 | `escrow_officer` cannot use admin `/escrow*` routes (path layer needs `MANAGE_ESCROW`); the UI uses `/api/escrow`. | Works as shipped; confirm intended. |
| F-6 | `DashboardHub` calls `/command-center/snapshot` for all staff; non-admin gets 403 and sees "—". | Truthful; cosmetic. |

## C. Owner decisions still open (no change made without a policy)

| ID | Decision needed |
|---|---|
| OD-1 | Non-owner `superadmin` holds owner-class powers (kill-switch, recover, Daraja test, user delete/deactivate). Restrict to the owner, or keep? |
| OD-2 | Default `admin` role holds 24 permissions incl. `manage_platform`, `bypass_rate_limit`, and escrow approve **and** settle. Narrow the default? |
| OD-3 | Legacy mode (hosted state, no `owner_memberships`): designated email is lock-out-proof; ban/deactivation does not remove it. DB mode binds to user id with live checks. Enable DB mode when the hosted schema is brought forward? |
| OD-4 | Command-centre `allowRoles` lists nonexistent roles (executive/engineer/manager). Harmless; clean up? |
| OD-5 | Any-staff reads (`/stats`, `/alerts`, `/system/health`, reviews, referrals, chats, market-data). Narrow? |
| OD-6 | No maker-checker policy exists for refunds/payouts (admin can request, approve and settle). Separation of duties was NOT added because no existing policy requires it. Define a policy? |
| OD-7 | Hosted database is behind the code (63 migrations). Needs an owner-approved migration window; nothing was applied. |
