# Phase 14.4 — Team Capability & Authorization Report

| Action | Endpoint | Server guard | UI in 14.4 |
|---|---|---|---|
| List | `GET /dealer-platform/team` | `dealerOrgAccess` | yes (hides `removed`) |
| Invite | `POST /dealer-platform/team/invite` `{email, role}` | `dealerOrgAccess("canManageTeam")`; roles manager/sales_agent/lot_agent/finance_officer/viewer; 409 on duplicate; audited; sends invite email | yes |
| Change role | `PUT /team/:memberId` `{role}` | same; cannot change own role (403); audited | yes |
| Suspend / reactivate | `PUT /team/:memberId` `{status}` | same | Suspend for `active`; Reactivate only for `suspended` **and accepted** (has `member`) |
| Remove | `DELETE /team/:memberId` | same; cannot remove self; marks `removed`; audited | yes, with explicit confirm step |
| Accept invite | `POST /team/accept` | invitee flow | not part of the dealer owner UI |

Deliberate limits (no privilege expansion):
* The UI never sets `status: "active"` on a pending invitation (that would bypass invite acceptance).
* The UI never writes the `permissions` object; there is **no permission-key catalogue** in the contracts beyond `canManageTeam`, so a permissions editor would invent semantics. Left as a backend gap (register G3).
* A 403 (`DEALER_PERMISSION_REQUIRED`) is shown as "You do not have permission to manage the team." and nothing changes locally; the list is re-read after every successful write so the server remains the source of truth.
* Audit logging is server-side and untouched.

Tests (mocked): list hides removed, no activation of pending invites, invite validation + 403 + success + refresh, role change, suspend, remove only after confirmation. Live team writes against a real organization are BLOCKED (no backend/DB environment) and the invite email path must be mocked in any staging test.
