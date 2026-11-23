# Dealer team invitation acceptance audit (revision 3, 2026-11-23)
Status: **Fixed and verified locally in a real browser against a disposable stack. Not verified in production** (nothing deployed; hosted database untouched, read-only SELECT only).

## 1. Reported failure (second screenshots)
Owner's Team page lists a *Pending invitation* and refuses a new invite ("An active or pending invitation already exists"); the recipient's link shows "This invitation was not found, or it has already been used".

## 2. Trace of the same record (hosted, read-only, no token or hash value read)
| Value | Hosted observation |
|---|---|
| Rows in `dealer_teams` | 1 (status `invited`, role `lot_agent`, no member) |
| Token hash | present, 64 hex chars (SHA-256 length) |
| Status / expiry | `invited`; not expired (expires 2026-11-30 09:11:23 UTC) |
| Created / last updated | 2026-11-16 10:09 UTC / **2026-11-23 09:11:23 UTC** |
| Expiry vs last update | exactly update + 7 days = the signature of **Resend** (resend re-issues token and expiry) |
Columns and constraints match the code (`invite_email`, `invite_token_hash`, `invite_expires_at`, status check `invited/active/suspended/removed`).

## 3. Lifecycle values, as implemented
Token: `crypto.randomBytes(32).toString("hex")` (64 hex). Hash: SHA-256 hex, same function at create, resend and accept. Link: `/dealer/setup?invite=<encodeURIComponent(token)>` (hex is unchanged by encoding). Accept: trims, requires 64 chars, hashes, looks up `{inviteTokenHash, status:'invited'}`, checks expiry, recipient e-mail (case-insensitive), personal account, then claims with compare-and-set on `{id, status:'invited', inviteTokenHash}`. Team list and the dashboard count both use `status = invited`.

## 4. Root cause
- **Confirmed (code + DB journey + browser): resend replaces the token.** A link from an earlier e-mail stops working the moment the dealer presses *Resend*, and the old 404 text ("not found, or already used") did not say so. The hosted row was re-sent 3 minutes before the report, so an older e-mail link is the most likely trigger.
- **Confirmed defect: a resend whose e-mail failed destroyed the working link.** Token was rotated first, delivery second; on failure nobody held the new link and the UI said "Invitation refreshed". Now fixed.
- **Not confirmed:** which e-mail the recipient clicked, and whether the production provider delivered the 09:11 e-mail (production e-mail configuration is unverified). The hosted backend's logs would show it now: the new `dealer_team_accept_no_pending_invitation` / `dealer_team_invitation_resent` log lines carry an 8-character hash fingerprint (never the token).
- Ruled out: hashing/encoding mismatch, query-parameter name, truncation, whitespace/URL-encoding, status filter mismatch between list/count/accept, the concurrency guard (it requires the same values the lookup already matched; tests prove a legitimate accept succeeds), the login redirect (token preserved, browser-verified).

## 5. Changes (local)
1. `resendTeamInvite`: if the e-mail is not delivered, the previous hash and expiry are restored (compare-and-set), response says `email.previousLinkStillValid: true`; fingerprint logging.
2. Accept 404 is explicit (`INVITATION_LINK_NOT_VALID`): "no longer valid... replaced by a newer e-mail, already used, or cancelled". Expired stays 410; wrong recipient 403 without consuming the invitation.
3. Invitation page: visible design-system button (earlier fix); a spent link opened by someone already on a team says "already been used" with a workspace link; resend UI reports "not re-sent" and that the old link still works.
4. Earlier fix kept: concurrency guard (single winner).
**Policy for old links (documented and tested): a successful resend invalidates earlier links; only the newest e-mail works.**

## 6. Tests
- Jest `dealerTeamInvitationLifecycle.test.js` (13): create to emailed link to accept; hash equals SHA-256 of emailed token and raw token never stored; whitespace/URL encoding; resend then newest link works; old link refused with explanation; failed-email resend keeps the previous link; wrong token; expired/revoked/already accepted; wrong recipient not consuming; concurrent accepts (one 200, two 404); roster stats; duplicates; no token in responses/audit.
- Jest `dealerTeamLeastPrivilege.test.js` (36).
- DB journey 17 (real backend + Postgres + provider stub), new B5-B7.
- Vitest `DealerTeamInvite.test.tsx` (12).
- **Real browser** (`ci/browser/team-invitation.mjs`, Playwright/Chromium, disposable stack, evidence `evidence/browser-invitation/`): 22/22: owner invites in the Team page; logged-out visitor goes to sign-in with the same invitation preserved and returns to it; visible styled button; accept; DB shows one active membership, role kept, token cleared; refresh + accept again says already used, still one membership; resend, old link explained, newest accepted; wrong account gets a clear 403 and the invitation is untouched; dashboard "Invitations waiting" equals the DB count; mobile 390px layout; no page errors.
## 7. Remaining risk / owner actions
Production still runs the old code until you deploy. Ask the dealer to open only the newest e-mail, or Resend once more after deploy. Confirm the production e-mail provider delivers (a failed provider now keeps the old link alive). Hosted logs after deploy will show the fingerprints.


---
# Revision 3: "Invitation email does not match the authenticated account"

## A. Proven root cause (read-only evidence on the hosted project, no tokens or hashes read)
| Fact | Evidence |
|---|---|
| The pending invitation is for `mugo.james27@gmail.com` (stored normalised, 22 chars, status `invited`, last updated 2026-11-23 10:24 UTC) | `dealer_teams`, 1 row |
| **No user with that e-mail exists on production.** `users` holds exactly 3 accounts: a superadmin, the dealer (invitation owner) and a legacy `individual_seller` (pending), each with a different address | `users`, 3 rows, all e-mails already normalised |
| The e-mail the backend compares is `users.email` of the user id in the verified session token, re-read on every request (`middleware/auth.js`); the token carries no e-mail claim and no browser-supplied e-mail is read | code + `authIdentitySource.test.js` |
So the page was reached while the browser was signed in as **one of the three existing accounts**, none of which owns the invited address. The 403 is the correct, secure result. This is an account-existence / wrong-session problem, **not** a normalisation, casing, whitespace, stale-claim or profile-versus-auth defect: casing and whitespace variants of the invited address are accepted; dots/plus-tags are deliberately not folded.
Not provable from the evidence: which of the three accounts the browser was signed in as, and whether the recipient tried to register (the hosted registration RPC is a placeholder that fails, see REGISTRATION-AUDIT.md, so creating `mugo.james27@gmail.com` on production **cannot currently succeed**). Both facts are listed in the checklist below.
Even a signed-in superadmin or the legacy seller account could not accept: team members must be personal (`role=user`) accounts. Nothing in this fix weakens that.

## B. Identity resolution, before and after
| Stage | Source | Before | After |
|---|---|---|---|
| Owner enters e-mail | request body | trim + lower-case | shared `normalizeEmail` (NFKC, trim, lower-case: same rule as registration) |
| Stored | `dealer_teams.invite_email` | as above | same helper |
| Provider / link | provider call; link carries only the token | unchanged | unchanged (no e-mail in the link) |
| Frontend session | auth context user | shown nowhere on the invite page | **shown on the wrong-account page** |
| Token claim | JWT | id only; e-mail claim ignored | unchanged, now test-pinned |
| Middleware | `users.email` re-read per request | same | same, test-pinned (change effective on next request) |
| Acceptance check | `req.user.email` vs invite | ad-hoc trim/lower-case | shared `emailsMatch` (never matches empty) |
| Mismatch response | 403 text only | 403 `INVITATION_EMAIL_MISMATCH` + masked hint (`m***7@gmail.com`); invitation untouched |

## C. Changes
`backend/utils/emailIdentity.js` (new); `dealerPlatformController.js` (shared rule, coded 403, masked hint, fingerprint log `dealer_team_accept_email_mismatch`); `DealerTeamInvite.jsx` (wrong-account panel: signed-in e-mail, masked invited address, "Sign out and use the invited e-mail", which signs out, verifies the sign-out, then goes to `/login?next=<same invitation>`; a failed sign-out is reported and nothing navigates). Authorization unchanged: the ownership check is not weakened, the invitation is never edited to fit the caller.
Security implications: the hint reveals only first/last local character and the domain to someone who already holds the secret link; the token is never logged or shown; mismatch does not consume or modify the invitation.

## D. Tests (local)
Jest: `emailIdentity.test.js` (5), `authIdentitySource.test.js` (5: forged claim ignored, browser e-mail ignored, stale session after switching resolves per token, DB change effective next request, expired token then refresh), `dealerTeamInvitationLifecycle.test.js` (22: casing, whitespace, normalised storage, mismatch keeps invitation then correct account succeeds, dots/plus not folded, body e-mail not proof, non-personal roles, independent invalid/unknown/replaced/expired/cancelled errors, no duplicate membership, concurrency). Vitest: `DealerTeamInvite.test.tsx` (15, incl. wrong-account panel, switch-account sequence, failed sign-out).
Real browser (disposable stack), 29/29: Account B signs in and is rejected (403) with a clear message; invitation unchanged; "Sign out and use the invited e-mail" leads to sign-in carrying the same invitation; Account A signs in, returns, accepts; exactly one active membership; dashboard pending count equals the database; desktop and 390px mobile; no uncaught errors. Screenshots: `evidence/browser-invitation/08-*.png`, `09-*.png`.

## E. Production diagnostic checklist (owner-run, read-only; never paste tokens)
1. Does the invited address have an account? `select id, role, status, email_verified from users where email = lower(btrim('mugo.james27@gmail.com'));` (expected today: 0 rows).
2. What is the signed-in account on the failing browser? Open the invitation page in a private window, sign in, and read the e-mail shown on the new wrong-account panel after deploy (it names the signed-in e-mail). Before deploy: check the profile page of that browser.
3. Pending invitation e-mail: `select invite_email, status, invite_expires_at from dealer_teams where status='invited';`
4. Same user id on frontend and backend: after deploy, the backend log lines `dealer_team_accept_email_mismatch` carry user id and an 8-character hash fingerprint, no token.
5. Auth e-mail vs profile e-mail: there is one canonical `users.email`; `select count(*) from users where email <> lower(btrim(email));` (expected 0).
## F. Remaining production blockers
- Production has no account for the invited address and cannot register one until the registration function restoration (`20261122200000_restore_register_identity_atomic`) is approved and applied; alternatively invite an existing **personal** account. Nothing here was applied.
- Production runs old code until you deploy; revision 2 fixes (resend, messages) also await deploy.
- The fix is verified locally only; it is not verified in production.
