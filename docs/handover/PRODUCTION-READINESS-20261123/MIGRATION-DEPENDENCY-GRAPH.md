# Migration dependency graph — offers, settlements, auctions, lifecycle (2026-11-23)
Method: SQL read from `supabase/migrations/` and compared with the hosted-schema replica (existence of every referenced table/column). Hosted migration history stops at `20260922060457`; the repo has 211 migrations.

## Objects missing on hosted (Confirmed)
`purchase_outcomes`, `auction_setups`, `auction_platform_policies`, `auction_outcomes`, `marketplace_offers`, `marketplace_offer_events`, `marketplace_offer_settlements`, `dealer_listing_lifecycle_events`, `dealer_listing_counters`, `personal_listing_lifecycle_events`, `purchase_outcome_events`; columns `cars.listing_number`, `cars.sold_at`, `cars.creation_idempotency_key`, `cars.creation_request_hash`. Present: `leads`, `payments`, `escrows`, `cars`, `bids`, `users`, `dealers` (`escrows.car`, `payments.car_id/metadata/type` exist).
Also referenced by live code but **defined in no migration at all** (Confirmed by search of all 211 files): table `error_budgets`, RPC `kayad_owner_snapshot`, table `marketplace_healths`.

## Creators
| Object | Created by |
|---|---|
| `auction_setups` | `20261002190000_auction_setup_publication_contract` |
| `auction_outcomes`, `auction_platform_policies` | `20261002220000_auction_settlement_platform_policy` (financial) |
| `purchase_outcomes` | `20261002240000_marketplace_purchase_fulfilment_convergence` (financial/fulfilment) |
| `personal_listing_lifecycle_events` | `20261116120000_personal_listing_lifecycle_atomic` |
| offers tables + RPCs | `20261110120000`, replay fix `20261121090000` |
| settlements | `20261121110000_offer_settlement_binding` |
| lifecycle + listing numbers | `20261121160000_dealer_listing_lifecycle_and_numbers` |
| listing idempotency | `20261122120000_listing_creation_idempotency` |

## Graph (A → B means "B needs A")
```
users, leads, cars (hosted)  ─► 20261110120000 offers ─► 20261121090000 replay fix
payments, escrows (hosted) ─┐
purchase_outcomes (20261002240000, MISSING) ─► 20261121110000 settlements ─► [triggers on payments, purchase_outcomes]
auction_setups (20261002190000, MISSING) ─► 20261002220000 auction outcomes/policies ─► place/auto/extend/settle bid functions
marketplace_offer_settlements + purchase_outcomes ─► 20261121160000 dealer lifecycle RPC (runtime reference)
personal_listing_lifecycle_events (20261116120000, MISSING) ─► 20261121140000 personal lifecycle lock
cars ─► 20261122120000 listing idempotency (cars columns + RPC)           [independent of the above]
20260922… hosted ─► 20261002180000 FAILS on hosted shape (escrow_audits drift) after 16 financial migrations applied
```
## Findings
- **F-offers (Reproduced locally):** `20261110120000` + `20261121090000` apply cleanly to a hosted-shaped DB; they reference only `leads`, `cars`, `users`; they create two tables and RPCs; no trigger on an existing table. Candidate for an isolated group. Journey `legacy-j4_offers`/`05_offer_payment` run on the full chain, not the reduced one (reduced-group journey: NOT TESTED).
- **F-settlement (Confirmed):** `20261121110000` fails on hosted shape (`relation public.purchase_outcomes does not exist`, atomic rollback) and adds two triggers on `payments` and one on `purchase_outcomes` — financial.
- **F-lifecycle (Reproduced locally):** `20261121160000` applies structurally without its dependencies, but `kayad_dealer_listing_lifecycle_atomic` then fails at runtime: `relation "public.purchase_outcomes" does not exist` (it also reads `marketplace_offer_settlements`). Applying it alone would break dealer hide/publish/mark-sold. It also adds 3 triggers on `cars` and a backfill `UPDATE` of every dealer car.
- **F-auction (Confirmed):** the repo auction functions need `auction_setups`/`auction_platform_policies`; hosted bodies are the older, pre-setup versions.
- **Reduced non-financial release is only partly useful:** offers core makes the "offers" figure available; settlements, auction outcomes and team activity stay unavailable, so the dashboard banner remains. No migration was written to hide the banner.

## Dashboard behaviour (F3) — Confirmed by source and journey 18
`dealerCommandCentre.service.js` wraps each source in `optional()`; only missing-relation errors (42P01, PGRST205, "could not find the table", "does not exist") move a source into `unavailable`; any other error is rethrown (HTTP 500). The panel hides unavailable figures rather than showing zeros and renders a distinct banner (`data-testid="command-centre-partial"`). One caveat: the "does not exist" message match also catches a missing **column**, so a column drift would be reported as an unavailable source rather than a failure — a conscious trade-off, recorded not changed. Journey 18 result: see `TEST-RESULTS.md`.
