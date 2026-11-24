# 19 — Handover and next actions

1. **Review** `16` (verdict CONDITIONALLY READY) and `17` (changed files; four pre-existing deletions need a deliberate decision).
2. **Owner decisions needed:** (a) RESOLVED (OD-2/OD-3: Admin requests, any Super Admin decides); (b) RESOLVED (OD-1: `view_system_health`); (c) dispositions in `11`; (d) public wording R-12-1; (e) whether to authorise migrations (13/14) after a restore rehearsal.
3. **Accessibility follow-ups** (CSS-only): contrast on `/admin/staff`, `/admin/staff-permissions`, `/admin/communications`; target size on `/admin/vxp`; add an `<h1>` to `/admin/settings`; then manual screen-reader testing.
4. **Do not** run the migration runbook without explicit authorisation. Nothing was applied, pushed, committed or deployed in this session.
5. Re-run locally: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`, backend Jest in batches (single full run is OOM-killed in a small container), `ci/db-journeys/run.sh`, `node scripts/admin-closure-route-certification.mjs`.
