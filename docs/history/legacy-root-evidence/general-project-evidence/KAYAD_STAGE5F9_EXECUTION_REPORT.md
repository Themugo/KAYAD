# Stage 5F.9 — Eligibility gate integration (PARTIAL)

Foundation Stage 5F.8 SHA-256: `abb2c92926df124da2dd54c69ccc6480085b266b2f6110462bf60d5f503b4b6d`.

## Source changes
- Added `backend/services/privateSellerAuctionEligibility.service.js`.
- Wired proposal-backed eligibility into auction setup publication, canonical application-level auction starts, and manual bid controller.
- Gate requires seller payment confirmation, passed inspection, current admin approval bound to current proposal/evidence versions, active approved garage/dealer custody capability, physical receipt state, and no unresolved appeal/incident.

## Critical gaps: NOT fully enforced
The canonical engine uses PostgreSQL RPCs for atomic manual bids, auto-bids, and auction starts. This stage does not modify those RPC bodies to evaluate/lock the proposal and custody rows in the same transaction. Scheduled worker and public live-auction projections also need explicit gating. Missing proposal rows are treated as outside this proposal-backed scope to preserve current dealer flows; seller classification has not yet been authoritatively reconciled. Therefore the universal private-seller policy is NOT yet guaranteed and this build must not be deployed or described as runtime-secure.

## Next required work
Modify all atomic PostgreSQL RPCs to enforce the same eligibility gate under transaction/row locks; wire scheduled starts and public live feed/detail projections; establish authoritative seller classification; add real PostgreSQL/RLS/concurrency tests and full browser journey.

No hosted migration, payment, deployment, commit or push occurred. Full test/typecheck/runtime certification remains outstanding.
