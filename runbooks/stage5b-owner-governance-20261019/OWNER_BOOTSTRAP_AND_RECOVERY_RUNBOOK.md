# KAYAD — Owner bootstrap & recovery runbook (Stage 5B)

Status: **procedure ready; nothing here has been run against the hosted database.** Everything below was rehearsed only on a disposable PostgreSQL + the real application (see TEST_EVIDENCE_MATRIX_5B.md).

## 0. Principles
- Owner privilege = an **active row in `owner_memberships`**, bound to the user's id, whose account is **mailbox-verified, not banned/deactivated, and whose e-mail still equals the membership e-mail**. The `WEBHOIST_EMAIL` list is only a *designation* (who may be bootstrapped and who is reserved against public sign-up) — it grants nothing once the database store is installed.
- No password is ever set, printed, e-mailed or stored by any procedure here. Invitation tokens exist only in the e-mail to the invitee; the database stores a SHA-256 hash.
- Every step writes to the append-only `owner_membership_events` ledger (who, what, when, result, reason).

## 1. Initial bootstrap (two designated owners)
Preconditions: migration `20261019120000_stage5b_owner_governance` approved and applied (Decision D1); `WEBHOIST_EMAIL=kayadautomotives@gmail.com,jimmythemugo@gmail.com` set in the deployment; Brevo credentials present.
1. Each person registers normally (or already has an account) and **verifies their mailbox**. Registration of a designated address by anyone else cannot yield privilege: an unverified designated account is refused at login/refresh/session (Stage 5A `isUnverifiedOwner` guard, unchanged).
2. Operator (from a trusted machine with the production service-role environment):
   - `npm run owner:bootstrap -- --plan` — read-only; prints, per designated identity, a masked address and a state word (no tokens).
   - `npm run owner:bootstrap -- --apply --operator "<your name>" --confirm-host <supabase host>` — issues a mailbox-bound invitation to each verified designated identity. It never promotes an account, never sets a password, is idempotent (`invitation_already_pending`, `already_active`), and refuses ambiguous/suspended/unverified accounts with a reason.
3. Each owner opens the e-mailed link **while signed in to their own account** and presses *Accept ownership*. (A person without an account sets a password on that page.)
4. When both designated identities are active the bootstrap switch closes itself (`owner_bootstrap_state`). After that `--apply` refuses (`OWNER_BOOTSTRAP_CLOSED`). Either owner can now administer the other independently from Admin → Owners.
5. `--plan` again must show both identities `active`. Only then may anyone say the owners are provisioned.

## 2. One owner lost access (the other owner still works)
Use **Admin → Owners → Recover** next to the affected owner.
1. Verify the person **out of band** (in person, video call, phone call to a number already known — not by replying to e-mail). Record the method and what was checked (≥10 characters).
2. Enter the typed address and your own password (step-up).
3. Effect: their membership is revoked at once, their access tokens, refresh sessions and sockets are cut off, a fresh recovery invitation (24 h, single use) is e-mailed to the address on file, and every owner receives a security notice. No token is shown to you.
4. They accept while signed in (or set a new password on the page if the account's credentials are being reset). The old invitation link and old sessions never work again.
If their mailbox is also lost: change the owner's e-mail through the normal, audited support/admin process **first**, after the same out-of-band verification, then recover. (A membership whose account e-mail changed is blocked, so the new address must be re-invited deliberately.)

## 3. All owners inaccessible (emergency — separately controlled, no backdoor)
There is no hard-coded password and no hidden route. The only mechanism is an operator CLI that needs **two independent controls**:
1. Production-environment access (service-role credentials) — i.e. control of the deployment, not of the application.
2. A time-boxed authorisation set by that operator in the deployment environment: `OWNER_EMERGENCY_RECOVERY_UNTIL=<ISO time within the next 24 h>`.
Then: `npm run owner:bootstrap -- --emergency --operator "<name>" --incident "<ticket id>" --confirm-host <host>`.
- It only works when **no usable owner exists** (`OWNER_RECOVERY_NOT_NEEDED` otherwise) and only for the *designated* addresses.
- It issues recovery invitations to the designated addresses' mailboxes (never prints a token). Acceptance still requires mailbox control.
- Afterwards: **remove `OWNER_EMERGENCY_RECOVERY_UNTIL`**, record the incident, review the `emergency-cli:*` rows in the ledger, rotate the service-role key if the operator machine is in doubt.
If a designated mailbox itself is lost, update the `WEBHOIST_EMAIL` designation through the normal deployment change process (reviewed) and re-run the emergency step.

## 4. Store unreadable (`OWNER_STORE_UNAVAILABLE`)
The application **fails closed**: if the membership store cannot be read beyond a short grace window (default 30 s on the last good snapshot; `OWNER_REGISTRY_STALE_MAX_MS`), nobody has owner privilege and owner endpoints return 503 with this runbook pointer. It recovers by itself when the database recovers. Break-glass `OWNER_STORE_MODE=legacy` restores the Stage 5A behaviour (designated address ⇒ owner, still mailbox-verified) — use only with an incident record and revert afterwards.

## 5. Never
Do not edit `owner_memberships` by hand, share an invitation link, reuse a link, or paste a token into chat/tickets. If a link was exposed, revoke the invitation in Admin → Owners and resend.
