# Dealer team invitation acceptance audit (revision 2, 2026-11-23)
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
