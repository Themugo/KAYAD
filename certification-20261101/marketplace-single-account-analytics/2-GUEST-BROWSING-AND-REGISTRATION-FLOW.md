# 2. Guest browsing and registration flow report

## Guest browsing (no account needed) - verified, not changed
- Frontend: the home page, marketplace, vehicle detail (`/cars/:id` -> marketplace detail), auction list and auction pages (`/auction/:id`) are not wrapped in `RequireAuth`. The only in-app workspaces that require a session are `admin, dashboard, payments, profile, saved, chat, buyer-platform, dealer-dashboard, escrow-operations`.
- Backend: `GET /auctions`, `/auctions/active`, `/auctions/:id`, `/auctions/:id/bids`, public vehicle list/detail and `GET /inspector-applications/active` have no authentication guard.
- Nothing in this change forces registration for viewing.

## Account-required actions (guest is refused)
| Action | Guard |
|---|---|
| Save / favourite | `favoriteRoutes`: `router.use(protect)` |
| Place bid / my bids | `protect` (+ bid rate limit, idempotency, CSRF at mount) |
| My listings, create listing | `protect` + seller access |
| Leads / enquiries management | `protect` |
| Private-seller application | `protect` (email verified, buyer account) |
| Dealer application | `protect` + applicant roles |
| Inspector application | optional sign-in; signed-in applications are bound to the account (see report 1) |
| Capability view | `protect` |

The in-app prompts for signed-out visitors (save, chat, dashboards) are the existing "Sign in to ..." flows; the login redirect preserves intent (`loginPathFor`).

## Registration and login
`POST /auth/register` creates **one** user; no session is issued; e-mail verification and explicit sign-in follow (unchanged). After a successful registration the browser sends an anonymous `registration` analytics marker (no personal data). On sign-in the client sends an immediate heartbeat so the existing guest session is upgraded to authenticated (one visit, one visitor).

## Tests
`guestAccessContract.test.js` (24), `accountCapabilities.test.js` (19), frontend `analyticsTracker.test.ts`. A real-browser walkthrough was not run in this environment; guest-flow assertions are source-contract and unit level (stated evidence tier).
