# KAYAD Super Admin — Remaining Blockers

1. Install/use Node.js `22.22.2` or later as required by `.node-version`, `.nvmrc`, and `package.json`.
2. Run `npm ci` from the root using the existing lockfile; do not update dependencies or regenerate the lockfile.
3. Re-run `npm run typecheck`, `npm run build`, and `npm test -- --run`, preserving full logs and exit codes.
4. Locate and run the actual Stage 5F.2 validator from the repository's source/package scripts; do not infer its filename from a report.
5. Run authenticated browser route/action tests using an authorized non-production test session.
6. Verify real KPI, approval queue, vehicle, auction, team/RBAC, health, department and provider payloads and error/empty/restricted states.
7. Capture actual screenshots at 1440×900, 1920×1080, a documented tablet viewport, and a narrow mobile viewport.
8. Complete keyboard/accessibility checks and measured visual comparison against the approved design.

Release status: **NOT YET CERTIFIED — REMAINING ITEMS DOCUMENTED**.
