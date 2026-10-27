# Team Authorization and Lifecycle Report (Workstream C)
| Check | Finding before | Now |
|---|---|---|
| Caller permission | `dealerOrgAccess("canManageTeam")` on invite/update/remove | unchanged |
| Cross-dealer access | rows looked up with `dealer = req.dealerId` | unchanged; tested (404, no write) |
| Pending invite → active via PUT | **possible** (`status:"active"` accepted with no member) | rejected 409 `INVALID_TEAM_TRANSITION`; activation only via `POST /team/accept` |
| Lifecycle | any status value accepted | map: active→suspended/removed, suspended→active(accepted members only)/removed, invited→removed, removed→none; "invited" never client-settable |
| Role catalogue | duplicated literal lists | single `TEAM_ROLES` |
| Permissions object | any JSON accepted | keys must be in `DEALER_TEAM_PERMISSIONS`, values boolean, non-owners cannot grant permissions they do not hold (403 `PERMISSION_GRANT_FORBIDDEN`) |
| Token exposure | **list and write responses and audit old/new values included `inviteTokenHash`** | stripped everywhere (`publicTeamRow`); tested for list, remove, audit |
| Self-invite | allowed | 400 |
| Self change/removal | blocked | unchanged; tested |
| Remove twice | re-marked removed | 409 |
| Last owner | owner is the dealer user, never a `dealer_teams` row; cannot be removed through these routes | n/a (documented) |
| Duplicate invite | 409 on active/pending | unchanged; tested |
| UI | inline confirm | focused confirmation group (`role="group"`, Escape cancels), status badges, pending-invite note; browser verified (focus on confirm, Escape sends no request, confirm sends DELETE) |
No permission catalogue or new architecture was invented; the existing `DEALER_TEAM_PERMISSIONS` list is reused. Live team writes: BLOCKED (06).
