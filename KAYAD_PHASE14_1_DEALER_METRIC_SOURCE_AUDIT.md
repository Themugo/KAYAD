# KAYAD Phase 14.1 — Dealer Metric Source Audit

Date: 2026-10-26

## Method
Inspected the canonical `src/pages/dealer/dashboard/DealerDashboard.tsx` and existing service calls. No database or hosted API was available for this pass. The audit verifies display behavior against the component's observed data contract, not the truth of live backend calculations.

| Display | Existing source | Handling after Phase 14.1 | Limitation |
|---|---|---|---|
| Overview total listings | `dashboard.overview.totalListings` from `getDealerDashboard()` | Missing value remains `—` | Backend aggregation not independently verified |
| Overview total views | `dashboard.overview.totalViews` | Missing remains `—`; known value locale-formatted | Live API not queried |
| Overview leads | `dashboard.overview.leads.*` | Missing stage counts remain `—`; actual numeric zero remains zero | Backend stage semantics not independently verified |
| Overview conversion/response rate | `dashboard.overview.performance.*` | Missing remains `—` | Formula and source freshness not independently verified |
| Overview revenue this month | `dashboard.overview.revenue.total` | Missing remains `—`; known amount formatted as KES | Financial calculation not modified or independently verified |
| Inventory status counts | `getMyListings()` response | Counts derive from returned listing status values | No synthetic inventory added; API behavior not integration-tested |
| Inventory price/views | Listing objects from `getMyListings()` | Missing values say unavailable | Server payload not queried |
| Reputation review count | `getReputation()` response | Missing count is unavailable rather than zero | Live endpoint not queried |
| Analytics revenue/sales/average deal size/views | `getDealerAnalytics()` response | Missing values display `—`; zero only displays when explicitly supplied | No analytics or financial calculation changed |
| Top vehicle price/views/leads | `dashboard.topPerformers.vehicles` | Missing price/engagement values are shown as unavailable | Live payload not queried |

## Decision
No metrics, data sources, database queries, or API contracts were added. This is a presentation-level truthfulness correction. A full certification must verify each live response, aggregation and permission boundary in an approved runtime and database-backed test environment.
