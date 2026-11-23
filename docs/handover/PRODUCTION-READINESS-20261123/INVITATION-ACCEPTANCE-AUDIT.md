# Dealer team invitation acceptance audit
## Lifecycle traced (source-level, Verified by code reading + tests)
1. Create: `POST /api/dealer-platform/team/invite` (`inviteTeamMember`): role resolved, owner-only for `manager`, no permission overreach, self-invite refused, duplicate refused (409), 64-char random token stored only as SHA-256 hash, 7-day expiry, status `invited`, audit event, e-mail via `sendTeamInviteEmail` (delivery result returned, not assumed).
2. Link: `/dealer/setup?invite=<token>` → `RequireAuth`. A logged-out visitor is sent to `/login?next=<path+query>`; `safeNextPath` keeps the query so the invitation returns after sign-in (tested).
3. Page `DealerTeamInvite.jsx`: token must be 64 chars; real `<button>` calls `POST /dealer-platform/team/accept`; success clears the my-dealership cache and shows a link to the workspace.
4. Accept (`acceptTeamInvite`): hash lookup (status `invited`), expiry 410, recipient e-mail must equal invited e-mail (403), account role must be `user` (dealer/admin refused), dealer cannot join itself, already-active member 409, then membership claim, audit event. Membership never changes the member's role.
5. Pending count: the dashboard "Team invitations waiting to be accepted" item is `outstandingInvitations` in `dealerCommandCentre.service.js`, computed from `dealer_teams` on each request, so it drops when the row becomes `active`.

## Findings
| # | Severity | Finding | Status |
|---|---|---|---|
| I1 | High (UX blocker) | "Accept invitation" looked like plain text. It is a real button with a handler, but used `btn btn-primary`, which is styled only under `.kayad-admin-shell__content` (`src/styles/kayad-admin-legacy-surface.css`); elsewhere Tailwind preflight leaves it unstyled. | **Confirmed and fixed locally**: now the shared design-system `Button` (and a styled success link). Not yet observed in a real browser on production. |
| I2 | Medium | Accept was read-then-update by id: two simultaneous accepts of one token could both succeed (replay window). | **Confirmed and fixed locally**: compare-and-set `updateMany` on `{id, status:'invited', inviteTokenHash}`; the loser gets 404. |
| I3 | Info | 12 other uses of unstyled `btn btn-primary` outside admin exist. | Confirmed, **not fixed** (out of scope; listed for owner). |
| I4 | Unknown | Whether the owner's actual click failed beyond styling (e.g. the logged-in e-mail differing from the invited one → 403 message shown). | Suspected; evidence incomplete: needs a browser/network capture. |

## Tests added/run
- `backend/tests/regression/dealerTeamLeastPrivilege.test.js` (36 pass): concurrent accept yields exactly one 200 and one 404; claim is conditional on status and hash. Existing: replay, wrong recipient, expired, removed, dealer/admin refused, role unchanged, revoke.
- `src/__tests__/pages/dealer/DealerTeamInvite.test.tsx` (10 pass): real styled button, double click = one request, success link, error states, login return path keeps invitation.
- Not covered by an automated test: other-dealership token reuse beyond hash uniqueness, mobile viewport rendering, a full DB journey beyond existing journey 17 (see journeys-final.txt: 29/29 pass).
Remaining risk: owner-view confirmation in a browser; the `btn` usages in I3.
