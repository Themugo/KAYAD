# Dealer-owned team management, invitation-first registration and staff privacy: audit and handover

Date: 2026-11-23. Scope: the master prompt "DEALER-OWNED TEAM MANAGEMENT, INVITATION-FIRST REGISTRATION & STAFF PRIVACY".
Status labels: VERIFIED = executed here with evidence; NOT TESTED; BLOCKED. **Every result below is from a local, disposable stack. Nothing here is verified on production, and production does not yet run this code.**

## 1. Executive summary
- A dealer can now invite a person who has **no KAYARD KE account**. The invitation e-mail goes only to that person. The link opens a public page that names the dealership, role and invited e-mail, and offers "Create account" or "Sign in".
- Registration from the link is a **personal account** (role `user`), with the invited e-mail pre-filled and locked. E-mail verification is still required, then sign-in returns to the same invitation, where the person accepts.
- The **dealership owner** is told when someone accepts (in-app notification and e-mail without any token). KAYARD staff receive nothing.
- Spent, cancelled, expired and replaced links now say what happened instead of a generic 404.
- A retired legacy route that let an owner flip a pending invitation to "active" without the invitee accepting is now closed (HTTP 410).
- Security was not relaxed: acceptance still requires the authenticated account's e-mail to equal the invited e-mail, a personal account, and a still-claimable invitation.

## 2. Root causes (with paths)
| # | Finding | Evidence |
|---|---|---|
| 1 | The invite page required sign-in first, so a person with no account only saw a login wall and no explanation. | `src/App.tsx` (route previously behind auth); `src/pages/dealer/DealerTeamInvite.jsx` |
| 2 | Registration had no invitation mode; the invited e-mail could be changed and a role chosen. | `src/components/OnboardingFlow.tsx` |
| 3 | All unusable links returned the same 404, so a spent link looked like a broken one. | `backend/controllers/dealerPlatformController.js` `acceptTeamInvite` (old) |
| 4 | The token hash was cleared on accept/cancel, so history was lost. | same controller |
| 5 | The owner had no notification on acceptance or on failed delivery. | same controller |
| 6 | The invitation e-mail did not name the dealership/role/inviter or explain the steps. | `backend/services/email.service.js` |
| 7 | No rate limit on invite creation or on the public lookup. | `backend/middleware/rateLimiter.js`, `backend/routes/dealerPlatformRoutes.js` |
| 8 | Legacy `PATCH/DELETE /api/dealer/team/:memberId` accepted any role, permissions and status. | `backend/routes/dealerRoutes.js` |
| 9 | Hosted DB had a placeholder registration function and lacked dashboard tables (handled earlier by owner-run SQL). | `KAYARD-KE-registration-restore.sql`, dashboard SQL |

## 3. Changed and new files
Changed: `backend/controllers/dealerPlatformController.js`, `backend/middleware/rateLimiter.js`, `backend/routes/dealerPlatformRoutes.js`, `backend/routes/dealerRoutes.js`, `backend/services/email.service.js`, `src/App.tsx`, `src/components/OnboardingFlow.tsx`, `src/pages/dealer/DealerTeamInvite.jsx`, `src/services/dealerPlatformApi.js`; tests: `dealerTeamInvitationLifecycle`, `dealerTeamLeastPrivilege`, `dealerProfileAndTeamAuthorization`, `dealerTeamRoles`, `dealerTeamRoutePolicyMatrix`, `phase13dDealerIsolation`, `inspection/dealerInspectionPrivacy`, `DealerTeamInvite.test.tsx`; CI: `ci/db-journeys/17_…`, `run.sh`, `ci/browser/team-invitation.mjs`.
New: `backend/tests/regression/teamInvitationEmails.test.js`, `src/__tests__/onboarding/OnboardingInvitation.test.tsx`, `ci/db-journeys/21_invitation_first_onboarding.mjs`, this document, evidence files. No database migration is needed for this work.

## 4. Final invitation-first journey
1. Owner or delegate (`canManageTeam`) enters an e-mail and role. A 64-hex token is created; only its SHA-256 is stored; expiry 7 days.
2. The invitee alone receives the e-mail (dealership, role, inviter, steps, expiry, how to report an unexpected invitation).
3. The link `/dealer/setup?invite=…` calls the public preview and shows the summary and state.
4. No account: **Create account** goes to `/register?next=…`, e-mail locked, personal account, no role chooser. Existing personal account: **Sign in**. Dealer/staff address: told it cannot join a team.
5. E-mail verification is enforced (sign-in is refused until verified). After verification and sign-in the person returns to the same invitation.
6. **Accept** claims the invitation atomically. Wrong signed-in account: a clear panel and "Sign out and use the invited e-mail", the token preserved through the switch.
7. The owner gets an in-app notification and an e-mail (no token). Membership is active exactly once.

## 5. What a dealer can manage
Invite, resend (rotates the link; the old one stops working), cancel a pending invitation, change a member's role, suspend and remove members, and create custom roles, all gated by `canManageTeam` and scoped to the dealer's own organisation. A delegated manager cannot manage the team unless granted. Managers cannot grant more than they hold.

## 6. Permission matrix (built-in roles, `dealerTeamRoles.service.js`)
| Role | List | Edit | Delete | Earnings | Manage team | Approve deals | Chat/leads | Settings |
|---|---|---|---|---|---|---|---|---|
| Manager | yes | yes | yes | yes | no | yes | yes | yes |
| Sales agent | yes | yes | no | no | no | no | yes | no |
| Lot agent | yes | yes | no | no | no | no | no | no |
| Finance officer | no | no | no | yes | no | yes | no | no |
| Viewer | no | no | no | no | no | no | no | no |
Only the owner holds `canManageTeam` by default. Removed or suspended members lose workspace access; their personal account continues.

## 7. What KAYARD can and cannot see
- KAYARD (platform admin) sees the user account and dealer verification records needed to operate the marketplace. It has **no** staff-activity dashboard: team lists and the "Team activity" feed in the command centre are read only for the owning dealer (`dealerCommandCentre.service.js`, `access.team`); a delegated member sees only their own recent activity.
- Dealer team data (`dealer_teams`) is read only by dealer-scoped code, plus eligibility/safety guards (`dealerApproval`, `accountDeletionGuard`, `maintenanceEnforcement`).
- KAYARD never receives an invitee's acceptance link. The only KAYARD-bound address in this flow is `SUPPORT_EMAIL`, mentioned as text for abuse reports; the contact form (`contactController.js`) is unrelated and user-initiated.
- Owner/manager/staff visibility: owner sees all members, roles and status; a manager with `canManageTeam` the same; ordinary staff see only their own role and activity.

## 8. E-mail recipient and notification matrix
| Event | E-mail | In-app | Token in message |
|---|---|---|---|
| Invitation created / resent | invitee only (`to`, no cc/bcc) | owner warning if delivery fails | yes (invitee only) |
| Account verification | the registrant only | none | verification token |
| Acceptance | dealership owner | dealership owner | no |
| Cancellation | none | none | n/a |
Guarded by `teamInvitationEmails.test.js` (source guards forbid routing to ADMIN_EMAIL/KAYARD/bcc).

## 9. Security measures
Hash-only token storage; constant 64-hex format check; public preview and accept behind a per-IP limiter (40 per 15 min, `INVITATION_RATE_LIMIT_MAX`); invite creation limited to 10 per minute per user; preview responses are `no-store`; accept uses a compare-and-set so concurrent accepts yield one winner; the e-mail comparison is NFKC/trim/lowercase (no Gmail dot/plus folding); `accountStatus` is disclosed only to the holder of a valid token.

## 10. Test results (local, disposable)
| Check | Result |
|---|---|
| Backend Jest full (default config) | 259 suites passed, 4,275 tests passed, 21 skipped (`evidence/backend-jest-full-v5-2026-11-23.txt`) |
| Vitest full | 228 files passed, 1,952 tests passed, 1 skipped (`evidence/vitest-full-v5-2026-11-23.txt`) |
| `tsc --noEmit` | clean |
| `npm run build` | succeeded |
| DB journey 17 (invitation lifecycle) | 42/42 |
| DB journey 21 (invitation-first onboarding, 37 checks incl. races, tenant isolation, rate limits) | 37/37 |
| Real browser (Playwright Chromium, desktop and 390 px; new user create-account, verify, sign-in, accept; wrong account switch; old/spent/expired/cancelled links) | 55/55 (`evidence/browser-invitation-v2*`) |
The browser run used `INVITATION_RATE_LIMIT_MAX=1000` on the test stack only, because one browser session exceeds 40 lookups per 15 minutes; the production limit is proven by journey 21. The first browser run (limit 40) reported 3 failures that were that limiter working, not a defect.

## 11. Known limitations
- A replaced link and an unknown link are indistinguishable (no hash-history column); the page says "not recognised, may have been replaced".
- The invitation token travels in the URL and, during the verification round trip, in localStorage for up to 24 h (validated path only). Accepting still needs the matching authenticated e-mail.
- Many people behind one shared IP may hit the 40/15-minute lookup limit; raise `INVITATION_RATE_LIMIT_MAX` if that is seen.
- The login page does not pre-fill the invited e-mail.
- The owner notification goes to the dealership account, not to each delegated inviter.

## 12. Production status (not verified)
This code is local. Merging to `main` deploys to production. After deploy, verify with a real invitation to a fresh personal address, and confirm the hosted registration function (restored by the owner-run SQL) and the Brevo sender.

## 13. Owner actions
Open and merge the PR when ready (the owner commits and pushes; nothing was committed, pushed or deployed by Claude). `mugo.james27@gmail.com` still has to register in the browser and accept. Script B2 introduced `kayad_settle_purchase_payment_atomic`; it needs financial-owner approval and real-payment verification. The hosted migration-history table does not record the SQL applied by hand.

## 14. Open items classified (Phase 10)
Production login failure, CI run 45108826385, Vercel/Render SHAs, backups (Free plan, none), schema drift and the 22 differing functions, undefined objects (`error_budgets`, `marketplace_healths`, `kayad_owner_snapshot`), listing-creation RPC compatibility: unchanged by this work, still NOT TESTED against production; see the earlier documents in this folder.

## 15. Rules honoured
No commits, pushes, merges, deploys, hosted writes or migrations; no `/home/claude/p12` payment/escrow logic edits beyond the dealer team files; no secrets or tokens printed; no destructive git commands. Automated "commit and push" hook messages were refused because they do not come from the owner.
