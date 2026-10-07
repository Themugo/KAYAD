# KAYAD — Auction 360 Audit & Hardening
## 7 October 2026

### Foundation / constraints preserved
- Continued from the existing KAYAD production foundation.
- No second auction marketplace introduced.
- No mock inventory introduced.
- Existing auction information architecture preserved.
- Canonical customer discovery remains `AuctionsView`.
- Canonical auction room remains `/auction/:id`.
- Canonical auction lifecycle remains the car row + published `auction_setups` contract + atomic PostgreSQL transitions.
- Dealer/admin controls continue to converge on the same lifecycle service.
- Dealer-configured auction economics/rules remain authoritative inside the platform-policy envelope.
- Direct settlement remains allowed; escrow remains optional and explicit.

---

# 1. Executive result

The auction domain is substantially more coherent after this pass. The audit covered:

1. Customer auction discovery
2. Scheduled / live / ended / saved tabs
3. `/auction/:id` live room presentation
4. Registration and bidder eligibility
5. Terms acceptance
6. Bid amount / increment rules
7. M-Pesa bid confirmation flow
8. Realtime bid updates
9. Anti-sniping / extension rules
10. Auto-bidding
11. Auction start / schedule
12. Auction close / winner determination
13. Reserve handling
14. Direct settlement
15. Optional escrow settlement
16. Collection / transfer / fulfilment handoff
17. Dealer auction setup
18. Dealer auction operations
19. Admin auction control
20. Public/private API boundaries
21. Bidder PII exposure
22. RLS / atomicity-related surfaces
23. Legacy / duplicate engines and wording
24. Mobile presentation contracts
25. Failure / stale-state behavior

The dedicated hardening validator is now **28/28 PASS**.

Existing auction validators also remain green:

- Bid surface: **6/6**
- Auction domain integrity: **24/24**
- Transport convergence: **5/5**
- Phase 4 setup/publication: **PASS**
- Phase 5 registration: **PASS**
- Phase 7 bidding-room lock: **8/8**
- Phase 8 settlement: **14/14**
- Phase 9 fulfilment: **21/21**
- Phase 10 integration: **32/32**

This is source-level/static certification only. A real production build/browser run is still required on the established Node **22.22.2** environment with installed dependencies and a real staging/live Supabase environment.

---

# 2. Customer presentation audit

## Fixed in this pass

### A. Duplicate live-room headers
The live auction page was presenting a newer premium domain header **and** a second legacy auction header containing the same vehicle/title/status/connection information.

**Action:** removed the duplicate legacy header and retained the premium canonical header with an `All Auctions` action.

### B. Duplicate journey rails
The page was rendering both `AuctionExperienceRail` and `DomainJourneyRail`.

**Action:** the live room now uses one journey rail rather than two competing progress systems.

### C. Scheduled auction falsely looked ended
The legacy header treated every non-live auction as ended.

**Action:** scheduled auctions now present **STARTING SOON** and registration state correctly.

### D. Completed cards showed “Starting bid”
Completed auctions were using the starting bid as their primary value.

**Action:** completed auctions now show **Final bid**; live auctions show **Current bid**; scheduled auctions show **Starting bid**.

### E. Saved tab reused the tab label as lifecycle state
A saved live auction could be displayed as a completed auction because the card derived state from the current tab.

**Action:** cards now derive lifecycle state from the actual auction response status, independent of which discovery tab is being viewed.

### F. Verified-organizer badge was not reliably wired
The UI looked for a snake-case field that the canonical auction response did not provide.

**Action:** presentation now consumes the canonical dealer verification signal.

### G. Four discovery tabs had a three-column layout
The page had four segments — Live, Starting Soon, Completed, Saved — but the desktop grid was configured for three columns.

**Action:** desktop is now four columns, collapsing to two on smaller layouts.

### H. Quick bid amounts could violate the configured increment
The live room offered `+10K`, `+25K`, and `+50K` shortcuts regardless of the auction's configured increment.

Example: a KES 25,000 configured increment could receive a shortcut that was below the valid next bid.

**Action:** quick amounts are now `min bid + configured increment × N`.

### I. “Wallet” label did not match the actual surface
The auction mobile dock used **Wallet** while the destination was the existing Payments surface.

**Action:** label changed to **Payments**.

### J. Payment wording was inconsistent with the actual business model
Several old auction components claimed all auction payments went directly to the organizer and that KAYAD never received auction-related payments, while the actual bid flow contains a nominal KES 1 M-Pesa bid-confirmation transaction.

**Action:** wording now distinguishes:
- bid-confirmation payment,
- bid security / commitment,
- final vehicle settlement,
- direct settlement,
- escrow settlement.

### K. Commitment information was too vague
The live room previously offered “Pay bidder commitment” without clearly showing amount or recipient.

**Action:** the registration state now displays the configured commitment amount, recipient and refundability according to the published configuration.

### L. Bidder phone field was misleading
The browser previously asked the bidder to enter an M-Pesa number, but the backend actually uses the verified profile phone.

**Action:** the room now states that bid confirmation uses the verified profile number.

---

# 3. Discovery / business model audit

## Canonical customer tabs

### Live now
Backed by real `/api/auctions?status=live` data.

### Starting soon
Previously broken because the public auction list only returned `live` and `ended` states.

**Fixed:** scheduled discovery now derives from published auction setup schedules and real vehicle records.

### Completed
Uses real ended auctions and final bid values.

### Saved for you
Uses real favorites and intersects them with canonical auction inventory rather than creating a separate saved-auction data source.

---

# 4. Scheduled auction lifecycle

This was one of the largest backend gaps.

The product allowed dealers to publish `startsAt` / `endsAt`, showed “Starting soon”, and then relied on a manual start path. There was no authoritative automatic transition from the published schedule to `live`.

### Fixed
Publishing now mirrors the immutable published schedule onto the canonical car lifecycle row.

The auction timer now:

1. Finds published scheduled auctions whose start time has arrived.
2. Confirms the setup is still published.
3. Checks dealer listing lock state.
4. Starts the auction through the existing canonical lifecycle service.
5. Uses the published end timestamp exactly.
6. Does not create a second scheduler or second auction engine.

A dedicated atomic scheduled-start function prevents a 24-hour auction from being skipped merely because the worker wakes a few seconds late.

---

# 5. Registration / bidder eligibility

The backend correctly enforces:

- registration before start,
- no new registration once live,
- phone verification,
- optional email verification,
- optional identity verification,
- optional organization verification,
- account-not-banned checks,
- seller cannot register for own auction,
- terms version match,
- explicit terms acceptance,
- optional commitment requirement,
- commitment completion before active bidder state.

### Frontend hardening
Registration now requires an explicit checkbox for the configured terms version instead of silently sending `acceptTerms: true`.

### Remaining gap
The browser currently shows the **terms version**, but the actual full terms document/content is not surfaced in the canonical live room.

**P1:** publish a canonical terms document/content endpoint keyed by `termsVersion` and make the bidder acceptance snapshot reference that exact document/version.

---

# 6. Bid engine audit

## Frontend

The live room now uses the canonical auction transport instead of falling back to the generic car endpoint.

Bid history uses a public sanitized auction endpoint.

## Backend

The bid flow still enforces:

- authenticated bidder,
- auction registration,
- eligibility,
- verified phone,
- seller self-bid prevention,
- auction live state,
- authoritative end timestamp,
- minimum configured increment,
- high-value risk control,
- M-Pesa confirmation before market movement,
- atomic DB mutation.

### Major rule-convergence fix
The dealer-configured `bidIncrement` was being displayed in the UI but the DB atomic function still used hard-coded tier increments.

That created a frontend/backend economic contract mismatch.

**Fixed:** published auction setup `bidIncrement` is now the authoritative value for the atomic bid, payment confirmation and auto-bid paths, with the legacy tier rule retained only as a fallback for old/unconfigured auctions.

---

# 7. Anti-sniping audit

Previously there were multiple rule authorities:

- auction setup values,
- hard-coded PostgreSQL values,
- environment-based `snipeGuard` values,
- auto-bid values.

This could produce different auction behavior depending on the entry point.

### Fixed
The active atomic bid/confirmation/auto-bid/extension path now reads:

- `antiSnipe`
- `antiSnipeWindowSeconds`
- `antiSnipeExtensionSeconds`
- `maxExtensions`

from the published auction setup.

The dealer manual extension guard also uses the published `maxExtensions` rather than a hard-coded three.

---

# 8. Realtime auction room

## Major gap found
The socket provider previously disconnected for signed-out users, even though public auction rooms are spectator-readable.

Therefore an unauthenticated visitor could see a live room but not receive its realtime stream.

### Fixed
Public auction realtime now works for spectators while private socket actions remain server-authorized.

The client also now handles:

- `auctionResync`
- `auctionPhase`
- `auctionEnded`
- `auctionExtended`
- `auctionTimer`
- `auctionUpdate`
- `bidUpdate`

### Major event gap fixed
Confirmed manual bids were moving the database market but were not consistently emitting the canonical public `bidUpdate` event.

**Fixed:** confirmed bids now emit sanitized bid activity and anti-snipe extension events.

The live room therefore updates:

- current bid,
- bid count,
- activity pulse,
- bid history,
- extension countdown.

without requiring a full page reload.

---

# 9. Public API privacy audit

A particularly important issue was found in the original public auction response.

It returned bid records containing bidder-related information and exposed the highest bidder identity field.

### Fixed
Public auction responses now:

- return only confirmed market-moving bids,
- expose a pseudonymous `bidderTag`,
- omit bidder email/phone,
- omit the highest bidder user ID,
- omit the exact reserve price.

A separate protected outcome endpoint is now used for winner-specific post-auction information.

---

# 10. Reserve-price business model

The existing engine supports:

- no reserve,
- soft reserve,
- hard reserve.

Hard-reserve enforcement remains atomic and is already covered by the existing Phase 8/10 certification.

### Public boundary hardening
Exact reserve price is no longer returned by the public auction response.

This prevents a hidden/hard reserve from accidentally becoming public API data when the UI does not require it.

---

# 11. Settlement model audit

KAYAD's intended model is preserved:

### Direct settlement
Winner pays the configured vehicle amount directly through the published direct settlement flow.

### Escrow settlement
Escrow is created only when the auction's published settlement mode explicitly selects escrow.

The winner CTA now uses the authoritative outcome:

- direct → actual winner payment initiation,
- escrow → existing escrow case/funding flow.

It no longer simply navigates to generic payment history.

---

# 12. Auction fulfilment

The backend has the intended chain:

**close → outcome → payment → collection → transfer → completion**

with re-award/default/dispute controls.

Existing Phase 9/10 certification remains green.

### Presentation gap remaining
Dealer operations currently exposes raw winner user IDs in one operational card instead of a clean bidder/participant identity presentation.

**P2:** replace raw UUID presentation with the canonical bidder reference/name allowed by the operational authorization boundary.

---

# 13. Commitment / bid security audit

This is a high-priority area still requiring further end-to-end work.

The setup supports:

- fixed or percentage commitment,
- organizer or platform recipient,
- configurable recipient account,
- refundable/non-refundable flag.

The registration state and payment initiation exist.

### Critical remaining gap
The codebase has registration states for `refunded` and `forfeited`, but there is not yet a complete canonical commitment refund/forfeit orchestration covering every configured recipient mode.

This matters because the UI can configure a commitment as refundable.

**P0/P1 before production auctions use refundable commitments:**

- define who legally holds the commitment,
- define who performs the refund,
- record the external refund reference,
- make refund/forfeit idempotent,
- reconcile the financial event,
- notify the bidder,
- prevent double refund.

The audit deliberately does **not** pretend this is already complete.

---

# 14. High-value bidding rule

There is an additional platform risk rule in the bid controller:

> Bids above KES 5,000,000 require a KES 50,000 pre-authorized escrow deposit.

This is a legitimate-looking risk control, but it is not currently represented as an explicit dealer auction setup field.

Because the product's business model also says escrow is optional for final settlement, this needs to be clearly distinguished as a **platform risk requirement for high-value bidding**, not a change to the auction's settlement mode.

The live room now discloses this when the selected bid exceeds KES 5M.

**P1:** move the KES 5M / KES 50K risk thresholds into the canonical platform auction policy and surface them in the dealer readiness/publish preview.

---

# 15. Nominal KES 1 bid-confirmation payment

The actual bid flow initiates a **KES 1 M-Pesa confirmation payment** for each bid. The bid amount itself is not collected at bid placement.

This was not adequately represented in the earlier UI/business copy.

### Fixed
The live room now explicitly tells the bidder about the nominal KES 1 confirmation payment.

### Remaining business-policy requirement
The KES 1 fee is still effectively a hard-coded platform behavior rather than a fully versioned auction-platform policy field.

Before production launch, decide and document:

- recipient,
- whether it is refundable,
- whether it is a platform technology fee,
- receipt treatment,
- accounting/ledger treatment,
- whether the amount can change by platform policy.

---

# 16. Payment race / compensation risk

A deeper backend risk remains in bid placement:

1. M-Pesa payment intent is initiated.
2. The pending bid is then created atomically.
3. If bid creation fails after the external payment intent exists, the payment and bid can temporarily diverge.

The callback/retry architecture is strong, but the ideal invariant is:

**payment intent ↔ pending bid ↔ confirmed bid**

with no state where a user can successfully pay the KES 1 confirmation amount and permanently lose the bid association.

**P0/P1:** introduce an explicit bid-payment intent ID / reservation record or compensation/reconciliation path so an external STK success can never strand a payment without a recoverable bid intent.

---

# 17. Auto-bidding / duplicate engine audit

The active automatic bidding path now converges through the atomic PostgreSQL function.

However, the repository still contains older/dead compatibility code including:

- `backend/services/autoBid.service.js`
- `backend/utils/snipeGuard.js`
- older `AuctionDiscoveryNetwork`
- unused legacy inline bidding surface
- old email wording containing a hard-coded 5% commitment statement

These are not currently the canonical customer auction engine, but they represent future drift risk.

**P2:** retire or explicitly quarantine these legacy surfaces after production certification so there is one obvious auction engine and one obvious source of truth.

---

# 18. Admin auction control audit

Admin controls correctly converge on the canonical lifecycle service and RBAC permission boundary.

### Fixed
The admin start modal previously asked for arbitrary auction hours even though the backend ignored those hours and used the published auction contract.

The modal now shows the published schedule and makes clear that the admin cannot silently override the published economics/timing contract.

The winner message also no longer falsely claims that escrow was initiated; it now states that settlement follows the published auction mode.

Pending/unconfirmed bids are no longer presented as selectable winners in the admin UI.

---

# 19. Dealer auction studio audit

The dealer wizard already covers the intended business model:

- starting bid,
- bid increment,
- reserve mode,
- schedule,
- registration deadline,
- anti-snipe,
- bidder requirements,
- commitment,
- payment deadline,
- fulfilment,
- default/re-award,
- cancellation/suspension,
- terms version,
- direct/escrow settlement,
- public preview.

Publication freezes the protected contract.

This is one of the strongest parts of the auction domain after the convergence work.

---

# 20. Final state of this phase

## PASS
- Canonical auction discovery
- Scheduled discovery
- Scheduled auto-start architecture
- Canonical live room transport
- Public sanitized bid feed
- Realtime spectator stream
- Realtime confirmed-bid updates
- Realtime extension updates
- Explicit registration terms acceptance
- Configured bid increment authority
- Configured anti-snipe authority
- Public bidder PII boundary
- Reserve-price privacy boundary
- Direct/escrow settlement convergence
- Winner payment CTA
- Admin start contract integrity
- Dealer setup contract
- Dealer fulfilment chain
- Existing Phase 4–10 auction certifications

## NEEDS HARDENING BEFORE FINAL PRODUCTION CERTIFICATION
1. Commitment refund/forfeit end-to-end financial lifecycle
2. Canonical terms document/content delivery and acceptance snapshot
3. KES 1 bid-confirmation fee as versioned platform policy
4. KES 5M / KES 50K high-value risk policy as centralized configuration
5. Bid payment-intent/payment-to-bid compensation/reconciliation invariant
6. Live provider certification with real M-Pesa callbacks
7. Real staging database migration + RLS matrix
8. Browser/Playwright certification across desktop/mobile widths
9. Legacy auction engine retirement
10. Dealer operations winner identity presentation

---

# Certification limitation

The current audit environment does not have KAYAD's installed frontend dependencies or Playwright runtime, and it is running Node 22.16.0 rather than the project's established Node 22.22.2 certification runtime.

Therefore:

- source-level syntax checks: performed,
- auction static/domain validators: performed,
- browser rendering certification: pending,
- production build: pending on Node 22.22.2,
- real Supabase migration/RLS: pending,
- real M-Pesa provider certification: pending.

No PASS in this report should be interpreted as a substitute for those final live-runtime gates.

---

# 26. Design-reference parity audit — actual auction page vs intended premium presentation

The supplied KAYAD auction experience reference presents a substantially richer room than the current production implementation. The reference includes:

- cinematic vehicle gallery with 24 images,
- explicit 360° view,
- vehicle-story content,
- live bid activity feed,
- watcher count,
- Bid History / Chat / Details tabs,
- proxy/max-bid controls,
- quick bid increments,
- bidder registration with a bidder pass,
- dedicated payment-method screen,
- winning celebration with payment action,
- fulfilment tracking,
- auction history,
- personalized recommendations,
- tactile/haptic interaction language.

The current canonical `/auction/:id` implementation genuinely provides:

- real vehicle image carousel,
- live current bid and bid count,
- real confirmed bid activity,
- countdown,
- bidder registration and terms acceptance,
- bidder commitment initiation,
- real bid placement + M-Pesa confirmation,
- anti-snipe extension updates,
- winner/outcome handling,
- direct/escrow settlement handoff,
- mobile bid action bar.

The following reference features are **not currently backed by equivalent canonical data/services on the live room** and therefore must not be added as decorative fake controls:

1. 360° vehicle viewer
2. vehicle video player
3. in-room chat tab
4. watcher-count metric
5. proxy/max-bid configuration UI
6. bidder-pass visual/document flow
7. dedicated auction payment-method selector
8. on-page fulfilment tracker driven by `auction_outcomes`
9. on-page auction history driven by authenticated auction history
10. recommendation rail backed by live auction data

This is now classified as **presentation parity debt**, not a reason to invent UI. Each item should be connected only when its backend contract exists and is certified.

The design reference itself is retained as the visual target; the implementation must remain truthful to the live business engine.

# 27. Additional hardening applied after the initial 28/28 audit

### Bid mutation boundary
A new migration, `20261007170000_auction_bid_mutation_boundary.sql`, revokes direct INSERT/UPDATE/DELETE on `public.bids` from `anon` and `authenticated`. Bid mutations remain server-authoritative through the protected backend and atomic service-role functions.

### Live-room resilience
The live room now reconciles with the canonical auction read model every 30 seconds while connected and every 10 seconds while disconnected/reconnecting. This prevents an event-loss or websocket outage from leaving the displayed market permanently stale.

### Bid-state wording
The post-click state now says **BID REQUEST SENT** rather than implying that the bid is already market-active. The user is explicitly told that M-Pesa confirmation is required.

### Winner amount authority
Winner celebration uses the authenticated `auction_outcomes.winning_amount` first rather than reconstructing the amount from public bid activity.

### Admin settlement wording
Admin controls no longer claim that winner declaration automatically starts escrow. Settlement follows the published auction settlement mode.

### Admin confirmed-bid filter
The admin winner selector now excludes pending/unconfirmed bids from its selectable bid history.

### Scheduled admin presentation
A scheduled auction is shown as **Scheduled** with its published start time instead of offering an immediate "Start Auction" action before the scheduled start.

# 28. Payment-rail business-model correction

A deeper contract mismatch was found between the dealer auction wizard and the actual winner-payment implementation:

- The wizard exposed **M-Pesa** and **Bank / custody transfer** as choices for settlement.
- The direct winner-payment endpoint currently executes M-Pesa STK only.
- The escrow custody implementation currently uses bank-transfer funding.

Therefore the UI was offering a bank-direct path that the actual winner-payment service did not implement.

### Corrected

- **Direct settlement → M-Pesa only**.
- **Escrow settlement → bank/custody transfer only**.
- Backend publication validation now rejects unsupported combinations.
- Changing settlement mode in the dealer wizard automatically switches the payment rail to the currently supported rail.

This prevents a dealer from publishing an auction contract that the buyer cannot actually execute.
