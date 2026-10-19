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
