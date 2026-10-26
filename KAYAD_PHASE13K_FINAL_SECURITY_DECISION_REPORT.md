# KAYAD Phase 13K — Final Security Decision Report

## Status: A — PUBLIC DETAIL EXPOSURE FIXED LOCALLY — SECURITY REGRESSION VERIFIED

## Basis
- Reproduced with fully populated synthetic data: `GET /api/cars/:id` and `GET /api/v1/cars/:id` (one shared implementation) returned the raw 110-field row plus a seller object with account email/phone/bio/location. Reserve price, listing dealer phone, chassis, VIN, registration number, highest-bidder id, winner and payment state were all exposed anonymously and cached for 10 minutes.
- Additional exposures found and fixed: `GET /api/search` (raw rows, same fields) and `GET /api/cars` (seller account phone in every card).
- Fix: dedicated allowlist projection (`backend/utils/publicVehicleProjection.js`) applied at the three public boundaries, before the cache stores the body. Owner and staff keep the existing full record. Hidden/pending/draft/deleted states still 404. VIN and seller phone hidden per owner decision; UI guards avoid empty VIN elements; chat remains.
- Verification: 276/276 real-HTTP checks (162/276 before), 13J 145/145, 13I matrix 78/0 and exposure 165/0, typecheck/build/Jest/Vitest/node:test pass, browser 28/28 at desktop and 390px, protected-domain audit 1343/1343 unchanged.

## Caveats
1. `validate:stage5f7-private-auction-contract` fails (missing doc), pre-existing and identical to baseline.
2. Accessibility violations (critical=4, serious=3) are pre-existing and unchanged.
3. Pre-existing SPA deep-link race (not fixed).
4. UI guards in three frontend files went slightly beyond the three authorized backend files; they follow directly from the VIN decision and are hide-only.
5. The seller id remains in the public view (needed for chat and showroom links).
6. Archive location differed from the prompt.
7. No commit, push, deploy or migration.

## Closing statement
- The public-detail data-exposure blocker is **closed locally**.
- **Unverified in staging/production:** deployed behavior, CDN/edge or other shared caches that may still hold pre-fix bodies (purge on rollout), real data shapes, and any fields present only in production schemas. No staging or production certification is claimed, and this is not a platform release-readiness claim.
- **Phase 14 implementation may begin**, with the staging verification and cache purge listed above carried forward as release prerequisites.
