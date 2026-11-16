# KAYAD Mobile Drawer Follow-up Audit — 14 November 2026

## Scope
Audited the latest follow-up archive, focusing on the existing canonical mobile drawer in `src/components/Navbar.tsx`. The previous Quick Access consolidation was retained.

## Additional gap found
The drawer is marked as a modal dialog and already traps keyboard focus, but opening it only hid the mobile bottom navigation. It did not explicitly lock document/body scrolling. On mobile browsers, background content could therefore continue to scroll behind the drawer, especially during touch gestures or when the viewport is resized.

## Repair
- Lock `document.body` and `document.documentElement` overflow while the existing mobile drawer is open.
- Keep the drawer's own content panel independently scrollable.
- Restore the exact previous inline overflow values on close/unmount, rather than assuming the prior value was empty.
- Preserve the existing CSS class used to hide the mobile bottom navigation.
- Add a regression test covering lock and restoration, including non-default pre-existing inline values.
- Add `validate:mobile-drawer-scroll-lock` source validator.

## Validation
Run in this extracted source tree:
- `node scripts/validate-mobile-drawer-scroll-lock.mjs`
- `node scripts/validate-mobile-menu-quick-access.mjs`
- `node scripts/validate-unified-mobile-menu.mjs`
- `node scripts/validate-navigation-convergence.mjs`
- `node scripts/validate-mobile-navigation-polish-20261012.mjs`
- `node scripts/validate-business-ownership-and-mobile-nav.mjs`

Vitest, TypeScript and Vite build are not run in this extraction because `node_modules` is absent. Package engine declares Node >=22.22.2.

## Not changed
No navigation routes, role permissions, menu order, backend APIs, migrations, database state, bottom dock structure, or branding. No commit, push, merge or deployment.
