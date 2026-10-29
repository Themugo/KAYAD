# Phase 16D change ledger (all LOCAL; nothing committed, pushed, deployed or changed on hosted)

Foundation: `KAYAD-ADMIN-DASHBOARD-20261027-POLISH-NAVIGATION.zip` (SHA-256 `e6249a30deebaf561a088350bce08db9e13ad93721abfb12895211cd68e1a9ee`; sidecar OK, `unzip -t` OK, manifest 0 mismatches). That ZIP and the incident ZIP (`KAYAD-INCIDENT-20261027-OWNER-MAINTENANCE-LANE-FIX.zip`) are untouched rollback foundations.

| File | Change | Reason |
|---|---|---|
| `src/context/AuthContext.tsx` | `logout()` is now the server-confirmed sign-out (returns `{ok,message}`; clears the client only if the backend confirms or answers 401); on failure the session is kept and a global `role="alert"` notice (`signout-failure-notice`, dismissible) is shown by `AuthProvider`. `signOut()` stays as the silent variant used by the admin menu | Navbar, Profile and the inspector page used the old `logout()` that cleared local state even when the backend call failed; the toast provider is not mounted in the shell, so no failure was ever shown |
| `src/pages/Profile.tsx` | navigates home only when `logout()` reports `ok` | same |
| `src/pages/inspector/components/InspectorTasksView.jsx` | redirects only when `logout()` reports `ok` | same (component currently has no importer; fixed for consistency) |
| `src/App.tsx` | `void authLogout()` (result handled by the global notice) | Navbar sign-out |
| `src/index.css` | `.owner-tbl` mobile rules: narrower label column, action cells use the full row with no empty label, note text sized | Owner ledger cramped at 390px (action row wrapped under an empty "Actions" label) |
| `src/features/AdminView.tsx` | "Other successful results remain available" only when at least one source succeeded | All five sources failed yet the text claimed others were available |
| tests | `src/__tests__/context/AuthSignOut.test.tsx` +2 (logout failure alert / success) | |
| `runbooks/phase16f-admin-dashboard-20261027/ui/browser_public_signout.cjs` (new) | real-stack public sign-out test (failure alert, revocation, Back, deep link) | |
| `runbooks/phase16f-admin-dashboard-20261027/ui/browser_dashboard_failures.cjs` (new) | real-backend dashboard failure test (database stopped mid-session) | warnings against real responses |
| `KAYAD_PHASE16D_*.md`, `evidence-phase16d-20261027/`, `validation-logs-phase16d-20261027/` | Operation A, Operation B, ledger, Panic Room verification, report, evidence | deliverables |

**Not changed:** the maintenance policy, middleware, control plane, Panic Room code, routes, RBAC, owner/dealer separation, payments, auctions, migrations, env, hosted anything.
