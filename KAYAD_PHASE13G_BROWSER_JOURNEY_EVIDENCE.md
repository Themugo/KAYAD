# KAYAD Phase 13G — Browser Journey Evidence

Real Chromium (Playwright) → real SPA production build → real Express backend → PostgREST → disposable PostgreSQL carrying all migrations. Nothing mocked. Labelled non-UI fixtures: user creation (SQL), listing creation through the real HTTP API, and the moderation step that publishes a pending listing (SQL). Result: **74/74 PASS**, `validation-logs/phase13g/ui-journeys-final.log`. Screenshots: `evidence/phase13g-browser-screenshots/` (13 files).

| area | checks | notes |
|---|---|---|
| buyer login, dashboard, seller application (same account) | B1–B5 | server-confirmed pending state |
| unauthorised admin attempts | access-denied checks | buyer/dealer refused |
| admin review/approve (real admin UI) | approval | **Approve button now passes contrast (#047857)** |
| listing visibility | L1–L4 | creation via API, public detail + marketplace visible |
| **keyword search (new)** | KS1–KS4 + clean | unique token found; no-match hides it; `50%_off`, `a",id.is.null,"b`, `x*,y)(z`, `\\` neither crash nor widen results; recovers |
| suspension | S1–S7 | listing hidden, direct URL hidden, stale seller write refused 401/403 |
| reinstatement / revocation / rejection + re-application | R*/X* | listing restored; rejection reason shown |
| **admin alerts (new)** | AL1–AL3 + clean | alerts endpoint 200 from the console, seeded alert returned, non-admin denied; sidebar shows "1 unread alert" |
| dealer hub + isolation | D* | dealer workflows unchanged |
| session/logout/deep links | N* | |
| 390px mobile | M1–M2 | buyer dashboard and admin review: no horizontal overflow |

Accessibility (axe wcag2a/2aa): critical 0, serious 0 on buyer-dashboard-none, admin-review-pending, seller-studio-approved, dealer-hub, admin-console, buyer-dashboard-phone. Scope: those pages only — not a whole-site audit.

Known defect (not changed, cosmetic): the System Alerts card shows "Alert message unavailable". The reconciliation writer stores the text in `data.description`, while `AdminAlertsPanel.tsx` / `OperationsControlRoom.jsx` read top-level `message|title|description`, so real alerts will likely show the same fallback text. The alert count, badge and list work; only the label is missing. Recommended follow-up: map `data.description` in the API response or the panel.
