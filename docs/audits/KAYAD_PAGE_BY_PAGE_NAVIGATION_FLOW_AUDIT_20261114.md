# KAYAD Page-by-Page Navigation Flow Audit — 14 November 2026

## Objective
Provide a consistent way to move backward and forward through the actual page history, return home, and switch between recently visited pages without losing route query parameters or hashes.

## Source review
Reviewed the shared application shell in `src/App.tsx`, the React Router history usage across page and workspace components, the existing `titleForRoute` registry, and the prior dealer/admin navigation work. The project already had isolated back controls in a few pages and a dedicated dealer dashboard previous/next pair, but there was no single navigation strip consistently available across the main application page surfaces.

## Implemented
- Added `src/components/navigation/PageJourneyNavigation.tsx` and mounted it in the shared primary application shell.
- Added a previous-page action using React Router history, with a safe home fallback for direct-entry pages that have no in-app previous entry.
- Added a forward-page action, enabled only when the component has observed a later in-app history index.
- Added a home action.
- Added a horizontally scrollable row of up to six recently visited page tabs. Tabs retain pathname, query string and hash, and the active tab is announced with `aria-selected`.
- Uses the existing route-title registry for recognizable tab labels, with a readable path-segment fallback.
- Controls include accessible names and are keyboard-operable native buttons.
- Added `validate:page-journey-navigation` source-contract validation.

## Validation
- `node scripts/validate-page-journey-navigation.mjs`: PASS, 8/8 checks.
- `node --check scripts/validate-page-journey-navigation.mjs`: PASS.

## Scope and limitations
- The shared navigation is now available on page surfaces rendered through the primary `App.tsx` shell, including its marketplace and authenticated workspace modules.
- It does not replace existing domain-specific tabs (for example auction status tabs, dealer workspace sections, admin navigation groups, or multi-step form progress). Those remain owned by their existing components.
- The source-level validator does not prove browser interaction, mobile rendering, or route-specific history behaviour. Root `node_modules` are not installed in this working environment, so a Vite build, TypeScript check, and browser E2E run were not available in this pass.
- No routes, role permissions, backend APIs, database records, migrations, payment operations, commits, pushes, or deployments were changed.

## Next verification gate
Run `npm ci`, `npm run lint`, `npm run build`, then browser tests across direct URL entry, normal in-app navigation, Back, Forward, tab switching, query-backed pages, and 320–430px mobile widths. Include the standalone admin and dealer route shells in browser coverage to confirm no nested-shell surface bypasses the shared App shell.
