# 03 — Data and API mapping

Everything is read from existing tenant-scoped endpoints; one was extended additively.

| UI | Source |
|---|---|
| Total Inventory / donut | `command-centre.listings` |
| Inventory trend badge | `period.inventory.added` (listings created in the window) |
| Active Leads | `command-centre.pipeline` (New → Reserved); trend = `period.leads` received vs previous window |
| Sales (n days) / Sales Trend / Recent Sales | `period.sales` — released escrows in the window (definitions: `reports/DEALER-FINANCIAL-DEFINITIONS.md`) |
| Payouts (n days) | `period.payouts` — owner only |
| Needs your attention | `command-centre.attention` (+ pending listings, auctions ending ≤ 24 h) |
| Recent Inventory | `getMyListings` + `command-centre.leadCounts` |
| Hot Leads | `GET /dealer-platform/leads` (only fetched when the role has lead access) |
| Active Auctions | `command-centre.auctions` |
| Business health | `command-centre.health`; **lead response is unavailable** (`first_response_time` is never written); compliance from verification status |
| Sidebar badges | Inventory = total listings, Leads = new enquiries, Auctions = live auctions |

Backend (`backend/services/dealerCommandCentre.service.js`, `backend/controllers/dealerPlatformController.js`): added `summarisePeriod`, `summariseHealth`, `leadCounts`, two attention kinds, `?days=7|30|90` (anything else → 30). No schema change, no migration, no financial/escrow/payout logic changed; `resolveAccess` gates every new block. Definitions: `reports/DEALER-DASHBOARD-DEFINITIONS.md`.
