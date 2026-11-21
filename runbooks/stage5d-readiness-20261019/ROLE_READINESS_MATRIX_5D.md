# Stage 5D — Dealer / private seller / inspector readiness (Gate 6)

Tier **R** — local real stack (PG16 + PostgREST + backend 5D tree), disposable identities, provider **stubs**. **Staging/hosted: BLOCKED** (no staging environment was provided; hosted schema is behind — see the preflight matrix). Verification is never bypassed: journeys use the real approval endpoints.

| Role | Journeys (API) | Result | Notes |
|---|---|---|---|
| Private seller | role_api_a | 70 pass / 0 fail | register → verify e-mail → list; suspended seller blocked; seller denied owner/admin APIs |
| Dealer | role_api_b | 67 pass / 0 fail | onboarding gate, admin verification, suspension/deactivation enforcement; `users.status='suspended'` alone is NOT an enforcement mechanism (documented) |
| Inspector / provider | role_api_c | 55 pass / 0 fail | application, banned inspector 403, suspended provider cannot get work (409) |
| Cross-role | role_api_h (60), role_api_i (64) | pass | suspend/reinstate by owner; seller lifecycle remains denied owner/admin |
| Owner | role_api_d | 49 pass / 0 fail | see owner readiness |

Totals 365 pass / 0 fail. Observation O5C1-01 (sellers reach dealer-platform APIs) stands as documented policy. **Hosted/staging readiness: not claimed.**
