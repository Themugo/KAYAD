# KAYAD Mobile Drawer Authentication-State Audit — 14 November 2026

## Finding
The desktop/header account area already used `authLoading && sessionHinted` to avoid briefly showing a Sign In / Sign Up action to a returning member while the authoritative session request was still in flight. The mobile drawer did not use the same guard: when `user` was temporarily null, it immediately rendered the signed-out welcome card and sign-in button.

This was an inconsistent account-state presentation and could mislead returning users during reload/session restoration. The local-storage hint remains non-authoritative; it never grants access.

## Fix
- Reuse the existing `authLoading` prop and `sessionHinted` value in the mobile drawer.
- Show a neutral, accessible account-checking placeholder while the returning session is being verified.
- Render the signed-in or signed-out state only after the existing authoritative loading flow resolves.
- Do not add API calls, session rules, storage keys, routes or authentication shortcuts.
- Add a regression test and `validate:drawer-auth-loading-state` source validator.

## Other fixes retained
- Quick Access uniqueness and consolidation.
- Modal drawer background scroll lock with exact previous-style restoration.
- Existing menu, permissions, route configuration and bottom dock.

## Validation
Passed:
- `node scripts/validate-drawer-auth-loading-state.mjs`
- `node scripts/validate-mobile-drawer-scroll-lock.mjs`
- `node scripts/validate-mobile-menu-quick-access.mjs`
- `node scripts/validate-unified-mobile-menu.mjs`
- `node scripts/validate-navigation-convergence.mjs` — 43/43
- `node scripts/validate-mobile-navigation-polish-20261012.mjs` — 38/38
- `node scripts/validate-business-ownership-and-mobile-nav.mjs`

Vitest, TypeScript and production build remain pending: this extracted archive has no `node_modules`; package engine is Node >=22.22.2.

## Safety
No changes to backend authentication, authorization, identity records, database, routes, or external services. No commit, push, merge or deployment.
