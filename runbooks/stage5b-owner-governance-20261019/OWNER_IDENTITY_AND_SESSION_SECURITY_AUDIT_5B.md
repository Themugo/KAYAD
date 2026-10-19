# Owner identity & session security audit — Stage 5B

Scope: every layer that decides "is this person a platform owner". Method: code reading of each call site, then proof by test at the tier shown.

## Findings and dispositions
| # | Layer / finding | Before (5A) | Now (5B) | Proof |
|---|---|---|---|---|
| 1 | Source of owner privilege | env list; any verified account with a listed address | database membership bound to **user id**, mailbox-verified, account healthy, e-mail unchanged; env list = designation only | PG, J2.19, Jest registry |
| 2 | `protect` (HTTP) | `isOwnerEmail` per request | `isOwnerUser` over a registry snapshot refreshed before each request (TTL default 5 s, single-flight, invalidated on change) | J7.6 |
| 3 | `optionalAuth` | email-based | same predicate | Jest/J |
| 4 | Login / refresh | exempt from some checks via email | same `isOwnerUser`; **unverified owner identity refused** unchanged (5A guard) in every registry mode | Jest registry, J0.5, J10.7 |
| 5 | Sockets | email-based at connect | same predicate; removal calls `disconnectSockets` on `user_<id>` | J5.16, J7.9 |
| 6 | `serializeUser` role presentation | email-based | id-aware (the UI `isOwner` flag only toggles display; server enforces) | U7.1, U10 |
| 7 | Public registration | designated addresses reserved | designated ∪ active ∪ pending-invite addresses reserved | J0.2–J0.5, J1.13 |
| 8 | Squatting: someone registers a designated address first | refused at login (unverified) | invitation acceptance replaces the squatter's credentials and kills their sessions; mailbox proof required | J2.6–J2.9 |
| 9 | Admin escalation (role label, user-admin API, profile, request body/query) | no path | still no path; DB `superadmin` label is not ownership | J4.x |
| 10 | Stale cache | n/a | no indefinite trust: ≤TTL; unreadable store ⇒ short grace on last good snapshot then **fail closed** | Jest registry, J10.x |
| 11 | Concurrency | n/a | invitation issue/accept/revoke are single SQL functions with row locks; 5-round mutual-removal race and duplicate-invite/double-accept races cannot leave zero owners or two usable tokens | PG (97 checks) |
| 12 | Last-owner protection | n/a | enforced inside the database function (not only UI) | PG, J8.4, U8.2 |
| 13 | Step-up | n/a | password re-check on every mutation; 5 failures/15 min lock; wrong password does **not** log out (403, not 401) | J5.1, U2.2 |
| 14 | Secrets | n/a | tokens only in e-mail; DB stores SHA-256; events table CHECK rejects secret-looking keys; no token in logs/API/ledger | J11.3–J11.6, PG |
| 15 | Bootstrap exposure | n/a | operator CLI only (no HTTP route), requires `--operator` and `--confirm-host`, auto-closes, refuses afterwards | Jest CLI, J1, J2.17 |
| 16 | Emergency recovery | n/a | CLI + time-boxed env authorisation (≤24 h) + only when no usable owner + only designated mailboxes | J10.8–J10.13 |
| 17 | **Legacy `seed.js`** pre-verifies owner accounts without mailbox proof | open | **blocked in production** unless a named override is set | Jest contract |
| 18 | Owner authority vs. private resources / ledgers | no bypass | unchanged: no code path in 5B grants owner access to private data, escrow or ledger mutation | AUTHORIZATION_MATRIX_5B.md |

## Residual risks (accepted / owner decisions)
- **Cut-over gap** (see rollback plan): between applying the migration and the owners accepting invitations nobody has owner privilege. Mitigated by doing it in one sitting; reversible with `OWNER_STORE_MODE=legacy`.
- **Single trust anchor = mailbox**: whoever controls a designated mailbox and passes bootstrap/recovery becomes owner. Use out-of-band verification (runbook §2) and keep the mailboxes protected with MFA.
- **Multi-instance propagation** is bounded by `OWNER_REGISTRY_TTL_MS` (default 5 s; 1 s in the test stack); a failed refresh may serve the last good snapshot for at most `OWNER_REGISTRY_STALE_MAX_MS` (default 30 s); local revocation is immediate on the instance that executes it.
- **Live e-mail and hosted behaviour are unproven** (tier H/L not reached).
