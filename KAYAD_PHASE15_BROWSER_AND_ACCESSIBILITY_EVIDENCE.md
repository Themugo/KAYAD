# Phase 15 - Browser and Accessibility Evidence
Tier: real production bundle (`vite build` + `vite preview`), MOCKED API, Playwright Chromium; not a live backend and not staging. Script: runbooks/phase15-20261026/superadmin_browser_check.cjs. Raw results: evidence/phase15-20261026/browser/results.json (+ 6 screenshots).
Viewports: desktop 1280x900, tablet 768x1024, mobile 390x844. Views: /admin/transactions, /admin/users (ban flow).
Observed at every viewport: "Successful collections" label, no "Total Revenue"; Needs reconciliation, evidence-unavailable and pending-awaiting-provider labels shown; no full phone number; ban sends `{"banned":true}` and the UI shows the state returned by the server; no page-level horizontal scroll (the table scrolls inside its labelled region); axe-core serious/critical violations: none; page errors: none.
Not covered by browser evidence: ControlRoom/PanicRoom banners (covered by unit/typecheck only), other Super Admin screens, real backend rendering.
