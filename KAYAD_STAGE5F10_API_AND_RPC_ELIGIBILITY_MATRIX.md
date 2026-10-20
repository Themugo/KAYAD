# KAYAD Stage 5F.10 — API and RPC eligibility matrix

Legend: **DB** = gate evaluated inside the PostgreSQL transaction after the car row lock (cannot be raced). **Pre** = application pre-check (fail-closed, defence in depth, avoids taking money first). **Hide** = public projection filtered by the DB gate (fail-closed).

## Every path that can start an auction or change a bid
| Path | Entry point | DB atomic gate | App pre-check | Result when ineligible | Test evidence |
|---|---|:-:|:-:|---|---|
| Setup publication | `publishAuctionSetup` → `auction_setups` update | trigger `trg_auction_setups_private_seller_backstop` | Pre | 409 | PG B*, source |
| Admin / manual start | `startAuction` → `kayad_start_auction_atomic` | DB | Pre | 409 | PG B*, HTTP |
| Scheduled activation | `utils/auctionTimer.js` → `startAuction` → `kayad_start_scheduled_auction_atomic` | DB | Pre | skipped with a warning; no crash, no retry storm | PG B*, source |
| Manual bid | `POST /api/bids/:id/bid` → `kayad_place_bid_atomic` | DB | Pre **before** payment is initiated | 409 `PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE`; no bid row, no payment | PG B6/B9, HTTP H42/H43, jest |
| Auto / proxy bid | `runAutoBidding` → `kayad_auto_bid_atomic` | DB | — | no bid created (`reason = private_seller_not_eligible`) | PG B* |
| Paid bid confirmation (callback) | `paymentCallback.service` → `kayad_settle_bid_payment_atomic` (and `kayad_confirm_bid_payment_atomic`, which delegates) | DB | — | payment recorded, market not moved (`applied_to_market=false`) | PG H1–H7 |
| SMS bidding | `smsBiddingController` | non-mutating (returns before any bid write) | — | n/a | source review |
| Direct row writes | any `UPDATE cars SET auction_status='live' / current_bid / highest_bidder / bids_count` | trigger `trg_cars_private_seller_backstop` | — | exception | PG B*, mutation check |
| Owner change during live/open proposal | `UPDATE cars SET dealer_id` | same trigger | — | exception | PG |

## Public exposure
| Surface | Handler | Treatment |
|---|---|---|
| Live auction list / active list | `auctionController` | Hide |
| Scheduled list | `auctionController.listAuctions(status=scheduled)` | Hide |
| Auction detail & public bid history | `getAuction`, `getPublicAuctionBids` | 404 when ineligible; ended auctions stay visible |
| Live room state | `GET /api/auctions/:id/room` | `biddingOpen=false, blocked=true` |
| Marketplace list & vehicle detail | `carController.getCars`, `getCar` | Hide live auctions that fail the gate (owner/admin still see their own) |
| Sitemap | `sitemapService.generateAuctionSitemap` | Hide live; fail-closed on error |
| New buyer lead on a live auction | `leadService.findOrCreateLeadFromAuction` | refused |
| Ending-soon reminders | `auctionReminderCron`, `reminderAutomationService` | skipped for an ineligible auction; fail-closed (nothing sent when the gate cannot be evaluated). Source-verified only (timer jobs; no behavioural test) |

## Proposal & custody API (`/api/private-seller-auctions`) — capacity is fixed by the mount point, re-verified by the DB
| Method & path | Claimed capacity | Server guard | DB check |
|---|---|---|---|
| `POST /seller/proposals` | seller | `protect`, Idempotency-Key | `kayad_psap_create`: caller must own the car and be a non-dealer private seller |
| `GET /seller/proposals[/:id]` | seller | `protect` | only own rows (404 for others) |
| `POST /seller/proposals/:id/events/:event` (evidence_submitted, proposal_submitted, proposal_withdrawn, inspection_assigned, reinspection_requested, appeal_submitted) | seller | `protect`, whitelist, Idempotency-Key | `NOT_PROPOSAL_SELLER` |
| `GET /provider/proposals`, `POST /provider/proposals/:id/events/:event` (inspection_result, custody_received, custody_refused, custody_incident, vehicle_released) | provider | `protect`, whitelist | assigned inspection provider / custody partner, confirmed staff or owner |
| `POST /provider/capabilities/:id/request` | provider | `protect` | `NOT_PROVIDER_REPRESENTATIVE` |
| `GET /admin/proposals[/:id]`, `POST /admin/proposals/:id/events/:event` (authority_verified, custody_assigned, custody_incident, custody_hold_released, admin_decision, appeal_decision, release_authorized, inspection_expired) | admin | `protect` + `requireRole(admin, superadmin)` + `MANAGE_AUCTIONS` | `NOT_AN_ADMIN`; self-review forbidden |
| `POST /admin/capabilities/:id/{approve,suspend,revoke}` | admin | same | `NOT_AN_ADMIN`; no self-approval |

## RPC grants
All `kayad_psap_*`, `kayad_vcc_apply`, `kayad_private_seller_*`, and the five re-created auction RPCs: `REVOKE ALL FROM PUBLIC`; `EXECUTE` to `service_role` only (`kayad_psap_provider_ids` is also executable by `authenticated` because the RLS policies call it).
