# KAYAD Phase 14.3 — Defect Register

## Fixed in 14.3
| ID | Defect | Fix / evidence |
|---|---|---|
| G-01 | `/dealer/auction-operations` crashed ("Something went wrong") when the list response was not an array. | List accepted only when an array; 4 tests; browser pass. |
| G-02 | `/dealer/onboarding` text contrast 1.4–2.3:1 (7 axe findings) and 38 px horizontal overflow at 390 px. | Text colours darkened (33 values); stepper wraps. Browser: axe 0, overflow 0 at 3 widths. |
| G-03 | Other dealer sections were not checked against the backend body shapes. | Audited: auctions, inspections, finance, analytics, reputation, team match their controllers; 11 contract tests for zero vs unavailable, empty, error + retry. No further defect found. |

## Open (carried from 14.2 plus new)
| ID | Sev | Item |
|---|---|---|
| DEF-01 | High (gap) | No routed UI creates or edits a dealer listing (legacy `AddCarPage`/`EditCarPage` unrouted). |
| DEF-02 | Med | Settings has no dealer-scoped contract; legacy `DealerSettings` unrouted. |
| DEF-03 | Med | Team is read-only in the workspace; invite/update/remove endpoints have no UI. |
| DEF-04 | Med | No live-session verification: logout, role denial in real APIs, write paths (lead stage change, campaign create), notifications unread counts. |
| DEF-05 | Med | Verification/inspection-review, business calendar and team-permission pages named in the prompt do not exist as dealer routes in this source; the dashboard Inspections tab is a read-only list. Not created. |
| DEF-10 | Low | Shared `auction-premium` components have contrast findings (9 nodes) on dealer auction pages; the same components serve public auction pages, so not changed here. |
| DEF-11 | Low | `DealerAuctionOperations` shows a failed list load only as a toast and an empty list (error indistinguishable from empty). |
| DEF-12 | Low | Tablet (768px) browser evidence covers the dashboard landing and the other dealer routes, not each of the 14 dashboard sections. |
| DEF-13 | Low | `eslint .` and backend Vitest/`node:test` runners not run; 1,556 pre-existing lint warnings; 7 pre-existing validator failures. |
| DEF-06..09 | Low | As in the 14.2 register (lead pagination, missing backend metrics, unrouted legacy pages, history outside router). |
