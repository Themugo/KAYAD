# KAYAD Auction Business — End-to-End Completion Plan

## Phase 0 — Business constitution (P0)

Decide and freeze:
- Who is the auctioneer/organizer of record?
- When is KAYAD only technology vs operator?
- Who receives bid security/commitment money?
- Is there a bidder registration fee, bid commitment percentage, refundable deposit, or KES 1 bid-confirmation payment?
- Who holds funds and in what account structure?
- What is refundable, forfeitable and when?
- Who bears buyer default risk?
- What are buyer premium, seller commission and platform fees?

**Exit gate:** one written economic/legal model; no contradictory UI, API or configuration remains.

## Phase 1 — Auction domain constitution

Create one canonical auction business state model covering:
`draft → readiness → review → scheduled → registration_open → live → closing → reserve_decision → winner_payment_due → paid → escrow_funded → fulfilment → completed`
with explicit exception states:
`rejected, suspended, cancelled, reserve_not_met, payment_overdue, defaulted, reaward_pending, disputed, voided`.

Persist auction-specific identity and lifecycle data without duplicating `cars` as the vehicle authority.

**Exit gate:** one canonical state machine and one transition authority.

## Phase 2 — Organizer/dealer onboarding

Build:
- organization profile
- KYC/business verification
- dealer/auctioneer license evidence
- authorized seller/owner relationship
- payment-account verification
- support contacts
- auction policy acceptance
- suspension/expiry rules

**Exit gate:** an unqualified organizer cannot publish an auction.

## Phase 3 — Vehicle auction readiness

Build the auction readiness gate from the existing readiness/compliance concepts:
- ownership/VIN/registration
- inspection
- media
- viewing
- collection
- documents
- condition disclosures
- reserve/opening bid/increment
- auction terms
- fulfilment instructions

**Exit gate:** no auction enters registration without passing all blocking checks.

## Phase 4 — Auction setup & publication

Build a guided setup wizard:
- economics
- dates/timezone/server time
- reserve
- increment
- anti-snipe policy
- bidder requirements
- deposit/commitment
- payment deadlines
- winner fulfilment
- cancellation/default rules
- terms version
- public preview

**Exit gate:** published auction is immutable for protected fields unless a controlled amendment is recorded.

## Phase 5 — Bidder registration & eligibility

Create a real auction registration domain:
- bidder profile
- KYC/phone/email verification
- terms acceptance/version
- eligibility checks
- deposit/commitment status
- registration timestamps/deadline
- bidder number/pass
- restrictions/suspension
- risk tier

**Exit gate:** only registered/eligible bidders can bid.

## Phase 6 — Auction discovery/tab

Converge `AuctionsView` and `AuctionDiscoveryNetwork` into one public auction experience with reusable components:
- Live now
- Starting soon
- Registration open
- Ending soon
- Recently completed
- search/filter/sort
- location/category/price
- inspection/trust badges
- reserve disclosure policy
- organizer identity
- auction rules
- registration CTA

**Exit gate:** one canonical frontend auction surface and one canonical detail route.

## Phase 7 — Live auction room

Build a canonical room with:
- server-synchronized countdown
- current bid
- authoritative increment
- bid history policy
- bidder's own state
- registration/eligibility status
- proxy bid controls
- outbid alerts
- anti-snipe extension banner
- connection/reconnect state
- auction event timeline
- reserve state where legally/business appropriate

**Exit gate:** reconnecting a browser always converges to authoritative server state.

## Phase 8 — Manual bidding

Harden:
- explicit client idempotency key
- bid request receipt
- pending payment state
- provider callback
- exact amount/reference reconciliation
- concurrent bidder tests
- duplicate submission tests
- stale bid rejection

**Exit gate:** one accepted bid request produces one economic event.

## Phase 9 — Proxy/automatic bidding

Replace the incomplete public exposure with a full product:
- set maximum bid
- edit maximum
- cancel proxy
- show active proxy status
- tie-breaking policy
- increment policy
- bid authorization
- max-bid privacy
- proxy audit trail
- concurrency tests

The database atomic engine remains canonical; the legacy Redis auto-bid service should be retired or explicitly isolated as non-authoritative.

**Exit gate:** proxy bidding works entirely through the canonical DB engine.

## Phase 10 — Auction close & winner

Build explicit close outcomes:
- winner
- no winner
- reserve not met
- winner payment due
- manual/admin close
- timer close
- emergency close
- re-award candidate

**Exit gate:** all close paths converge to one atomic state transition and one immutable outcome.

## Phase 11 — Winner payment & escrow

Connect:
`winner → payment due → payment → escrow → ledger → seller payout → ownership`

Use the already-hardened escrow architecture rather than creating auction-specific escrow.

**Exit gate:** one won auction creates one canonical purchase/payment/escrow chain.

## Phase 12 — Default / re-award / cancellation

Implement:
- payment deadline
- reminders
- default classification
- deposit consequences
- re-award to next eligible bidder
- seller cancellation rules
- organizer cancellation
- auction suspension
- dispute handoff

**Exit gate:** every non-happy path has a deterministic owner and financial consequence.

## Phase 13 — Bid security / commitment lifecycle

After Phase 0 decides the economics, implement one model only:
- authorization/hold
- successful settlement
- release
- refund
- forfeiture
- partial forfeiture where permitted
- reconciliation
- provider callbacks
- receipts

Delete/retire contradictory legacy bid-security flows only after route/import/test proof.

**Exit gate:** the UI, payment provider, ledger and terms all describe the same amount and recipient.

## Phase 14 — Fraud & trust operations

Expand existing integrity engine into an operations workflow:
- risk score
- suspicious bid queue
- self-bid detection
- linked accounts
- device/IP signals
- velocity
- abnormal bidding patterns
- manual review
- freeze
- appeal
- decision/audit trail

**Exit gate:** suspicious activity cannot silently alter a financial outcome.

## Phase 15 — Admin Auction Operations Center

Tabs/queues:
- Readiness
- Registration
- Live auctions
- Bids
- Risk
- Closing
- Winners/payment due
- Re-awards
- Reconciliation
- Disputes
- Audit
- Emergency controls

Actions are permission-specific and backend-enforced.

**Exit gate:** every admin action has a business permission, audit record and safe failure behavior.

## Phase 16 — Communications

Implement the full event catalogue and retry/idempotency model for email, SMS, WhatsApp and in-app notifications.

**Exit gate:** every material auction state change has a reliable notification and no duplicate provider sends.

## Phase 17 — Reconciliation & analytics

Build:
- auction financial ledger view
- payment reconciliation
- deposits/commitments reconciliation
- winner payment reconciliation
- escrow reconciliation
- payout reconciliation
- provider mismatch queue
- auction economics dashboard
- organizer statements
- bidder receipts

**Exit gate:** finance can reconcile every auction from bid to payout.

## Phase 18 — Legal/compliance evidence

Create immutable records for:
- organizer/license verification
- bidder registration
- terms version acceptance
- auction amendments
- bid events
- payment events
- winner decision
- reserve decision
- notices
- disputes
- settlement

Review the final operating model against Kenyan auctioneer licensing/client-money requirements with qualified counsel before production activation.

## Phase 19 — Certification

### Functional
- 50+ auction scenarios

### Concurrency
- 10–100 concurrent bids
- close vs bid race
- callback vs close race
- duplicate callbacks
- duplicate bid requests

### Security
- role matrix
- bidder isolation
- organizer isolation
- admin privilege matrix
- RLS
- sensitive-data leakage

### Financial
- commitment/deposit
- bid payment
- winner payment
- escrow
- payout
- refund
- default
- re-award

### Reliability
- Redis unavailable
- Socket.IO unavailable
- provider timeout
- worker restart
- DB transient error
- reconnect/resync

### Browser
- discovery
- registration
- live room
- bidding
- proxy bidding
- win
- payment
- post-sale

**Final gate:** real staging PostgreSQL + RLS + real M-Pesa sandbox + browser journeys + reconciliation + load test.
