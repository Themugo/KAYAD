# KAYAD Phase 13J — Final Security Decision Report

## Decision
**A. LOCAL SECURITY FIX VERIFIED — STAGING REVIEW REQUIRED** — for the confirmed blocker (`GET /api/auctions/:id/registration`), with one new, separate, release-relevant finding recorded below.

## What was fixed
Authorized by the owner for this single route only. The endpoint no longer serializes the raw listing row or the raw auction-setup row. Ordinary and privileged authenticated callers receive an identical minimal contract; hidden, pending, draft, soft-deleted, unpublished-setup and nonexistent listings all return the same generic 404. The reproduction (13I) and the new suite show: before 105/145 checks failing with reserve price, dealer phone, chassis number, VIN, highest-bidder/seller ids, payout destination, fulfilment location and readiness snapshot leaking; after 0 failures in scope.

## Corrections to the 13I assessment
1. The 13I proposed patch was **incomplete**: it left the full `auction_setups` row (reserve price, payout account, fulfilment details, organizer id) in the response. 13J supersedes it.
2. 13I's statement that the anonymous public detail "does not expose" reserve/phone/chassis/highest-bidder was based on fixtures with those columns empty. With populated values it does expose them (below).

## New finding (NOT fixed — outside authorized scope, needs an owner decision)
Anonymous `GET /api/cars/:id` and `/api/v1/cars/:id` return `reservePrice`, `dealerPhone`, `chassisNumber`, `highestBidder`/`highest_bidder_id`, `vin`, and dealer id for public (available/sold) listings when populated; the list endpoint exposes the dealer id. Dealer phone may be an intended contact field (the handler honours a dealer visibility setting), but reserve price, chassis number and highest-bidder id are not plausibly intended as public. Evidence: suite check `OPEN-OUT-OF-SCOPE` and the probe described in the root-cause analysis. This affects the *public marketplace* serializer, which the 13J rules said not to redesign, so it was only recorded. It should be treated as a release-gating security item with its own authorization (serializer allowlist on `getCar`, plus a regression test; the 13J suite already contains the failing check to flip).

## Gate answers
- **Is the registration-endpoint security blocker closed locally?** Yes — reproducible exposure removed and regression-tested over real HTTP on the disposable stack; protected-domain audit shows the single authorized file changed.
- **Can the project proceed to Phase 14 dealer-dashboard implementation?** Yes for the dealer-dashboard work itself, which does not depend on this route, **provided** the public-detail exposure above is logged as an open release-blocking item and scheduled (it does not touch dealer-dashboard code, but a platform release is not supportable while it is open).
- **Platform release readiness:** not claimed. Staging and production are unverified; a staging review of the new route contract (and the open public-detail item) is required before any release.

## Residual notes
- The caller's own `registration` row (own eligibility snapshot, commitment ids) is returned unchanged; it is the caller's own data and the SPA uses it. Narrowing it is an optional hardening that was not required for this blocker.
- Owner/admin/dealer have no special behaviour on this route (none existed). A future owner-facing view would need its own explicit rule.
- No migrations, commits, pushes, deployments, staging or production actions were performed.
