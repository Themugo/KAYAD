# Auction configuration contract and state-transition findings

Derived from code, migrations and tests; no rules were invented.

## Dealer-configurable terms
Per-listing auction setup (`/api/dealer/cars/:id/auction/setup`) is owned by the listing's dealer (service ownership check, role dealer, verified dealer). Lifecycle: draft setup -> publish (idempotent when already published) -> published setup is immutable (409) -> changes only via a controlled amendment request (reason required) that does not alter live terms.

## Findings
1. **Release-critical: the setup/publish/amend endpoints were unreachable.** `dealerRoutes` ends in a catch-all 404 and was mounted before `auctionSetupRoutes`, although the frontend (`src/api/api.exports.ts`) calls them. 14.9 mounts `auctionSetupRoutes` first. This ACTIVATES the dealer auction-setup feature for the first time; it needs staging validation and a product sign-off before production. Rollback = revert the single mount line in server.js.
2. **State guard added**: setup, publish and amendment now refuse deleted (404), sold, reserved, live, ended and bid-bearing listings (409 `AUCTION_SETUP_LOCKED`, with reason). Previously only ownership was checked.
3. **Protected terms**: once published, terms are immutable (existing behavior, verified); after bids exist nothing can be saved or published (new guard). Deposit/bid engine, reserve logic, escrow and ledger code were not modified.
4. **Dealer deposit destination is ignored (protected domain, NOT changed)**: `bidSecurityService.initiateBidSecurity` passes the dealer-supplied `commitment.recipientAccount` to `stkPush`, but `loadConfig(overrides)` spreads it as a no-op, so deposits always use the platform shortcode. Behavior is safe (a dealer cannot redirect funds) but the configured field is misleading. Decision needed: remove/ignore the field in the UI contract, or authorize a design for dealer-specific destinations. Either crosses the protected deposit boundary.
5. **`dealers.payment_details` (paybill/till/bank/mpesaPhone) is inert**: stored via PUT /dealer/settlement, validated in 14.9, but consumed by no money-routing code.
6. **Correction to 14.8**: "reserved" is a dealer-settable listing status (available/reserved/sold/pending_auction), not a system hold. The 14.8 delete block stands; the owner releases by changing status. Whether a reserved listing may be purchased is an open product decision (initiation still allows reserved).
7. The platform is a facilitator with funds-handling responsibility in the existing design: collections land on the platform shortcode, escrow holds, release triggers B2C payout to the dealer.
