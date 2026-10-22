# KAYAD Super Admin Phase 5 — Remaining Blockers

1. Active runtime is Node `v22.16.0`; repository requires `22.22.2` or later.
2. Root `node_modules` is absent. Run `npm ci` with the existing lockfile on the required runtime.
3. Re-run `npm run typecheck`, `npm run build` and `npm test -- --run` after install.
4. Investigate the palette validator finding in `src/pages/admin/AdminCommunications.jsx`; preserve warning semantics and use existing design tokens.
5. Re-run `scripts/validate-lucide-icon-exports.mjs` after dependencies are installed.
6. Obtain an authorized non-production session and run authenticated route/action tests.
7. Verify live KPI, approval queue, vehicle, auction, team, health, department and provider data semantics.
8. Capture actual screenshots at 1440×900, 1920×1080, tablet and narrow-mobile viewports.
9. Complete keyboard/accessibility, responsive, refresh/error-state and visual comparison tests.

Release decision: **NOT YET CERTIFIED — REMAINING ITEMS DOCUMENTED**.
