# KAYAD Phase 16B — MFA and multi-owner verification evidence

Tiers: D = disposable PostgreSQL · A = local app stack through HTTP · B = real browser on the real local stack (no request mocking) · U = unit. **Email delivery is mocked/not exercised in every test below: no email provider credentials exist in this environment, tokens were read from the database. Real provider delivery is UNVERIFIED.** Nothing here ran against hosted.

| Requirement | Evidence | Tier |
|---|---|---|
| TOTP is real, not a placeholder | RFC 6238 HMAC-SHA1 on `node:crypto`; codes generated independently by the test (`utils/totp.js`) are accepted by the live service; browser enrolment with a code computed from the secret shown on screen | A, B |
| Secret encryption at rest | `owner_mfa_factors.secret_enc` begins `v1:` (AES-256-GCM), never contains the plaintext secret; key from `OWNER_MFA_ENCRYPTION_KEY` (not stored in the DB) | A, B |
| Access controls | `/api/owner/mfa*` refused (401/403) to every non-owner role (role matrix; owner suite) | A |
| Enrol / activate | wrong activation code refused; correct code activates and returns 10 recovery codes once; codes stored only as hashes | A, B |
| Challenge | owner login without code → `MFA_REQUIRED`, no session; valid code logs in; a valid code never rescues a wrong password | A, B |
| Replay | same code refused; earlier-step code refused after a later one | A |
| Lockout | 5 wrong codes → 15-minute lock, even a right code refused (no oracle); lock does not lock the password account for others | A |
| **Lockout race (NEW, FIXED)** | First observation: 40 concurrent wrong codes → **25 evaluated** (limit 5), 15 locked. After the fix: 40 concurrent → **5 evaluated, 35 `OWNER_MFA_LOCKED`**. The committed test uses a 12-wide burst (the invitation route spends a bcrypt per request, and 30–40-wide bursts can hit the server's own 408 timeout on a 2-core box; a burst containing any 408 is discarded and re-run). **Negative control on the unmodified 16A code: 12 evaluated, 0 locked, and a later correct code was accepted.** Fixed code: 5 evaluated + 7 locked, 3 of 3 repeat runs; no invitation created by the burst; a correct code is still refused while locked | A + U |
| Recovery codes | one works once and is consumed (also through the real login form); single use | A, B |
| Step-up | `requireStepUp` (password + TOTP/recovery code) guards invite, resend, revoke, remove and recover; an enrolled owner cannot invite without a code; with a recovery code it proceeds | SRC, A |
| Session refresh / recovery | recovered owner's old sessions die; privilege returns only after the recovery invitation is accepted | A |
| Invitation expiry / single use / duplicates | expired refused; link single use; a second pending invitation for the same address creates no second pending row; no duplicate identity rows | A |
| Second-owner activation | wrong signed-in account cannot accept; anonymous cannot accept; mailbox owner signed in accepts | A |
| Removal and last-owner protection | owner can remove another while a usable owner remains; last usable owner cannot be removed; deleting a former owner returns a governed 4xx, no FK 500 | A |
| Escalation by dealers and lower roles | 41/41 in the 16B suite (register/profile/onboarding mass assignment, team invites, staff create/update, domain addresses, stale sessions) | A |
| Audit | append-only ledger records invite, accept, MFA and recovery events; contains no secret/token/recovery code | A |

Unproven / open: real email delivery of invitation and recovery links; hosted `owner_memberships` and `owner_mfa_*` migrations are **not applied** (candidates only); `kayadautomotives@gmail.com` has **not** been invited; no hosted MFA enrolment has happened.
