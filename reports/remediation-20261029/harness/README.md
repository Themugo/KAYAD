# Browser harness (re-runnable)
Real-Chromium checks that stub the API at the browser level (no backend, no staging). They verify layout, rendering and
front-end behaviour only - NOT live authentication, CSRF against a real server, or business data.

Setup (outside the project, nothing is added to its dependencies):
  mkdir br && cd br && npm init -y && npm i @sparticuz/chromium playwright-core
Run:
  (in the project) npm run build && npx vite preview --port 4173 --host 127.0.0.1 &
  node auth-audit.mjs        # 6 auth pages x 8 viewports (320..1440) + login error state; writes screenshots + AUTH_RESPONSIVE_AUDIT.json
  node route-smoke.mjs 390   # all 83 routes at 390 (and again with 1440); writes ROUTE_BROWSER_SMOKE_<w>.json
Edit the hard-coded output paths at the top of each script for your machine. The CSRF stub returns a 64-char token because
the client rejects tokens shorter than 32 characters.
