# KAYAD Phase 13I — Findings recorded for later workstreams (not fixed here)

## Personal account / marketplace (for planning, none blocks the personal-account gate)
1. `PATCH /api/cars/:id/promote` lets an owner set `isPromoted`, contradicting the `STAFF_ONLY_LISTING_FIELDS` policy applied in `updateCar`. Decide whether promotion is staff-only or a paid owner feature.
2. A pending **legacy** `individual_seller` is told "selling tools unlock after approval" yet keeps the workspace entry (the backend still admits pending legacy sellers). Align policy and UI.
3. The admin review UI offers no **Revoke** for a suspended application (API allows suspended→revoked).
4. `GET /api/valuation/:id` inserts a `vehicle_valuations` row (including VIN/registration number) for every uncached call — review retention and rate limits.
5. A rejected legacy `individual_seller` cannot reapply online (`canApply=false` by design); a support/admin path is the only route — confirm that is the intended product behaviour.
6. Logout revokes the bearer token (verified, 401 afterwards); session behaviour is otherwise unchanged.

## Dealer workstream (unchanged in 13I, to be planned next)
7. Dealer dashboard / Dealer Hub: unchanged and verified present (UI DL1–DL4, component tests). Business/operational polish is the next workstream.
8. 19 staff/dealer routes fail for code reasons (undefined model identifiers, unimplemented model statics): `feature-flags`, `listing-quality`, `marketplace-health`, `notification-analytics`, `dealer-health-score`, queue statistics. `/api/dealer-health-score/ranking/list` is the only one reachable anonymously (500, not a data leak). Owner decision: implement vs retire.

## Platform
9. Open security blocker: `GET /api/auctions/:id/registration` (see its own report).
10. `stage5f7-private-auction-contract` validator fails because the three planning documents it reads are not in the package (ENOENT) — unchanged, not weakened, does not affect this phase.
