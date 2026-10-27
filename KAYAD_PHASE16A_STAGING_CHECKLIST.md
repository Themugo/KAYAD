# KAYAD Phase 16A — Staging checklist (all on a STAGING Supabase project + staging backend, never production first)

Mark each box with evidence (screenshot/query output without secrets). A box that cannot be ticked blocks the matching hosted step.

## A. Environment
- [ ] Staging schema reconciled to the intended migration set; `KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized` set deliberately.
- [ ] Read-only preflight `MIGRATION_PREFLIGHT_READONLY_5B.sql` clean (hard dependencies present; note `kayad_register_identity_atomic` and the case-insensitive e-mail index status).
- [ ] Working outbound e-mail from the staging backend to two real mailboxes (invitation + verification). Tokens never appear in logs or CLI output.
- [ ] `WEBHOIST_EMAIL` = staging primary only; `OWNER_MFA_ENCRYPTION_KEY` set (≥32 bytes, base64); `OWNER_MFA_POLICY=enrolled_only`.
- [ ] Backup/PITR marker recorded.

## B. Primary
- [ ] `owner-bootstrap --plan` shows the primary as `account_verified_not_owner`, bootstrap `open`; a wrong `--confirm-host` is refused.
- [ ] `--apply` sends exactly one invitation; nothing printed; ledger row names the operator.
- [ ] Opening the link while **signed out** is refused (`OWNER_LOGIN_REQUIRED`); signed in as the **wrong** account is refused; as the right one succeeds.
- [ ] After accept: `/api/owner` 200, primary flagged, bootstrap `closed`, pre-existing sessions still valid, password unchanged.
- [ ] (If P1 approved) pre-check returns 1 row; operation prints `users=1 profiles=1`; verification and rollback queries behave as in the report; sessions unaffected.

## C. MFA
- [ ] Enrolment needs password; secret + 10 recovery codes shown once; owner actions then demand a code; replayed code refused; 5 wrong codes lock out temporarily.
- [ ] Sign-in after enrolment returns the MFA challenge; recovery code works once.

## D. Second owner
- [ ] Non-owner (admin) invitation attempt → 403, no row.
- [ ] Invitation by the primary needs password + typed address + code; duplicate → `OWNER_INVITATION_PENDING`; sign-up of the address is blocked while pending.
- [ ] Expired link refused; used link refused; weak password refused (link stays valid); account created with the invitee's own password; **one** user row; verified by link.
- [ ] Second owner enrols their own authenticator; sign-in challenged.
- [ ] Existing-account case: pre-create an unverified account with the address → link is accepted, same id, no duplicate.
- [ ] Peer cannot remove/ban the primary (`OWNER_PRIMARY_PROTECTED`, ledger shows denial); UI shows "Primary owner" + "Protected" and no Remove.
- [ ] Primary removes the second owner: wrong code refused; correct code (or recovery code) succeeds; sessions end at once; account remains; re-invite works without a duplicate.
- [ ] Last-owner rule: attempt to remove the only usable owner → `OWNER_LAST_USABLE`.
- [ ] DB / API / UI agree after each change (member list, ledger, `/api/owner`, screen).

## E. Test dealer
- [ ] Row unchanged by all of the above (compare `md5(users row)`, `user_auth`, `profiles`; still 0 dealer/verification rows).
- [ ] **Dealer-onboarding schema present on staging** (`bio, onboarding_complete, onboarding_completed_at, payment_details`, `verification_status` allows `suspended`) — hosted currently lacks it.
- [ ] Resend → verify link → sign in → onboarding → pending → admin approve refused → owner approve succeeds → role stays dealer, no owner access.

## F. Regression
- [ ] Carried E2Es (account security, dealer lifecycle, dealer payments, inventory/team, super-admin governance, identity integrity) green against staging-shaped data.
- [ ] Rollback drill: MFA rollback, governance rollback (with events export), re-apply.

## G. Go / no-go for production
Only when A–F are ticked, the specific production operations are approved by you in writing, and a human with the secrets runs them in the order given in the approval report.
