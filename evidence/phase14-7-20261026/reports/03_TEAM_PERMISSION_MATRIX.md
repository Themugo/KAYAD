# 03 Team role x resource x action matrix (Order 5)
Evidence: backend/tests/regression/dealerTeamLeastPrivilege.test.js (32), dealerTeamRoutePolicyMatrix.test.js (13), dealerProfileAndTeamAuthorization.test.js, phase13dDealerIsolation.test.js (173). Org id is always derived server-side from the token and membership; a body/query dealerId is ignored (tested).

| Actor | List roster | Invite | Invite manager | Change member | Change/remove manager | Remove member | Self change/remove |
|---|---|---|---|---|---|---|---|
| Owner / admin / superadmin | yes | yes | yes | yes | yes | yes | n/a |
| Manager (canManageTeam) | yes | yes | **no (403 TEAM_ROLE_OWNER_ONLY)** | only members whose permissions are a subset of their own | **no (403 TEAM_TARGET_PROTECTED)** | same subset rule | no |
| Member without canManageTeam | **no (403)** | no | no | no | no | no | no |
| Private seller, buyer, unrelated dealer, suspended member | no | no | no | no | no | no | no |

Resolved policy decisions: peer/manager removal is owner-only; a manager cannot touch a member holding permissions they lack (no privilege escalation by proxy); roster needs canManageTeam; multi-org membership across more than one dealership fails closed (403 DEALER_ORG_AMBIGUOUS) rather than picking one; invites are single-use (replay 404), email-bound (403), expiry-enforced (410), token cleared on accept and on removal; revocation applies on the next request because membership is read per request.
Super Admin reachability: admin/superadmin roles pass org access as unrestricted actors.
Known and not changed: DB policy dealer_teams_owner_update permits a member to update their own row via direct DB access; proposed fix in runbooks/phase14-7-20261026/PROPOSED_dealer_teams_member_update_restriction.sql (forward + rollback, not applied).
