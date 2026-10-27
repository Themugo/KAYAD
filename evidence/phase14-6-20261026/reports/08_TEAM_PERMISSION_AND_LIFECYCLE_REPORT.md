# 08 Team permission boundaries and lifecycle
Route -> policy (verified from source and by backend/tests/regression/dealerTeamRoutePolicyMatrix.test.js, 12 tests, real dealerOrgAccess):
| Route | Middleware | Enforcement |
|---|---|---|
| GET /dealer-platform/team | protect, dealerOrgAccess() | any ACTIVE member or the owner of the organization (read only) - no permission key, documented policy |
| POST /team/invite | protect, dealerOrgAccess("canManageTeam") | owner, admin/superadmin, or active member with canManageTeam; own email blocked; permissions are not accepted on invite |
| PUT /team/:memberId | same + createLimiter | same; own row blocked; transitions validated; permission keys validated against DEALER_TEAM_PERMISSIONS; no grant beyond the actor's own permissions (403 PERMISSION_GRANT_FORBIDDEN) |
| DELETE /team/:memberId | same + createLimiter | same; already removed -> 409 |
| POST /team/accept | protect | identity + invite token/email proof by the invitee (not yet a member) |
Verified: suspended, removed and invited members get no org access; org id comes only from membership (client dealerId ignored); DB failure fails closed (500); keys unknown -> 400; token hashes never returned (publicTeamRow). Owner/Super Admin behaviour and cross-org isolation covered by the 14.5 suite (36 tests, still passing).
Undefined policy, recorded not invented: (1) a member with canManageTeam can suspend or remove a peer or a member holding more permissions than themselves; (2) resolveDealerOrg takes the first active membership (limit 1), so membership in two organizations is ambiguous - the schema has no "current organization" selector; (3) GET /team exposes member names/emails to every active member.
