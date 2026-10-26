# KAYAD Phase 13I — Accessibility and Browser Evidence

Real Chromium (Playwright) against the production build served over the real backend. axe-core (WCAG 2.0 A/AA tags) was run on each state below; screenshots are in `evidence/phase13i-screenshots/` (24 files, desktop 1280px and phone 390px).

| page / state | axe result |
|---|---|
| buyer-dashboard-none | critical=0 serious=0 |
| dashboard-pending-phone | critical=0 serious=0 |
| admin-review-pending | critical=0 serious=0 |
| dashboard-approved-phone | critical=0 serious=0 |
| seller-studio-approved | critical=0 serious=0 |
| dashboard-suspended-phone | critical=0 serious=0 |
| dashboard-revoked-phone | critical=0 serious=0 |
| dashboard-reinstated-phone | critical=0 serious=0 |
| dashboard-rejected-phone | critical=0 serious=0 |
| legacy-approved | critical=0 serious=0 |
| dashboard-legacy-rejected-phone | critical=0 serious=0 |
| dashboard-legacy-suspended-phone | critical=0 serious=0 |
| dashboard-legacy-approved-phone | critical=0 serious=0 |
| dealer-hub | critical=0 serious=0 |
| admin-console | critical=0 serious=0 |
| buyer-dashboard-phone | critical=0 serious=0 |

**Totals: 16 pages/states checked, 0 critical, 0 serious violations** (`validation-logs/phase13i/cert/cert-ui-journeys.log`). The harness also asserts for every seller state at 390px: the real state is shown, buyer dashboard intact, **no horizontal overflow**, no uncaught page errors, no 5xx API responses.

## States exercised in the browser
buyer-only (none), pending, approved, rejected (with reapply), suspended, revoked, reinstated, legacy approved, legacy rejected (no form), legacy suspended, legacy pending; admin review page (desktop and phone); Seller Studio; public vehicle visible/hidden; keyword search with hostile inputs; dealer hub; admin console alerts.

## Limits (honest)
Automated axe covers only a subset of WCAG; no manual screen-reader, keyboard-only or colour-contrast audit beyond axe's contrast rule was performed. Moderate/minor axe findings are not summarised here beyond the serious/critical gate (the harness records serious/critical only). Browser evidence is local — not staging or a production device matrix.
