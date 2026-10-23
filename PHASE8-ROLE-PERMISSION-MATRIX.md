# KAYAD Phase 8 — Role and Permission Matrix

Source of truth: `backend/config/roles.js` (`ROLE_HIERARCHY`, `STAFF_ROLES`, `ROLE_PERMISSIONS`, `PERM`). This table is generated from the source export, not from UI labels.

## Existing roles and canonical role permissions

- **`user`**: no role-default permissions
- **`individual_seller`**: `manage_cars`
- **`dealer`**: `manage_cars`, `manage_auctions`
- **`ghost_checker`**: `manage_inspections`, `view_analytics`
- **`moderator`**: `manage_moderation`, `view_logs`
- **`ad_manager`**: `manage_ads`, `view_analytics`
- **`marketing`**: `view_analytics`, `manage_ads`
- **`escrow_officer`**: `view_escrow`, `operate_escrow`, `view_escrow_audit`, `view_logs`
- **`technical_support`**: `manage_support`, `support_agent`, `view_logs`, `manage_users`
- **`hr`**: `manage_staff`, `manage_users`
- **`accounts`**: `manage_finance`, `view_analytics`, `view_logs`, `view_escrow`, `settle_escrow_payout`, `reconcile_escrow`, `view_escrow_audit`
- **`admin`**: `manage_cars`, `manage_auctions`, `manage_users`, `manage_escrow`, `view_escrow`, `operate_escrow`, `approve_escrow_release`, `approve_escrow_refund`, `settle_escrow_payout`, `reconcile_escrow`, `configure_escrow`, `view_escrow_audit`, `emergency_escrow_control`, `manage_ads`, `manage_moderation`, `manage_support`, `support_oversight`, `manage_finance`, `manage_staff`, `view_logs`, `view_analytics`, `manage_inspections`, `manage_platform`, `bypass_rate_limit`
- **`superadmin`**: `manage_cars`, `manage_auctions`, `manage_users`, `manage_escrow`, `view_escrow`, `operate_escrow`, `approve_escrow_release`, `approve_escrow_refund`, `settle_escrow_payout`, `reconcile_escrow`, `configure_escrow`, `view_escrow_audit`, `emergency_escrow_control`, `manage_ads`, `manage_moderation`, `manage_support`, `support_agent`, `support_oversight`, `manage_finance`, `manage_staff`, `view_logs`, `view_analytics`, `manage_inspections`, `manage_platform`, `bypass_rate_limit`, `full_access`

## Existing privileged staff governance contract

- Staff directory, role catalog, permission catalog, role update, permission update and staff mutation routes are guarded by `authorize("superadmin")` plus `systemOwnerOnly` in `backend/routes/adminRoutes.js`.
- The UI separately checks `me.isOwner === true`; this is presentation defense, not a replacement for backend authorization.
- `superadmin` is excluded from assignable staff role catalog and staff creation; owner provisioning is handled by the existing dedicated owner flow.
- `ghost_checker` is an existing role with inspection/analytics permissions and is present in the role catalog and role-update route. The current staff-create route does not permit it; Phase 8 aligns the create UI with that existing contract rather than expanding the backend role-creation policy.
- Existing focused authorization tests cover non-owner denials, owner-only operations, self-escalation/privileged role rejection, permission allowlisting and protection of other superadmin accounts. Runtime execution remains blocked in this environment.

## High-risk boundaries confirmed in existing tests/source

- `escrow_officer` is not granted `approve_escrow_release`, `approve_escrow_refund` or `manage_finance` by its role defaults.
- `accounts` has existing finance/reconciliation permissions but is not granted escrow release/refund approval by its role defaults.
- `ghost_checker` remains limited to `manage_inspections` and `view_analytics` in the canonical role map.
- No role, permission key, hierarchy entry or inheritance rule was added in Phase 8.
