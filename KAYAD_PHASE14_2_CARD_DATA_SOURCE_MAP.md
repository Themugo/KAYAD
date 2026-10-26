# KAYAD Phase 14.2 — Card-to-Data-Source Map

Classes: KPI, Queue, Nav, Record, Info, Empty, Unavailable.

| Page | Card | Class | Source / calculation | Missing-data behaviour | Click behaviour |
|---|---|---|---|---|---|
| Overview | Total Listings | KPI + Nav | `overview.totalListings` = all of the dealer's cars (dealer-platform dashboard) | `—` | Button → Inventory |
| Overview | Total Views | KPI | sum of `views` on the dealer's cars | `—` | none (plain card) |
| Overview | Total Leads (was "Active Leads") | KPI + Nav | `overview.leads.total` = every lead, all stages including sold/lost | `—` | Button → Leads |
| Overview | Revenue (released escrow, all time) (was "This Month") | KPI | sum of `sellerAmount` over escrows with status `released` for this seller; read-only display of a protected domain | `—` | none |
| Overview | Lead Pipeline stages | KPI | `overview.leads.{new,contacted,negotiating,reserved}` | `—` | "View All" → Leads |
| Overview | Conversion / Avg response rate | Unavailable | backend does not supply `performance` | `—` always today | none |
| Overview | Recent Activity | Empty | backend does not supply activity | "No recent activity is available." | none |
| Overview | Top Performing Vehicles | Record / Empty | `topPerformers.vehicles` (top 3 by views) | explicit empty text; missing price/views shown as unavailable | "View Inventory" |
| Overview | Quick Actions | Nav | Manage Inventory, View Leads, Inspections (the "Add Listing" action was removed, DEF-01) | n/a | buttons |
| Overview | AI Copilot | Info | not enabled; states so | n/a | none |
| Inventory | Stat tiles + vehicle cards | KPI / Record | `GET /api/cars/my-listings` counts by status | status shown as unavailable if absent | none |
| Leads / Pipeline | Lead rows / stage columns | Record | `GET /dealer-platform/leads?limit=100`; stage advance `PUT /leads/:id` | empty text; retry on error | Advance-stage buttons (backend authoritative) |
| Customers | Customer rows | Record | `GET /dealer-platform/customers`; spend shown as full KES, or "Spend unavailable" (previously `NaN M`/crash when absent) | empty text | none |
| Finance / Auctions / Inspections | rows | Record | respective dealer-platform endpoints | empty text; retry | Auctions links to the existing auction routes |
| Analytics | KPI grid, top vehicles | KPI | `GET /dealer-platform/analytics` | unavailable markers, not zero | none |
| Reputation | rating + reviews | Record | `GET /dealer-platform/reputation` | review count unavailable if absent | none |
| Marketing | campaign rows | Record | `GET /dealer-platform/marketing`; budget shown or "Budget unavailable" | empty text | create-campaign form |
| Team | member rows | Record | `GET /dealer-platform/team` | empty text | none |
| Settings | placeholder | Info | no dealer-scoped contract exists | states the gap | none |
| Sidebar | Account status | Info | placeholder; states that plan/verification appear when supplied | n/a | none |
