# Route and browser workflow report

[BROWSER] Real Chromium 153 → built SPA (loopback static server proxying /api, /uploads, /sitemap, /socket.io) → real Express → PostgREST → disposable Postgres. Script: `runbooks/phase13f-20261025/ui/phase13f_ui_journeys.mjs`, 60/60 (`validation-logs/phase13f/final-ui-journeys.log`). Screenshots: `evidence/phase13f-browser-screenshots/`.

Real vs fixture: users are created by SQL; the vehicle is created through the real multipart API; a moderation step that publishes the pending listing is a SQL fixture. Everything else (login, apply, admin decisions, suspension confirm, public pages) is UI.

Journeys: buyer login/dashboard; apply → pending; unauthorized admin attempts; admin approve; buyer+seller in one dashboard; `/sell`, `/sell-car`, `/sell-vehicle`, `/?nav=seller-platform` admit only the approved seller; listing public; admin suspend → hidden everywhere incl. deep link, open page after refresh, marketplace; suspended dashboard honest + workspace gated + stale write refused; reinstatement; revocation + reinstatement; rejection + re-apply; dealer hub + isolation; session restore on reload; unauthenticated `/dashboard`, `/sell`, admin page (no leak, no redirect loop); UI logout; 390px phone dashboard and admin page with no horizontal overflow. No uncaught page errors and no 5xx responses on journey pages, with one documented exception below.

Accessibility (axe wcag2a/2aa, informational): no critical issues on the new surfaces. Serious: colour-contrast on small overline labels (buyer dashboard auction rail), the Approve button and a Seller Studio control; scrollable-region-focusable on the auction steps strip at phone width. Critical `button-name` on one unlabeled icon button in the **pre-existing** Dealer Hub. None fixed in 13F (outside scope / design decisions) — listed as defects.

Excluded from the 5xx check: `/api/admin/alerts` → 500 because table `admin_alerts` is not defined by any repository migration (pre-existing schema gap; backend log shows `relation "public.admin_alerts" does not exist`).
