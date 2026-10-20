# KAYAD Stage 5F.10 — Defect register

Severity: Critical / High / Medium / Low. "Evidence" names the check that fails without the fix. IDs D-1…D-17 and OD-1…OD-7 belong to Stage 5F.5 and are retained unchanged in `reports/stage5f5-claude-admin-governance/KAYAD_STAGE5F5_DEFECT_REGISTER.md`.

## Fixed in Stage 5F.10

| ID | Sev | Defect (found in) | Fix | Evidence |
|---|---|---|---|---|
| D-18 | High | 5F.9 eligibility evaluator imported `findById/findOne` from `db/index.js`; two bid suites that mock that module crashed (`placeBidErrorContract`, `placeBidRejectedListing`). Baseline `test:jest` exit 1. | Evaluator rewritten (no `db/index.js`); the two suites (and four auction-controller suites) stub the eligibility module, assertions unchanged. | jest 0 failures; baseline log |
| D-19 | Critical | 5F.9 treated a vehicle with **no proposal row as eligible** and had no seller classification: any private seller could skip the whole programme. | Fail-closed classification in the database gate (only dealer/broker owners are exempt; staff-/user-/NULL-owned are gated). | PG A*, C* |
| D-20 | Critical | 5F.9 gate lived only in Node, read-then-decide, not atomic with bids/starts: a bid could land between a custody hold/suspension and the check; manual bid, auto-bid, scheduled start and paid-bid settlement were not gated in PostgreSQL. | Gate evaluated inside `kayad_place_bid_atomic`, `kayad_auto_bid_atomic`, `kayad_start_auction_atomic`, `kayad_start_scheduled_auction_atomic`, `kayad_settle_bid_payment_atomic` after the car row lock; `FOR SHARE` on proposal and capability; backstop triggers on `cars` and `auction_setups`. | PG B*, I* (two-session concurrency); mutation check: 11 failures when locks+trigger removed |
| D-21 | High | 5F.8 tables had no foreign keys, no CHECKs, no idempotency, no one-open-proposal rule, writable by service-role code paths directly, mutable audit rows, no RLS. | FKs, CHECKs, `uq_psap_one_open_per_car`, idempotency unique index, write-guard triggers, append-only triggers, RLS (read-only for seller/assigned partner). | PG G* |
| D-22 | Medium | 5F.9 validator compared source strings only and passed while the control was ineffective. | Added behavioural evidence (PG 227, HTTP 46, UI 23) and a wiring validator that checks ordering (e.g. gate after lock, pre-check before payment). | validators |
| D-23 | High | Found by the new tests: a consumed (already inspected) booking could be re-linked after reinspection, bypassing the second inspection. | `inspection_assigned` refuses a booking that has a report or was previously linked (`BOOKING_ALREADY_USED`). | PG F23 |
| D-24 | High | Found while hardening: the write-guard trusted the `kayad.psap_fn` session marker from any session, so a `service_role` caller could forge it and write state directly. | Marker honoured only if `current_user` is not anon/authenticated/service_role/authenticator; only the SECURITY DEFINER owner path works. | PG G15–G18 |
| D-25 | High (pre-existing) | Public auction detail returned **500** for every published auction: the populated dealer object was passed as the seller id (`car.dealer?._id` is undefined with this adapter). The same wrong field made `getCar`'s "is owner" check always false. | Read `dealer.id ?? dealer._id ?? dealer` in `auctionController.getAuction` and `carController.getCar`. | HTTP H36; was failing before the fix |
| D-26 | Medium | Buyer bid form turned every refusal into "Failed to record bid", including a verification/custody block. | `bidApi` keeps the backend `code`; `MarketplaceContext.getLastBidRefusal`; `VehicleDetailPage` states that bidding is paused and that no bid or payment was taken (or that eligibility could not be confirmed). | vitest |
| D-27 | Medium | Ineligible live private-seller auctions stayed visible/biddable in list, detail, room, marketplace listing, sitemap, lead creation, and bidder/dealer "ending soon" reminders. | All gated by the DB gate (fail-closed, 503 when unverifiable). | HTTP H35–H41 |
| D-28 | Medium | Paid KES-1 bid confirmation would have moved the market for an auction that had become ineligible while the STK push was in flight. | Settlement always records the payment, applies it to the market only when eligible (`applied_to_market=false` otherwise). | PG H* |
| D-29 | Low (a11y) | Active nav item in the seller platform failed WCAG AA contrast (#5AAFA4 on #0C4E54 = 3.6:1). | Text colour `#A7F0E6`. | UI U3.3 |

## Limitations (not defects fixed — stated so nobody assumes otherwise)

| ID | Limitation |
|---|---|
| L-1 | **No hosted verification.** The migration and all behaviour were proven only on disposable local PostgreSQL / stack. Hosted Supabase is behind the code and was not touched (OD-7/OD-16). |
| L-2 | The seller UI registers evidence as document *references*; it does not upload files. The inspection fee is paid through the existing inspection/payment flow; the section links a **paid** booking id and never initiates or confirms payment itself. |
| L-3 | The two reminder jobs (`auctionReminderCron`, `reminderAutomationService`) are gated by the same DB gate in source and checked by the wiring validator; they have no behavioural test (they run on timers). |
| L-4 | Public list endpoints filter after paging, so a page can be shorter than `limit` and `pagination.total` may include hidden rows. |
| L-5 | The admin tab takes partner and premises IDs as text (there is no capability-list endpoint). |
| L-6 | The scheduled-start worker retries a blocked auction on every sweep and logs a warning each time (no crash, no loop). |
| L-7 | Pre-existing: older RLS policies reference roles `super_admin`/`staff` that do not exist in `users.role`. Not changed. |
| L-8 | Browser coverage is headless Chromium only; no real-device, screen-reader or Safari/Firefox run. |
| L-9 | No real M-Pesa/SMS/email provider was contacted (by rule); payment is proven through the database's own `kayad_process_inspection_payment_atomic`, not a live callback. |
| L-10 | Secondary vehicle-list endpoints that return cars (recommendations, similar vehicles, favourites, saved-search results, dealer storefront) were not individually gated. A blocked live auction can still appear there as a listing; any attempt to bid is refused in the database (409) and the detail/room/list endpoints above hide it. |

## Owner decisions — open

Carried forward from 5F.5 (unchanged, **still open**): OD-1 non-owner superadmin powers · OD-2 default admin permission set · OD-3 owner mode (legacy vs database) · OD-4 command-centre role list clean-up · OD-5 any-staff read endpoints · OD-6 maker-checker for refunds/payouts · OD-7 hosted DB behind the code (63 migrations; now 65 with 5F.8 and 5F.10).

New in 5F.10 (the system implements the safest behaviour and records the choice):

| ID | Decision needed | Current behaviour |
|---|---|---|
| OD-8 | What does "passed" mean (score thresholds, mandatory checks)? | The assigned inspection provider declares passed/failed/inconclusive; KAYAD admin approval is separate. No thresholds invented. |
| OD-9 | How long does a passed inspection stay valid? | Optional `valid_until` set by the provider; none is imposed. An admin can expire it. |
| OD-10 | Fees after a failed inspection, an overturned appeal or a refused custody: refund, waive, or charge again? | Not decided. Reinspection needs a new paid booking. No refund rule was invented. |
| OD-11 | Conditions for releasing a vehicle after a sale. | Auction must not be live, an admin reason is required, and the partner records the recipient. No settlement coupling. |
| OD-12 | What should happen to an auction that is already live when a requirement stops being true (suspension, hold, expiry)? | Bids blocked in the database and the auction hidden; **not** auto-cancelled or refunded. |
| OD-13 | Who is a "private seller"? Staff-, user- and unknown-owned stock, and brokers. | Dealer and broker owners exempt; everyone else gated (fail-closed). No exception policy exists. |
| OD-14 | Should anyone besides approved garages and dealers be allowed to hold vehicles? | No. Inspection-only partners and escrow capability do not confer custody. |
| OD-15 | Should approval need a second, different admin (maker-checker)? | Not required; only self-review is forbidden. |
| OD-16 | Hosted migration window for 20261020160000 and 20261020170000 (with the rollback). | Not applied anywhere. |
