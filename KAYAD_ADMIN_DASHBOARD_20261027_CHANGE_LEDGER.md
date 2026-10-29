# Change ledger — Super Admin dashboard polish, navigation convergence & account control

Foundation: `KAYAD-MAINTENANCE-SCOPES-20261027-FINAL-VERIFIED.zip` (SHA-256 `1142a60d12c449753536c9ffb620ea58ff3a0263496be3be0b901f3cda73c28d`, verified against its sidecar, `unzip -t` OK, manifest checked). Pristine checkpoint kept; original ZIP untouched. No backend, migration, env, hosted-data, commit, push or deploy change was made.

| File | Change | Reason (confirmed defect) |
|---|---|---|
| `src/components/admin/AdminAccountMenu.tsx` (new) | Header account menu: trigger with `aria-haspopup`/`aria-expanded`/`aria-controls`; Escape and outside-click close; ArrowUp/Down/Home/End/Tab; items My profile (`/profile`), Account & platform settings (`/admin/settings`, only if the permission mirror allows), Owner management (`/admin/owners`, only when the session is an owner), Sign out | Header showed name/role/avatar as static markup: no menu, no logout |
| `src/components/admin/AdminLayout.tsx` | Mounts the menu in place of the static identity block (the `Signed in as …` group label is kept); scroll restoration per history entry (Back/Forward restore, new navigation starts at top) | No account control; returning to a page did not restore scroll |
| `src/context/AuthContext.tsx` | New `signOut()` returning `{ok,message}`: clears client state only when the backend confirms revocation (or answers 401 = already gone); clears admin view state. Existing `logout()` unchanged | `logout()` swallows backend failures and clears local state, so the UI can claim "signed out" while the server session is still valid |
| `src/utils/adminViewState.ts` (new) | Session-storage key + clearer for dashboard view state | Shared by AdminView and sign-out so view state does not outlive a session |
| `src/features/AdminView.tsx` | (1) Failure causes classified from the real response (maintenance 503, server 5xx, network, timeout, 404, 401) with a concise "Cause:" sentence and a **Retry** button; (2) per-source "unavailable" in each panel instead of one global flag; (3) dashboard module/search/queue restored for the browser session (try/catch storage); (4) KPI value class: unavailable/loading/link labels use one smaller non-overflowing style | All five sources showed one generic message with no cause or retry; panels could look empty when a different source had failed; dashboard state reset when returning; "Unavailable" at 23px overflowed KPI cards at 1440/1280/768 |
| `src/features/admin-command-centre.css` | Appended polish block: hero text shadow/contrast, slightly tighter vertical padding, 11px panel caption, uniform KPI heights, ellipsis for labels, alert sizing | Hero text contrast over skyline; 9px caption; KPI overflow; mobile alert text size |
| `src/components/admin/AdminSidebar.tsx` | Group content container is always rendered and uses `hidden` when collapsed | `aria-controls` pointed at an element that did not exist while a group was collapsed |
| `src/styles/kayad-admin-shell.css` | Account menu styles (existing tokens); active-parent group colour; focus ring on group toggles; `[hidden]` rule | `has-active-route` was set but never styled; toggle focus |
| `src/__tests__/components/admin/AccountMenuBehavior.test.tsx` (new) | 7 tests | Menu behaviour, items, failed/successful sign-out |
| `src/__tests__/context/AuthSignOut.test.tsx` (new) | 3 tests | Server-confirmed sign-out |
| `src/__tests__/features/adminCommandCentre.test.tsx` | +4 tests; `afterEach` also clears `sessionStorage` | Failure causes, retry, per-source unavailable; isolation for the new persisted view state (no existing assertion changed) |
| `runbooks/phase16f-admin-dashboard-20261027/ui/browser_admin_dashboard.cjs` (new) | Real-stack Playwright journey (38 checks) | Browser evidence |
| `KAYAD_ADMIN_DASHBOARD_20261027_*.md`, `evidence-admin-dashboard-20261027/`, `validation-logs-admin-dashboard-20261027/` (new) | Documentation and evidence | Deliverables |

Not changed (deliberately): routes, RBAC/permission mirrors, backend, maintenance policy, dealer approval, payments/escrow/auctions, owner identity rules, hero background, palette, sidebar structure/labels/destinations.
