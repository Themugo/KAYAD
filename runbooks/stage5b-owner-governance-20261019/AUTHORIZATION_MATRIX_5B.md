# Authorization matrix (Stage 5B)

Legend: ✔ allowed · ✘ refused (status) · 〇 own records only. Evidence column names the test layer that proves it (J = real-stack API journey, U = browser journey, R = route-guard Jest, PG = disposable PostgreSQL).

| Capability | Owner (active, verified) | Owner membership revoked / unverified | Ordinary admin | Dealer | Private seller | Unauthenticated | Evidence |
|---|---|---|---|---|---|---|---|
| View Admin → Owners / `GET /api/owner` | ✔ | ✘ 401/403 | ✘ 403 | ✘ 403 | ✘ 403 | ✘ 401 | R, J0.1, J4.1, J7.11, U7, U10 |
| Invite / resend / revoke invitation | ✔ + password + typed address | ✘ | ✘ 403 | ✘ 403 | ✘ 403 | ✘ 401 | R, J5, J6 |
| Remove owner / leave | ✔ (not last usable owner) | ✘ | ✘ | ✘ | ✘ | ✘ | J7, J8.4, PG, U8 |
| Recover another owner | ✔ + out-of-band evidence | ✘ | ✘ | ✘ | ✘ | ✘ | J9 |
| Accept an invitation | only the mailbox owner holding the link, once | — | same rule: link + mailbox ownership; role is irrelevant | same | same | link holder may set a password only for a not-yet-verified invited address | J2, J5, J6, U5 |
| Grant owner by editing role (`role=webhoist/superadmin`, profile edit, admin user update) | n/a | n/a | ✘ (no effect: role label is not authority) | ✘ | ✘ | ✘ | J4.7–J4.10 |
| Public registration / dealer / seller onboarding touching owners | n/a | n/a | n/a | ✘ reserved addresses refused; cannot alter membership | ✘ | ✘ | J0.2–J0.5, J1.13 |
| Onboarding & moderation policy (Stage 5) | ✔ | ✘ | read-only | ✘ | ✘ | ✘ | J3, J4.4, J7.12 |
| Approve/reject dealers, publish listings | per policy `owner_only` (default) – no silent approval | ✘ | only if policy says `admins` | ✘ | ✘ | ✘ | Stage 5 suites (unchanged) |
| Private resources of another user (garage, messages, escrow party views) | **✘ no bypass** – ownership checks still apply | ✘ | ✘ | 〇 | 〇 | ✘ | Stage 1/5A authz suites (unchanged) |
| Ledger / escrow mutations, idempotency keys | **✘ no bypass** – same service rules for everyone | ✘ | per role | per role | per role | ✘ | unchanged code paths; not altered in 5B |
| Sockets (`user_<id>` rooms, admin rooms) | owner privilege re-read from the store at connect; removed owners are disconnected immediately | ✘ | admin rooms only | own | own | ✘ | J7.9 |
| Refresh / login | allowed only while membership usable; unverified designated address refused (5A guard) | ✘ | n/a | n/a | n/a | ✘ | J7.6–J7.7, J10.7, 5A suites |

Layer consistency: the same predicate (`isOwnerUser` over the registry snapshot, TTL default 5 s, 1 s in the test stack, invalidated synchronously on every membership change) is used by `protect`, `optionalAuth`, login, refresh, `serializeUser`, socket authentication and `requireOwner`. No owner status is cached beyond the TTL.

## Closure additions
| Path | Rule | Evidence |
|---|---|---|
| `POST /admin/staff` with a reserved owner address | ✘ 409 for everyone (including owners): owner addresses join only through the invitation flow | Jest CL-6 |
| Inspector-application approval for a reserved owner address | ✘ 409 (would otherwise set `emailVerified=true` without mailbox proof) | Jest CL-6 |
| Accept an invitation for a **verified** existing account while not signed in as that account | ✘ `OWNER_LOGIN_REQUIRED`; a link alone never resets the credentials of a verified account | J9.2b, gov_closure C2.2 |
| Accept while signed in as another account | ✘ refused, invitation stays pending | gov_closure C2.1/C2.3 |
| Owner endpoints while the store is unreadable or was dropped under a running process | ✘ 503 `OWNER_STORE_UNAVAILABLE`, nobody is owner (fail closed) | J10.x, gov_closure C6.2–C6.3 |
| Banned / deactivated / unverified owner account | ✘ no owner power immediately (real-time check, not cache) | Jest CL-4 |
| Protect an owner account from ban/delete/role edit | ✔ protection holds in database, legacy **and** error modes | Jest CL-5 |
| Verified designated account with **no** membership after the migration | ✘ ordinary user (no escalation window) | gov_closure C1 |

