# KAYAD Stage 5F.5 — Identity and Permission Matrix

## 1. Identity chain (verified end to end)

1. Login issues a JWT. The token is only a *claim of user id*.
2. `protect` re-reads the account on **every request** (banned, deactivated, verified, role, permission grants/revokes) from the database.
3. `role` / `effectiveRole` are derived server-side. The owner is given effective role `webhoist`. Client JWT claims, request headers and body fields cannot set or raise either (tests: forged claims, forged `localStorage`, forged `x-role`).
4. Permissions = role defaults ∪ explicit grants − explicit revokes (`getEffectivePermissions`); `superadmin` holds all.
5. Admin router: `protect → adminOnly → path-layer permission guess (fail-closed) → route-local guards → audit`. Denials write an `access_denied` audit row.
6. The frontend (`src/utils/permissions.ts`) only mirrors this to hide menus; it is not an authority. A parity test now fails if the mirror drifts (D-16).

Owner model (`backend/config/owners.js`):
- **Legacy mode** (no `owner_memberships` snapshot — the hosted state): designated email = owner; lock-out-proof (OD-3).
- **DB mode**: owner bound to exact user id with real-time banned/deactivated/verified checks. The primary owner cannot be suspended through any staff endpoint (D-5).

## 2. Role default permissions (server catalogue, `ROLE_PERMISSIONS`)

| Role | # | Defaults |
|---|---|---|
| user | 0 | — |
| individual_seller | 1 | manage_cars |
| dealer | 2 | manage_cars, manage_auctions |
| ghost_checker | 2 | manage_inspections, view_analytics |
| moderator | 2 | manage_moderation, view_logs |
| ad_manager | 2 | manage_ads, view_analytics |
| marketing | 2 | view_analytics, manage_ads |
| escrow_officer | 4 | view_escrow, operate_escrow, view_escrow_audit, view_logs |
| technical_support | 4 | manage_support, support_agent, view_logs, manage_users |
| hr | 2 | manage_staff, manage_users |
| accounts | 7 | manage_finance, view_analytics, view_logs, view_escrow, settle_escrow_payout, reconcile_escrow, view_escrow_audit |
| admin | 24 | manage_cars, manage_auctions, manage_users, manage_escrow, view_escrow, operate_escrow, approve_escrow_release, approve_escrow_refund, settle_escrow_payout, reconcile_escrow, configure_escrow, view_escrow_audit, emergency_escrow_control, manage_ads, manage_moderation, manage_support, support_oversight, manage_finance, manage_staff, view_logs, view_analytics, manage_inspections, manage_platform, bypass_rate_limit |
| superadmin | 26 | all (incl. support_agent, full_access) |

25 permissions are assignable by grant/revoke. Owner (`webhoist`) is above superadmin for owner-only operations.

## 3. Owner-only operations (enforced server-side)

Staff governance: create staff account, delete staff account, change staff role/ban (`PUT /staff/:id`), grant/revoke permissions, owner management (add/remove/transfer designated owner). A non-owner admin or superadmin receives 403; denials are audited. Staff-governance successes write before/after audit rows (D-15).

## 4. Corrections made (least privilege, only where source proved excess)

| Route | Before | After |
|---|---|---|
| PATCH /admin/dealers/:id/package | any staff | + `manage_payments` (D-1) |
| POST /admin/zero-cost-onboarding | any staff | admin/superadmin + `manage_payments` (D-2) |
| POST /admin/audit-log | arbitrary action names | namespaced `manual.*`, validated (D-3) |
| audit-log / chat-support / inspection / staff path guards | silent no-op (undefined keys) | enforced, fail-closed (D-6) |

## 5. Role × route matrix

A hand-authored matrix of **280 role×route expectations** is executed by `backend/tests/regression/stage5f5RoleRouteMatrix.test.js` against the real routers (mocked data layer), and **88 checks** by `role_api_5f5.mjs` against the real local stack. Route inventory: 1277 route rows, 1157 authenticated, 120 unauthenticated, 30 unauthenticated mutating (register/login/refresh/forgot/reset, provider webhooks/callbacks, public analytics/click/favourite, contact, inspector apply) — all reviewed, none new. Inventory: `runbooks/stage5f5-admin-governance-20261020/tools/route_inventory_5f5.tsv`.

Summary of the admin surface by role (✔ allowed, ✖ 403, R read-only any-staff):

| Capability | owner | superadmin | admin | accounts | escrow_officer | hr | moderator | support | ad_mgr/marketing | ghost_checker | dealer/seller/user |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Staff create/delete/role/permissions | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Dealer package / bulk onboarding | ✔ | ✔ | ✔ | ✔ (`manage_payments` via finance) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Dealer/listing decisions | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | listing only | ✖ | ✖ | ✖ | ✖ |
| Escrow release/refund/settle | ✔ | ✔ | ✔ | settle/reconcile | operate | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Support/chat | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ | ✖ | ✖ |
| Audit log read | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ | ✖ |
| Stats/alerts/health | ✔ | ✔ | ✔ | R | R | R | R | R | R | R | ✖ |

(The test file is authoritative for exact route-level results; this table is a reading aid.)

## 6. Superadmin-capable (non-owner) operations — OD-1

Kill-switch, recover, Daraja test, user delete/deactivate remain available to a non-owner `superadmin`. Not changed: restricting them is an owner decision.
