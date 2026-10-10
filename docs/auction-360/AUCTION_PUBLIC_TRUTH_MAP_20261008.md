# AUCTION PUBLIC TRUTH MAP — 2026-10-08

Every public auction datum KAYAD's backend actually returns, traced to its
real source, authority, and lifecycle meaning — so the redesigned public
Auction surface (`src/features/AuctionsView.tsx`) displays only what the
backend truthfully supports. Nothing below is invented; a row is included
only if a real field/endpoint/computation backs it.

Architecture note: there is **no separate `auctions` table**. Everything is
denormalized onto `cars` (confirmed by an explicit comment in
`backend/src/controllers/auctionController.js`). "Auction" is a *view* over
a car row, not a distinct entity.

## Lifecycle vs capability (the distinction this stage protects)

| Concept | Field | Meaning |
|---|---|---|
| Lifecycle (raw) | `cars.auction_status` | `none` / `draft` / `live` / `ended`. No DB CHECK constraint enforcing the enum — authority is the controller, not the schema. |
| Capability | `cars.allow_bid`, `cars.allow_buy` | Independent flags. A car can have `allow_bid=true` while `auction_status` has not reached `'live'`. Capability is **never** lifecycle. |
| Public derived status | `status` field on the auction-list API response, computed by `auctionController.js::toPublicStatus()` | `"draft"` \| `"active"` \| `"ended"` — a **third**, intentionally distinct vocabulary. `"active"` means `auction_status === 'live' AND now < auctionEnd`. |

`AuctionsView.tsx` derives `isLive = auction.status === 'active'` from this
server-computed field only — never from `isAuction`, `allow_bid`, route
name, or object presence. This is the exact pattern Stage 8/10 got wrong
once (treating auction *capability* as *LIVE*); it is preserved unchanged
this stage.

## Field-by-field truth map

| FIELD | SOURCE | AUTHORITY | LIFECYCLE MEANING | CURRENT FRONTEND CONSUMER | CORRECT CUSTOMER SURFACE | SAFE TO DISPLAY? | NOTES |
|---|---|---|---|---|---|---|---|
| Lifecycle state | `status` (derived: draft/active/ended) | Backend-computed, server clock | Defines LIVE/SCHEDULED/ENDED | `AuctionsView.tsx` tab bucketing (`live`/`scheduled`/`ended`) | Auction page (discovery), Live Auction (participation) | YES | Never inferred client-side. |
| Vehicle identity | `make`, `model`, `year`, `location` (via `car`) | `cars` table | N/A | `renderAuctionCard` title/meta | Auction, Vehicle Detail | YES | |
| Primary image | `car.images[0]` / `car.image_url` | `cars`/storage | N/A | Card + spotlight media | Auction, Marketplace, Vehicle Detail | YES | Falls back to "No image supplied" truthfully rather than a stock photo. |
| Title/headline | composed from make/model/year | derived client-side from real fields | N/A | Card title, spotlight title | Auction | YES | No fabricated marketing copy. |
| Start time | `auctionStart` | `cars.auction_start` (denormalized) | Scheduled window | "Starting soon" segment, scheduled countdown | Auction | YES | |
| End time | `endTime` / `auctionEnd` | `cars.auction_end` | Live window close | Spotlight sort key (`msRemaining`), Time-left stat, segment counts | Auction, Live Auction | YES | Spotlight selection uses this field exclusively — the soonest real `endTime` among `live`, never a hand-picked "featured" slot. |
| Current bid | `currentBid` | Backend-computed from **paid/confirmed** bids only | Market state | Card price, spotlight "Current bid" stat | Auction, Live Auction | YES | A bid is inserted `pending` and never counts toward `currentBid` until the M-Pesa callback confirms `paid` — pending bids are never surfaced as real market activity. |
| Bid count | `bidsCount` / `bids_count` | Count of bid rows | Activity signal | Spotlight/card "Bids placed" stat | Auction | YES | This is a **total bid-row count**, not a distinct-bidder count. |
| Distinct bidder count | — | **Does not exist** | — | — | — | **NO** | No such field anywhere in the schema or API. Never fabricate "X bidders"; `bidsCount` is the only real activity number. |
| Registration state | per-user registration record (authenticated only) | `bidder_registrations`-style record | Participation gate | `BidderIdentityCard` (unchanged this stage) | Live Auction, Account | YES (authenticated context only) | Not shown on the public, unauthenticated Auction page — correctly out of scope here. |
| Winner / highest bidder | `winner`, `highestBidder` | Settlement-time field | Post-auction result | **Not consumed** by `AuctionsView.tsx` | Payment/Fulfilment (post-win), never public discovery | **FLAGGED — see gap below** | `GET /api/auctions*` (the endpoint this page actually calls) correctly **omits** these fields. A separate endpoint, `GET /api/cars/:id`, leaks them with no stripping/auth check. The redesigned Auction page never calls `/api/cars/:id`, so this gap does not affect it — documented here as a pre-existing, NOT-this-stage-fixed backend finding per the zero-backend-changes default. |
| Payment state | payment record status (`pending`/`paid`/`failed`) | M-Pesa callback-gated | Post-bid settlement | Not shown pre-win | Payment surface only | N/A to this page | Correctly out of scope for public discovery. |
| Inspection status | `cars.inspection_status` | Defaults to `'pending'`; **confirmed never written beyond default by any backend code path** | — | — | — | **NO** | Not a real signal. Never display "Inspected" on the redesigned page. |
| NTSA / duty / logbook verification | `cars.ntsa_verified`, `cars.duty_status`, `cars.logbook_verified` | **Self-settable by the listing owner** via the generic update endpoint — bypasses the real admin verification queue | — | — | — | **NO (not reliably authoritative)** | Not used as a trust badge. |
| Escrow enabled | `cars.escrow_enabled` | **Server-computed, re-derived live on every read** | Settlement protection | Not currently surfaced on this page | Payment/Fulfilment, optionally Auction if a future stage adds it | YES if ever used | Authoritative — safe to use, not added this stage (no current consumer in `AuctionsView.tsx`). |
| Verified organizer | `is_verified_dealer` / `isVerifiedDealer` / `dealer.verified` | Real dealer-verification flag | Seller trust | `isVerifiedOrganizer()` helper, conditional badge on card/spotlight | Auction | YES | Pre-existing, legitimate — logic only extracted into a shared helper this stage, not changed. |
| "Clean Title" | — | Previously fabricated, **removed in Stage 10** | — | — | — | **NO** | Confirmed not reintroduced this stage. |

## Gap discovered (documented, not fixed — per DEFAULT ZERO BACKEND CHANGES)

`GET /api/cars/:id` returns `winner`/`highestBidder` with no field-stripping
or authorization check, unlike `GET /api/auctions*` which correctly omits
them. The redesigned public Auction page (`AuctionsView.tsx`) never calls
`GET /api/cars/:id` — it only ever calls the auctions-list endpoint — so
this stage's deliverable is unaffected. Flagged for a future stage/backend
review rather than silently patched, per the master prompt's explicit
instruction to stop and document rather than invent a fix during a design
stage.

No other data gaps were found. Every value the redesigned page displays
(headline counts, spotlight stats, card stats, empty-state copy) traces to
a real field above — nothing was invented.
