# Two-owner identity & activation impact matrix (Stage 5E)

Designated identities (as given by the owner for this stage — *not* proof of mailbox control or authorisation):
- **Owner 1** `ji***@gmail.com` — existing account; hosted (prior stage, read-only): `role=dealer`, `status=pending`, `email_verified=false`, **0** `dealers` rows, **0** `dealer_verifications` rows.
- **Owner 2** `ka***@gmail.com (two-"a" spelling)` — no account (both spellings checked in prior stages: absent). **Not created in this stage.**

**Configuration discrepancy (reported, not changed):** the 5B/5C/5C.1/5D runbooks, decision register and `HOSTED_READONLY_PREFLIGHT_5C.sql` spell the second address `ka***@gmail.com (one-"a" spelling)` (one "a"); the owner's 5E instruction is `ka***@gmail.com (two-"a" spelling)` (two). The deployed value of `WEBHOIST_EMAIL` is a host-dashboard secret (`sync:false` in `render.yaml` / `render-staging.yaml`) and is **unknown**. `--plan` masks both spellings to the same `ka***@gmail.com`; use the new offline `--verify-designated` (booleans only) on the host. Consequence of a wrong spelling (L, K9.4–K9.7): the typo'd address is the one reserved; the intended address is **not** reserved and can be squatted — it can never gain privilege that way, but the squatter row must then be taken over by the mailbox holder through an invitation (tested K10).

## 1. Mode matters: what "designated" does
| Mode | When | Who is an owner | Registration of a designated address | Management endpoints |
|---|---|---|---|---|
| **legacy** (store not installed) — **hosted today** (H, prior stage: no `owner_*` tables) | governance migration not applied | **any designated address whose account is `email_verified=true`** (Stage 5A rule). No membership row, no audit, no last-owner protection | 403 `OWNER_IDENTITY_RESERVED` (so **Owner 2 cannot even register**) | `GET /api/owner` works read-only (`canManage:false`); all writes 503 `OWNER_STORE_NOT_INSTALLED` |
| **database** (store installed) | governance migration applied | **only** active + verified, non-suspended memberships; env list grants nothing | designated ∪ active ∪ pending-invite addresses reserved | full invite / accept / revoke / recover |
| **error** | store installed but unreadable | nobody (fail-closed) | — | 503 `OWNER_STORE_UNAVAILABLE` |

## 2. Account-field impact for Owner 1 (existing dealer) — by path
| Field / record | **Legacy mode: just click the verification link** (hosted today) | **Path A** (database mode): verify, then accept the invitation *signed in* | **Path B** (database mode): accept while the account is still *unverified* |
|---|---|---|---|
| `users.email_verified` | false → **true** (by the link) | false → true (by the link, before accept) | false → **true** (by accept) |
| password | unchanged | **unchanged** (K2.12, K5.4) | **replaced** by the one typed at accept; old one dead (K6.11) |
| `user_auth.token_version` / sessions | unchanged | **unchanged; live sessions kept** (K5.3, K5.5) | `token_version`+1; **all refresh tokens revoked** (`owner_invitation_credential_reset`); verify/reset tokens and lock cleared |
| `users.role` | stays `dealer` | stays `dealer` (K2.14, K5.2) | stays `dealer` |
| `users.status` | stays `pending` | stays `pending` | stays `pending` |
| dealer business fields, `dealers`, `dealer_verifications` | untouched | **identical digest** before/after (K5.2) | identical digest (J3.4) |
| dealer approval | **not** approved | **not** approved (K5.8) | not approved |
| owner authority | immediate (legacy rule) — **no invitation, no audit row** | from the membership created at accept | same |
| `owner_memberships` / `owner_invitations` / events | none (tables don't exist) | +1 membership, invitation `accepted`, events `invitation_issue`, `membership_activate` | same |
| Authorisation required | owner clicks a mailbox link (self-service, but it **is** an activation) | owner's step-up + existing owner/operator `--apply`; mailbox holder accepts | same, plus acceptance of credential replacement |
| Recoverability | verification can be undone only by DB update | membership revocable (K7.3) with step-up + reason; last owner protected (K7.10) | same; **the replaced password cannot be restored** |

## 3. Ordering hazard (S): legacy owner → governance migration
`isOwnerUser` in database mode requires the address to be bound to a membership id. The 5B migration **does not seed** memberships for existing legacy owners (`INSERT … owner_bootstrap_state` only). So if Owner 1 is made a legacy owner (link click) and the governance migration is applied later, **Owner 1 loses owner authority at that instant** until a bootstrap invitation is accepted (Path A, signed in — password and sessions survive). Not a permanent lockout (the operator CLI with the service key can invite), but it is a window with *zero* usable owners. Plan the migration and `--apply` as one reviewed change window. (Documented; not executed anywhere.)

## 4. Owner 2 — secure path (database mode only)
1. Governance migration applied (gate G5/G6). 2. Operator runs `--verify-designated "…"` on the host → both configured exactly. 3. `--apply` sends one invitation per designated mailbox (no password, no token printed; K3.2–K3.3). 4. Mailbox holder opens the link, sets a password; the account is **created** with `role=user, status=approved, email_verified=true` and the membership (K4.15). 5. Bootstrap closes automatically when **both** designated identities are established (K4.13 stays open at 1/2, K5.6 closes at 2/2). 6. Further owners only by an existing owner with step-up (K6).
Hard limits (tested): token alone never replaces a *verified* account's credentials (K4.1–K4.3); expired / revoked / replayed / unknown tokens refused (K4.4, K4.8, K4.14, K6.9); concurrent accepts → exactly one winner (K4.11–K4.12); an audit-write failure rolls everything back (K4.6–K4.7); duplicate pending invitation refused (K6.6); inviting an active owner refused (K6.7); last usable owner cannot be removed (K7.10); emergency recovery refuses by default and while any usable owner exists (K7.12–K7.13); ordinary dealers/anonymous callers cannot touch owner management (K6.1–K6.2); wrong step-up password / mismatched confirmation refused with nothing created (K6.3–K6.4).

## 5. Neither identity gains privilege from config, a row, a form or this document
Verified by K1.1 (public registration of a designated address refused), K9.2/K9.3 (missing config ⇒ no privilege for a fresh account), K9.6/K9.7 (typo'd config ⇒ reservation lost, no grant), K2.13 (verified designated address with no membership has **no** owner surface in database mode).
