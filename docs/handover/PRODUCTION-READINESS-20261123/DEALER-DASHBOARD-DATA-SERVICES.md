# Dealer dashboard "part of the data service is still being set up" banner
Chain: database table → `loadCommandCentre` (`backend/services/dealerCommandCentre.service.js`, each source in `optional()`) → `GET /api/dealer-platform/command-centre` → `CommandCentrePanel.tsx` (`data-testid="command-centre-partial"`).
`optional()` treats a missing relation/column (42P01, PGRST205, "could not find the table", "does not exist") as `data.unavailable`; every other error is rethrown. Unavailable sources are not shown as zero.

| Source | Table read | Hosted (read-only check) | Root cause of banner | Label |
|---|---|---|---|---|
| Offers | `marketplace_offers` | absent | migrations `20261110120000` + `20261121090000` not applied on hosted (depend only on leads/cars/users) | Confirmed |
| Settlements | `marketplace_offer_settlements` | absent | `20261121110000` not applied; also needs `purchase_outcomes` (`20261002240000`, missing) | Confirmed |
| Auction outcomes | `auction_outcomes` | absent | `20261002220000` (and `auction_setups` `20261002190000`) not applied | Confirmed |
| Team activity | `dealer_listing_lifecycle_events` | absent | `20261121160000` not applied; its RPC references `purchase_outcomes` and settlements | Confirmed |

The four causes are separate migrations but share one cause class: the hosted schema stops at migration history 20260922060457. Repo code is correct; no code defect found. Local replica: all four sources load (journey 18 passes: unavailable vs genuine zero distinguished; partial failure does not break the dashboard).

**The warning stays.** It is truthful for hosted and must only disappear after the owner-approved migration rehearsal (PRODUCTION-RECONCILIATION-PLAN.md) validates each table. Edge to note: a missing *column* is also reported as "unavailable" (acceptable, but less precise).
Status: Verified locally; Verified read-only against hosted for table absence; not fixed in production (needs owner approval).
