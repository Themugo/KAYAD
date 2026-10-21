# KAYAD Business Command Centre — Phase 01 Report

**Phase:** Navigation, header, sidebar and dropdown convergence  
**Date:** 2026-10-21  
**Status:** Implementation checkpoint created; runtime certification BLOCKED pending supported Node/dependency environment  
**Production changes:** None

## Foundation identity

Input foundation: `KAYAD-STAGE5F16-MERGED-WITH-MAIN-CI-FIXED-FULL-PROJECT-20261020(1).zip`  
Input SHA-256: `face2b11fbc1097487df1b60e6b51573d7104c0038faa8d5d5b7e0e79f133464`

The source was extracted into an isolated workspace. The uploaded source archive was not modified. The extracted archive contains no `.git` directory, so branch/commit and originating repository cleanliness cannot be certified here.

## Canonical route decision implemented

- `/admin` is now the canonical Business Command Centre home and renders the existing `AdminView` inside the existing admin shell.
- `/admin/dashboard` is an alias to that same command-centre component.
- Legacy `/?nav=admin` links redirect to `/admin`, retaining other query parameters and the URL hash.
- Existing sidebar destinations under `/admin/*` are registered to existing specialist page components and rendered inside the canonical admin layout/sidebar.
- Unknown `/admin/*` paths show an explicit in-shell not-found state rather than silently rendering the public marketplace.
- The duplicated `src/components/layout/AdminLayout.tsx` and `AdminSidebar.tsx` implementations are now compatibility re-exports to `src/components/admin/AdminLayout.tsx` and `AdminSidebar.tsx`.
- The account dropdown now has one Operations Dashboard entry for the command centre; the duplicate Admin Panel action was removed. System Management has the distinct `/admin/settings` destination and is shown only to `admin` and `superadmin` roles.
- The global query-backed `nav=admin` entry and mobile Admin Console action use the canonical `/admin` route.

## Changed files

1. `src/App.tsx` — canonical admin route surface and legacy query alias.
2. `src/components/admin/AdminRouteSurface.tsx` — new lazy-loaded registry for existing admin pages, command-centre home, permission wrapper, loading state and unknown-route state.
3. `src/components/admin/AdminLayout.tsx` — canonical shell, responsive drawer toggle, Escape close, focus return and body-overflow cleanup.
4. `src/components/admin/AdminSidebar.tsx` — canonical sidebar uses a semantic backdrop and closes after navigation.
5. `src/components/layout/AdminLayout.tsx` — compatibility re-export to canonical layout.
6. `src/components/layout/AdminSidebar.tsx` — compatibility re-export to canonical sidebar.
7. `src/components/Navbar.tsx` — canonical admin destinations, removal of duplicate Admin Panel action, deterministic initials fallback for missing/broken profile images.
8. `src/styles/kayad-admin-shell.css` — responsive mobile sidebar/backdrop and reduced-motion styles.
9. `src/__tests__/components/NavbarStaffMenu.test.jsx` — tests for canonical account-menu destinations and avatar fallback.
10. `src/__tests__/components/admin/AdminRouteSurface.test.tsx` — route registry and privileged-route assertions.
11. `scripts/validate-admin-route-convergence.mjs` — new source-contract validator.
12. `package.json` — added `validate:admin-route-convergence` script.

No business-domain API, database schema, migration, provider credentials, secret, payment/escrow logic or production environment was changed.

## Route/permission behaviour

- The existing `RequireAdmin` guard protects the command-centre shell.
- Specialist pages use the existing `RequireAdminPage` guard and existing route-role/permission mappings.
- Superadmin-only destinations are guarded at the route surface as well as filtered in the sidebar. Backend route authorization remains authoritative.
- Existing specialist URLs listed by the canonical sidebar are retained and now resolve to their existing page components inside the canonical shell.
- Legacy support/provider/communications aliases reuse existing components; they do not create new APIs or data stores.
- The command-centre quick-view callback navigates through the existing marketplace `vehicleId` URL contract. Its vehicle catalogue is loaded from the existing vehicle API; no mock inventory is introduced.

## Responsive and dropdown behaviour

- The admin shell now has a mobile-only sidebar toggle and fixed drawer/backdrop.
- Escape closes the drawer and returns focus to the toggle; navigation and backdrop clicks close the drawer.
- Body scroll locking is released on close and unmount.
- The existing Navbar already had outside-click and Escape handling for its dropdowns. Account navigation closes the dropdown before navigating.
- Broken/missing account avatar images fall back to deterministic initials, not a generated or fabricated person image.

## Validation results

### PASS — source-contract validations

- `node scripts/validate-admin-route-convergence.mjs` — **14/14 PASS**.
- `node scripts/validate-navigation-convergence.mjs` — **43/43 PASS**.
- `node scripts/validate-owner-identity-convergence.mjs` — **7/7 PASS**.
- `node scripts/validate-master-identity-authz-corrections.mjs` — **14/14 PASS**.
- `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` — **11/11 PASS**.
- `node scripts/validate-stage5f6-buyer-convergence.mjs` — **14/14 PASS**.
- `node scripts/validate-canonical-architecture.mjs` — **PASS**.
- A local source-path check found no missing dynamic-import targets for the new admin route registry.

### BLOCKED — runtime checks

The project requires Node `>=22.22.2`; the available environment provides Node `v22.16.0` and npm `10.9.2`. `npm ci` was attempted with the engine restriction explicitly relaxed for diagnosis, but npm terminated with `Exit handler never called!` after reporting incompatible engines for the project, `jsdom` and `undici`. Dependencies did not install.

- `npm run typecheck` — **BLOCKED/INVALID ENVIRONMENT**: dependencies and React/Node/Vitest type declarations are missing; output contains missing-module errors and cascading type errors.
- `npm test -- --run` — **BLOCKED**: `vitest: not found`.
- `npm run build` — **BLOCKED**: `vite: not found`.
- Real-browser desktop/mobile E2E — **NOT RUN**: browser test dependencies/runtime were unavailable.

These are not passes. The source-contract checks do not prove runtime route rendering or full end-to-end behaviour.

## Remaining risks / required follow-up

1. Re-run `npm ci`, typecheck, Vitest and production build under Node `>=22.22.2` in the project's supported environment.
2. Run real-browser tests for `/admin`, every sidebar destination, unknown routes, query/hash preservation, browser back/forward, dropdown close/focus, broken-avatar fallback and mobile drawer/scroll cleanup.
3. Verify every mapped page's direct API authorization with admin, superadmin, department roles and unauthenticated sessions.
4. Verify the staff governance page's existing `isOwner` requirement aligns with the actual system-owner account identity. This is intentionally not altered in Phase 01.
5. Confirm the intended behaviour of any old links not represented by the canonical sidebar; route aliases should be retained only when a real existing link requires them.

## Phase gate

**Implementation checkpoint: available. Phase 01 certification: BLOCKED.** Do not start Phase 02 from this checkpoint until the supported Node environment is available and runtime tests/build pass. No production deployment was performed.
