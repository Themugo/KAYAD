# KAYAD Auction Business — Whole-System Audit
Date: 2026-10-02
Baseline: KAYAD-ESCROW-LIVE-OPERATIONAL-CERTIFICATION-FOUNDATION-20261002

## Executive assessment

The auction domain is substantially hardened at its core database/lifecycle layer, but it is **not yet business-complete**. The current system has a strong canonical live auction state on `cars`, atomic bid/payment/close RPCs, reserve enforcement, anti-snipe behavior, fraud detection, Socket.IO updates, admin/dealer lifecycle controls, and real frontend transport.

The remaining work is primarily **business convergence**: define one auction operating model, one bidder-registration/eligibility model, one financial/commitment model, one auction lifecycle contract, one canonical frontend experience, and one post-auction settlement/exception model.

## Current strengths

- `cars` is the authoritative auction read/state model.
- `auctionLifecycle.service.js` is the canonical start/extend service.
- `auctionClose.service.js` is the canonical close path.
- `kayad_start_auction_atomic`, `kayad_extend_auction_atomic`, `kayad_place_bid_atomic`, `kayad_confirm_bid_payment_atomic`, `kayad_auto_bid_atomic`, and `kayad_close_auction_atomic` provide DB-level serialization for critical mutations.
- Hard reserve settlement is enforced in the close RPC.
- Verified-phone eligibility is enforced server-side.
- Dealer self-bidding is blocked.
- Minimum increments are server-calculated.
- Snipe/extension logic exists.
- High-value bidding has an escrow-deposit gate.
- Bid payment callbacks are idempotent and market advancement is atomic.
- Auction integrity/fraud detection exists for self-bidding, related accounts, inflation, velocity and last-second manipulation.
- Existing static auction validators pass: 24/24 domain integrity, 6/6 bid surface, 5/5 transport convergence.

## P0 — business-contract contradictions

### P0.1 Payment/commitment model is inconsistent

Current code contains all of the following concepts:

- `AuctionDisclaimer` says KAYAD does not receive bid security or vehicle purchase payments and payments go directly to the organizer.
- `bidSecurityService.js` sends a bid-security STK toward `KAYAD_MASTER_PAYBILL` and describes the funds as held in KAYAD escrow.
- `AuctionLivePage` displays a 5% bid commitment payment modal.
- The actual canonical `placeBid` path initiates a KES 1 `type: "bid"` payment and stores the real bid amount separately.
- Platform configuration exposes `bidCommitmentPct` and `auctionRegistrationFee`, but the canonical bid flow does not use them.

This is the highest-priority business defect because users, accounting, legal terms and payment callbacks do not describe one economic event.

### P0.2 Bidder registration is not a real domain flow

The actual bid endpoint performs eligibility checks inline. There is no canonical auction-registration record, bidder pass, registration deadline, KYC/verification state, deposit state, or explicit registration acceptance attached to an auction.

The frontend readiness/compliance model expects registration/security concepts that are not represented by the authoritative auction schema.

### P0.3 There are two auction presentation experiences

- `AuctionsView` is the main active-auction tab and uses canonical `auctionService` + `bidApi`.
- `AuctionDiscoveryNetwork` is another real-data auction discovery experience with its own live/upcoming/completed presentation and Watch Live flow.

Neither is inherently fake, but they overlap. The business needs one canonical auction information architecture with reusable discovery/detail/bidding components rather than two independently evolving auction products.

### P0.4 Auto-bidding exists in the backend but is not a complete bidder product

The DB atomic auto-bid engine exists and is invoked after confirmed bids, but the canonical public bid client does not expose `maxBid`, there is no clear auto-bid setup/cancel UI, and the legacy Redis `autoBid.service.js` is not the authoritative engine.

This means proxy bidding is technically present but not exposed as a complete business capability.

## P1 — lifecycle/business gaps

### P1.1 Auction creation/readiness

The readiness engine describes a rich auction setup model including:
- organizer verification
- business registration
- auctioneer/dealer licensing where applicable
- payment account verification
- vehicle ownership/VIN/registration
- media
- viewing arrangements
- inspection
- bid security/refund policy
- dates/times
- auction rules/terms
- winner fulfilment

Much of this is currently a frontend readiness/compliance concept rather than a persisted, enforced publication contract.

### P1.2 Auction registration window

The risk engine identifies insufficient registration windows, but the live auction model does not provide a canonical registration-open/registration-close state or enforce it.

### P1.3 Bidder eligibility

Current hard checks are mainly:
- authentication
- verified phone
- not seller
- auction live
- bid increment
- high-value deposit

A production auction business should additionally model configurable eligibility: identity/KYC, sanctions/risk screening where appropriate, bidder agreement acceptance, deposit/commitment state, account restrictions, outstanding defaults, and auction-specific eligibility.

### P1.4 Bid increments

The backend has canonical tiered increment logic, but frontend live-page quick bids currently use a hard-coded KES 5,000 increment in places. The auction service exposes `bidIncrement`, but the UI does not consistently consume the authoritative value.

### P1.5 Auction start

DB rules require 24h minimum duration and KES 1,000 starting bid. The dealer setup respects these constraints. Admin setup currently defaults to starting bid `0` and relies on the server to reject invalid configurations; the admin UI should not allow invalid business configurations to be submitted.

### P1.6 Reserve semantics

Hard reserve is enforced atomically. Soft reserve and no-reserve are represented, but their buyer-facing disclosure and admin decision model need a single explicit contract.

### P1.7 Auction close/winner lifecycle

The atomic close path is strong. The business layer still needs explicit post-close states and workflows for:
- reserve not met
- winner payment deadline
- winner default
- seller rejection where permitted
- payment pending
- payment failed
- re-award to next eligible bidder
- cancellation/void
- dispute
- settlement completed

### P1.8 Winner settlement

The system now converges auction close with the hardened escrow/ledger architecture, but the auction domain should own a clear `won -> payment_due -> paid -> escrow_funded -> fulfilment -> completed` business state rather than relying only on car/escrow/payment state combinations.

### P1.9 Loser/deposit lifecycle

A complete bidder commitment/deposit model must define authorization, hold, release, forfeiture, refund, timing and reconciliation. Current implementation is fragmented between legacy bid-security code and the current bid-payment path.

## P1 — anti-abuse and trust

Existing fraud detection is a strong foundation. Completion should add:
- device/session fingerprinting
- account linkage policy
- bidder risk tiers
- blocked bidder enforcement
- manual review queue
- suspicious bid hold policy
- evidence timeline
- appeal/decision trail
- bid cancellation policy
- auction freeze/emergency controls
- abuse-rate metrics

## P1 — realtime

Current Socket.IO emissions exist for bids, extensions and auction end. Completion needs:
- reconnect/resync from authoritative HTTP state
- monotonic event/version handling
- stale-event rejection
- timer synchronization against server time
- auction-ended reconciliation
- payment-confirmed reconciliation
- browser multi-tab behavior

## P1 — communications

Complete event catalogue should cover:
- registration approved
- registration rejected/needs action
- auction starting soon
- auction live
- bid submitted/pending
- bid payment confirmed
- outbid
- proxy bid activated
- snipe extension
- auction ending soon
- auction ended
- reserve not met
- winner
- winner payment due
- payment overdue
- escrow funded
- fulfilment/collection
- refund/deposit release
- dispute opened/resolved

## P1 — admin business control

The current admin auction page is functional but too operationally shallow. It should become an Auction Operations Center with:
- readiness queue
- registration/eligibility queue
- live auction monitor
- bid stream
- suspicious activity queue
- reserve exceptions
- close/settlement queue
- winner payment queue
- default/re-award queue
- reconciliation exceptions
- auction freeze/emergency controls
- immutable auction timeline
- role-specific permissions

## P1 — dealer/organizer business

Dealer/organizer should have a guided auction wizard:
1. Select vehicle
2. Verify ownership/listing authority
3. Complete inspection/media
4. Configure auction economics
5. Configure viewing/collection
6. Configure rules/terms
7. Configure bidder requirements
8. Configure commitment/deposit policy
9. Preview public auction
10. Submit for review
11. Approved/scheduled
12. Live
13. Closing
14. Settlement
15. Completed

## P1 — buyer/bidder business

Canonical bidder journey should be:
1. Discover auction
2. Review vehicle and inspection
3. Review organizer/license/trust identity
4. Read auction terms
5. Register for auction
6. Complete verification/eligibility
7. Complete commitment/deposit if required
8. Receive bidder status/pass
9. Join live auction
10. Place manual/proxy bid
11. Receive payment confirmation
12. Monitor outbid/realtime events
13. Win or lose
14. If winner, complete purchase/escrow
15. Complete collection/title transfer
16. Receive final documents/receipt

## P1 — legal/compliance operating model

The platform currently describes KAYAD as a technology marketplace while implementing auction technology, bidder registration, bidding, winner selection and payment-adjacent functions. The product must explicitly determine whether each auction is:

A. conducted by a licensed external auctioneer/organizer using KAYAD as technology infrastructure, or
B. conducted by KAYAD itself under the applicable auctioneer/licensing model.

This is not a UI decision. It affects licensing, client-money/payment handling, terms, notices, records, organizer verification and liability allocation.

Kenya's Auctioneers Act defines an auctioneer broadly to include a person who sells by auction or offers property for sale by auction/competitive sale, and establishes licensing requirements. The Auctioneers Rules also define client money and client accounts. These should be reviewed with Kenyan counsel before the platform chooses its final operating model. See Kenya Law sources in the project audit response.

## P2 — analytics and economics

Required auction metrics:
- auctions created
- published
- scheduled
- live
- completed
- reserve-met rate
- sell-through rate
- average bids/auction
- unique bidders/auction
- bid-to-win ratio
- bidder conversion
- payment conversion
- winner default rate
- re-award rate
- average time-to-payment
- GMV
- buyer premium/platform fee
- organizer commission
- deposit volume
- refund volume
- fraud rate
- disputes
- auction latency/event health

## P2 — data/reconciliation

The final auction business needs a canonical reconciliation chain:

`Auction → Bid → Bid Payment/Commitment → Winner → Purchase Payment → Escrow → Ledger → Payout → Ownership → Documents`

Every economic event needs a durable external reference, internal event ID, actor, timestamp, amount, status and reconciliation state.

## P2 — reliability

Required failure scenarios:
- duplicate bid submission
- duplicate M-Pesa callback
- payment succeeds but browser disconnects
- payment callback arrives after auction closes
- two bidders submit simultaneously
- auction closes while callback is processing
- Redis unavailable
- Socket.IO unavailable
- timer worker unavailable
- database transient failure
- provider timeout
- provider success with mismatched amount
- winner payment timeout
- organizer cancellation
- reserve not met
- service restart during close

## Current audit verdict

**Core auction engine: strong / hardened.**

**Auction business: incomplete.**

The highest-value next work is not another generic security sweep. It is to converge the auction business model and then implement it in this order:

1. Financial/commitment model decision.
2. Organizer/licensing operating model.
3. Canonical bidder registration/eligibility domain.
4. Canonical auction setup/readiness/publication contract.
5. Canonical public auction information architecture.
6. Complete bidding + proxy bidding product.
7. Close/winner/default/re-award state machine.
8. Winner payment → escrow → ownership settlement.
9. Deposit/commitment/refund lifecycle.
10. Admin Auction Operations Center.
11. Fraud/review/appeal operations.
12. Communications/realtime completion.
13. Reconciliation/analytics.
14. Full staging/load/end-to-end certification.
