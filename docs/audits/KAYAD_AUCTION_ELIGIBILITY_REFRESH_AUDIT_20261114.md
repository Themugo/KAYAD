# Individual auction journey — bidder eligibility re-check
Date: 2026-11-14

## Finding
Auction registration captures eligibility at registration time. A member missing a required check is stored as `pending_eligibility`. The duplicate-registration path returns the existing row, and the member UI did not provide a way to re-evaluate that row after the member completed the missing verification. This could leave a legitimate member stuck despite subsequently meeting the requirements.

## Repair
- Added authenticated `POST /api/auctions/:id/registration/refresh-eligibility`.
- The operation only advances registrations currently in `pending_eligibility`.
- It re-evaluates the current user against the auction's published bidder requirements.
- If requirements remain unmet, the member remains pending and receives the refreshed blocker snapshot.
- If requirements pass and no commitment is configured, the bidder pass becomes active.
- If requirements pass but a commitment is required, status becomes `pending_commitment`, never active.
- The operation refuses to activate a pass after the auction starts or registration closes.
- Added a member-facing re-check action on the auction detail page and shows the captured blockers.
- Added service regression coverage for success, remaining blockers, commitment gating, closed registration and non-pending registrations.

## Existing safeguards preserved
- Saved/favorited auctions remain separate from auction registration.
- Bid endpoint still calls `assertBidderAuthorized`; only active and eligible registrations with any required commitment satisfied can bid.
- Published terms acceptance remains a registration prerequisite.
- Phone verification and high-value deposit rules remain server-enforced.
- No schema/migration, bid endpoint, payment callback or settlement policy changed.

## Validation
Run `node scripts/validate-auction-eligibility-refresh.mjs`.
The Jest regression suite and full application build have not been executed in this extracted archive because dependencies are not installed here. No live M-Pesa or provider callback was exercised.
