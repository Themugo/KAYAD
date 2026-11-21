# System-owner activation readiness checklist (Stage 5C)

Designated identities: `kayadautomotives@gmail.com`, `jimmythemugo@gmail.com`.
**Neither address is claimed active.** Nothing in this stage touched a real account, a hosted database or a real mailbox. A successful bootstrap CLI run alone is not "active"; active = invitation accepted by the mailbox holder + `owner_memberships.status='active'` verified + login + owner dashboard reached.

## Per-address result (as of 2026-10-19)
| Step | kayadautomotives@gmail.com | jimmythemugo@gmail.com |
|---|---|---|
| Account found on hosted | **BLOCKED** (hosted not read) | **BLOCKED** |
| Mailbox verified (`email_verified=true`) | **BLOCKED** | **BLOCKED** |
| Invitation sent via real provider | **BLOCKED** (no live Brevo credentials/authorization) | **BLOCKED** |
| Invitation accepted | NOT PERFORMED | NOT PERFORMED |
| Active membership verified | NOT PERFORMED | NOT PERFORMED |
| Login + owner dashboard tested | NOT PERFORMED | NOT PERFORMED |

## What the disposable stand-ins prove (mechanism only)
`owner-one@kayad-test.example` / `owner-two@kayad-test.example` were set as `WEBHOIST_EMAIL` in the isolated stack only: CLI `--plan` (dry run) → `--apply` issues invitations only (no promotion, no password) → capture-stub email → signed-in verified account accepts (an existing account must sign in first: `OWNER_LOGIN_REQUIRED`) → membership active → login → Owners tab (API 49/49, browser UO.1–UO.4). Recovery requires a documented `verifiedVia` method and note ≥10 chars. No hardcoded/default password, no public bootstrap, no bypass, no permanent recovery credential.

## Preconditions before a separately authorized live activation
1. Hosted preflight (`HOSTED_READONLY_PREFLIGHT_5C.sql` §11 + 5B preflight) shows both accounts exist, are mailbox-verified, not banned/deactivated. If an account does not exist, **registration + mailbox verification by the real holder comes first** (the CLI refuses otherwise).
2. 5B owner-governance migration approved and applied through its own reviewed process (decision D1 in 5B register).
3. `WEBHOIST_EMAIL` on the host contains exactly the two designated addresses.
4. `communication_event_controls` has enabled email rows for `owner.invitation` and `owner.security_notice`.
5. Live Brevo: API key in host secrets, verified sender/domain, authorization to send, and each holder able to open their mailbox.
6. Operator runs `npm run owner:bootstrap -- --plan` first and reviews; then `--apply` with `--confirm-host` naming the real host; each holder signs in, opens the emailed link, accepts.
7. Post-check: membership rows `active`, `owner_membership_events` show `accepted`, each owner logs in and sees the Owners tab; an ordinary admin does not.
8. Keep `--emergency` for documented break-glass only; it requires the documented verification and leaves audit events.
