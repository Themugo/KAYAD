# KAYAD Stage 5F.4 — Role Governance Matrix

| Capability | System Owner | Ordinary Super Admin | Departmental/Admin staff | Verification status |
|---|---|---|---|---|
| View staff roster and permission catalog | Allowed by owner guard | Denied by owner guard | Denied by owner guard | Static source check only |
| Create staff / assign role | Allowed by owner guard plus existing route guard | Denied by owner guard | Denied by owner guard | Static source check only |
| Grant/revoke staff permissions | Allowed by owner guard plus existing route guard | Denied by owner guard | Denied by owner guard | Static source check only |
| Change/delete staff | Allowed by owner guard plus existing route guard | Denied by owner guard | Denied by owner guard | Static source check only |
| Seed departmental staff | Allowed by owner guard plus existing route guard | Denied by owner guard | Denied by owner guard | Static source check only |
| Operate other privileged platform modules | Existing policy, unchanged | Existing superadmin bypass remains | Role/permission policy remains | Needs route-by-route runtime audit |
| Owner membership governance | Existing owner governance service and policy | Not granted by staff role alone | Not granted | Migration/runtime state not checked |

## Important boundaries
- The frontend owner marker is for presentation only; backend `isOwnerUser(req.user)` is the security boundary.
- A UI-visible role is not proof of backend authorization.
- This matrix does not certify the existing full-access shortcut for legacy non-owner superadmin accounts or the broad default permission set for `admin`.
- No account records were changed.
