# `runbooks/identity-staging/01_OWNER_RECOVERY_GATE.md` — step-by-step classification (Stage 5E)

Nothing in the runbook was executed against any hosted system. Classes: **RO** read-only inspection · **LOCAL** local/disposable rehearsal · **MUT** hosted mutation, needs explicit authorisation · **UNSAFE** unsafe/prohibited under current authorisation · **HUMAN** out-of-band human/attestation step.

| Step | What it says | Class | Notes / what changed since it was written |
|---|---|---|---|
| Rules 1 | isolated *staging* project, verify ref/db first | RO + HUMAN | Only one hosted project is reachable; repo evidence ties it to production and the owner has not confirmed otherwise ⇒ **environment = UNKNOWN/likely production** ⇒ the staging-only steps below are **blocked**, not "ready" |
| Rules 2–5 | never print secrets; don't run legacy `seed.js`; no db push/repair; preserve records | policy | Followed. Still correct |
| A1 | record project ref, db name, PG version, env, timestamp | RO | Metadata only. Needs positive environment identification (gate G1) |
| A2 | prove staging isolated from production (project **and** connection string) | HUMAN | Cannot be proven from the repo; requires owner attestation and the host's dashboard. Never echo the connection string |
| A3 | run `00_READONLY_STAGE_INVENTORY.sql` with a read-only role | RO — **staging only** | File header: "Do not run against production". Contains `SELECT`s only (scanned: no INSERT/UPDATE/DELETE/DDL). Caveats: reads `users.is_super_admin/is_deleted` (may not exist hosted ⇒ harmless error); `inet_server_addr()` prints the server address; query 8 returns **counts only** (no PII) |
| A4 | compare versions/names with the 2026-10-13 inventories | LOCAL | Done offline in the earlier 5E stage (`HOSTED_RECONCILIATION_MATRIX_5E.md`); a name match is not an effect match |
| A5 | classify each conflict MATCH / EFFECT_MISSING / CONFLICT / … | LOCAL (analysis) | Dispositions recorded; **no repair** without reviewed rollback (gate G5) |
| B1 | resolve `WEBHOIST_EMAIL(S)` privately; boolean only | RO (host shell) | **Now supported**: `owner-bootstrap.mjs --verify-designated "<expected>"` prints booleans + masked typed address, never configured values (F-5E2-03) |
| B2 | verify mailbox control outside the database | HUMAN | The owner opening the link *is* the proof (see D-5E2-1). No system may assert it |
| B3 | privately compare normalised target with `users`/`user_auth`/`profiles` | RO | PII-bearing; run by the owner/operator, record only booleans |
| B4 | stop on 0/multiple matches, inconsistent ids, soft-deleted, duplicate normalised addresses | policy | Hosted has **no** `lower(email)` unique index (H, prior stage) so duplicates are *possible*; check count first |
| B5 | "test the supported **password-reset** flow first" | **MUT** and **mis-targeted** | A reset creates a token, sends mail, **replaces the password, bumps `token_version`, revokes sessions**. It does **not** set `email_verified` (`resetPassword` in `authController.js`), so it does **not** clear `OWNER_IDENTITY_UNVERIFIED`. The correct recovery for *this* block is the **verification link**, not a reset |
| B6 | if absence proven, design an explicit bootstrap transaction | LOCAL (design) / MUT (execution) | The 5B function `kayad_owner_accept_invitation_atomic` is that transaction (advisory lock, unique constraints, audit row, rollback on any failure — tests K4.6/K4.7/K4.11). It cannot run on hosted until the governance migration is applied (gate G5/G6) |
| C | synthetic staging owner, create/recover twice, inject conflicts, test login/me/HTTP/socket/revocation, dealer negative controls | LOCAL (done on a disposable stack) / MUT (if done on a hosted staging project) | Executed on the disposable stack: `role_api_k` 93/93 + earlier `role_api_j` 35/35 + PG 63/63. A hosted-staging rehearsal still needs its own named authorisation |
| Decision | no production action until staging reconciled, rehearsal passed, identity independently verified, rollback reviewed | gate | Still **not met** |

## Instructions that are **UNSAFE** to run today
- Any `db push` / `migration repair` / replay of the 63 missing migrations (repo is not self-sufficient: 40/68 hosted-only objects have no repo SQL; 17 overlap — prior stage).
- `backend/seed.js` as a recovery mechanism (runbook rule; it writes `email_verified=true` for an owner).
- Triggering a hosted password reset, resend, invitation or `--apply` "to see what happens" — every one is a real-account mutation.
