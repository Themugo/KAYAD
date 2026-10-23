# Phase 7 Validation Results

| Check | Result | Evidence / limitation |
|---|---|---|
| Archive SHA-256 | PASS | `7b9f647cb6bc4be4f2f872f7b2583a67db5d134b6208dfb34ac499b324b7aa93` |
| Foundation revision marker | PASS | Archive begins with `041eb836f022c6a39511f6879ce3b8670dfccd4e`; this is the archive foundation marker, not the earlier `8a6432e7` publication commit. |
| Canonical admin route source trace | PASS (static) | `src/App.tsx` and `AdminRouteSurface` route references inspected. |
| KPI source ledger | PASS (static) | Cross-checked `/admin/stats` query code and API adapter. |
| Pending dealer server filter | PASS (static) | Existing `/admin/users` route applies `role=dealer` and `status=pending` for `pendingApproval=true`. |
| `git diff --check` | NOT AVAILABLE | Archive contains no `.git` directory; use a Git working copy for patch whitespace validation. |
| Node engine requirement | BLOCKED | Available `v22.16.0`; project declares `>=22.22.2`. |
| Dependencies | BLOCKED | `node_modules` absent. |
| Focused Vitest tests | BLOCKED / NOT RUN | Dependencies absent and runtime mismatch. |
| Typecheck / lint | BLOCKED / NOT RUN | Dependencies absent and runtime mismatch. |
| Production build | BLOCKED / NOT RUN | Dependencies absent and runtime mismatch. |
| Backend tests / API contract tests | BLOCKED / NOT RUN | Dependencies absent; no running test service configured. |
| Playwright / responsive / accessibility browser tests | BLOCKED / NOT RUN | No installed dependencies or authenticated staging session. |
| Live API / role matrix / approval actions | NOT RUN | No production or staging data/actions used. |
| Production deploy / migration / data mutation | NOT RUN by design | Explicitly outside scope. |

Static findings must not be interpreted as a full test pass or release certification.

## Static validator execution results

| Command | Result | Notes |
|---|---|---|
| `node scripts/validate-super-admin-phase1-navigation.mjs` | PASS 12/12 | Existing navigation contract remains intact. |
| `node scripts/validate-super-admin-phase3-foundation.mjs` | PASS 12/12 | Existing KPI/data-state foundation checks pass. |
| `node scripts/validate-phase5-gap-closure.mjs` | FAIL 14/15 | Existing validator fails its production frontend contract check (`production frontend contract exists with verified public values and no server secrets`). This is recorded as a failure; it was not modified or bypassed. |
| `node scripts/validate-phase6-right-panel.mjs` | PASS 15/15 | Existing right-panel contract remains intact. |
| `node scripts/validate-super-admin-phase7-cards.mjs` | PASS 10/10 | New static contract checks for Phase 7 source changes. |

These are source-level checks only. They do not replace Vitest, typecheck, lint, production build, backend integration or browser/authorization testing.
