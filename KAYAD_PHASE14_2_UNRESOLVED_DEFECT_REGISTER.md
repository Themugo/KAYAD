# KAYAD Phase 14.2 — Defect Register

## Fixed in this phase
| ID | Defect | Evidence | Fix |
|---|---|---|---|
| F-01 | Overview KPIs always showed `—`; Leads, Pipeline, Customers and Marketing always reported "Could not load" against the real `{ success, data }` response body (code read `data.data`). | Browser run with backend-shaped mock responses before/after | Reads now use the response body; lead update checks for a returned record. |
| F-02 | Sections had no URL: Refresh, direct links and Back/Forward could not restore them. | Source + browser | `?section=` with history and popstate. |
| F-03 | Notification bell had no action. | Source | Opens `/notifications`. |
| F-04 | Three "Add Listing" controls rendered the same dashboard for dealers. | Source (`App.tsx` role switch) + browser | Removed; honest message (DEF-01 remains). |
| F-05 | "Active Leads" showed all leads; "Revenue (This Month)" showed all-time released escrow. | Backend controller | Labels corrected. |
| F-06 | Nested `<main>` landmark. | Browser | `div`. |
| F-07 | Colour-contrast failures (axe serious): `#94A3B8` text, small emerald text, `#64748B` on tinted fills. | axe | Darker tokens. |
| F-08 | Scrollable leads table not keyboard reachable. | axe | `role=region`, `tabIndex=0`, label. |
| F-09 | Customers/campaign rows could crash or print `NaN` when fields were absent. | Source | Guarded; "unavailable" text. |
| F-10 | Pipeline stage tiles overlapped at medium widths. | Screenshot | 2-column grid. |

## Open
| ID | Severity | Item | Needed |
|---|---|---|---|
| DEF-01 | High (feature gap) | No routed UI creates a dealer listing. Backend `POST /dealer-platform/inventory` exists; legacy `AddCarPage.jsx`/`EditCarPage.jsx` are unrouted and unverified. | Product decision: promote and verify the legacy pages or build the flow; needs a route (not added here). |
| DEF-02 | Medium | Settings has no dealer-scoped backend contract (legacy `DealerSettings.jsx` unrouted). | Decision + backend contract. |
| DEF-03 | Medium | Team section is read-only; invite/update/remove endpoints exist without UI. | Product decision. |
| DEF-04 | Medium | Real-session testing absent: role/permission denial in the browser, logout with a live cookie/CSRF session, notification and profile menus. | Seeded staging stack. |
| DEF-05 | Medium | Existing dealer pages `/dealer/onboarding`, `/dealer/auction-*` not reviewed or browser-tested (auction logic protected). | Separate approved pass. |
| DEF-06 | Low | Lead list is one page of 100; no pagination; no Previous/Next. | Backend/UX decision if dealers exceed 100 leads. |
| DEF-07 | Low | Conversion/response rate and recent activity are not supplied by the backend. | Backend metrics. |
| DEF-08 | Low | Nine legacy dealer pages remain unrouted dead code. | Retire or promote deliberately. |
| DEF-09 | Low | History uses `pushState` outside react-router, so router location lags until the next navigation; behaviour verified in browser only for Back/Forward/Refresh. | Optional router integration. |
