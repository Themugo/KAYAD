# 11 — Session Expiry and Revocation

Real backend, disposable DB (journey 16, 31/31 incl. these). Result per scenario:
| # | Scenario | Result |
|---|---|---|
| S1 | Valid session works | VERIFIED |
| S2 | Logout, then replay old cookies | 401 VERIFIED |
| S3/S4 | Revoke-all; old access token dies immediately (token-version bump) | VERIFIED |
| S5 | Deactivated account on existing session | 403 VERIFIED |
| S6 | Banned account (`is_banned`) on existing session | refused VERIFIED |
| S7 | Refresh with valid cookie rotates | 200 VERIFIED |
| S8 | Reuse of an already-rotated refresh token | rejected (401/403) VERIFIED |
| S9 | After reuse the newer refresh token is also dead (family revoked) | VERIFIED |
| S10 | Garbage token | 401 VERIFIED |
| S11/S12 | Team member works, then membership suspended: next request 403 without logout | VERIFIED |
| (journey 16) | Member removed → next request 403; dealership suspended → members refused | VERIFIED |
| S13 | Self-promotion in DB to dealer cannot reach admin API (privilege checked server-side) | VERIFIED |
| S14 | State-changing call without CSRF/session | rejected VERIFIED |
| — | Natural access-token expiry / refresh TTL expiry | **NOT TESTED** (needs clock control); unit tests only |
| — | Password change / role change / subscription change revoking other sessions | **NOT TESTED** end-to-end |
| — | Multi-device concurrent logout, offline-then-online resume | NOT TESTED |

Observation: `users.status='suspended'` alone does **not** block an existing session at `protect` (only `is_banned` / `deactivated_at` do); the dealership-level `suspended` status does cut team members. Whether account-level `suspended` should block sessions is a behaviour question for the owner — not changed.
