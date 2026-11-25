# 04 — Implementation plan (as executed)
1. Backend: extend the command centre additively; unit tests (33/33).
2. `overview/` module: model, charts, tabs, tokens; `DealerOverview`.
3. `DealerDashboard.tsx`: nav regroup, one continuous sidebar, sticky top bar, compact header + period selector, overview data loads; `App.tsx` full-bleed frame; hook-order fix.
4. Tests: update only those pinned to the old structure; add model + component tests; regenerate the generated dark-theme layer.
5. Verify: tsc, eslint, full Vitest, build, backend Jest (command-centre), real-browser run at nine widths with layout, a11y, keyboard and navigation checks.
6. Report + ZIP. No commit, push, deploy or hosted-database access.
