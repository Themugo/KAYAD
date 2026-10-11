# KAYAD Foundation Audit — Visual Viewport Hardening

Date: 2026-10-10
Foundation: `KAYAD-NEXT-AUDIT-MOBILE-MESSAGING-20261010.zip`
Scope: mobile drawer viewport fit and regression gates for navigation, messaging, auth/session contracts, and runtime/deployment boundaries. No production changes, pushes, migrations, or unrelated visual edits.

## Confirmed targeted fix

The mobile drawer previously anchored its top to the sticky header and used `bottom: 0`, but did not explicitly size itself to the *visual* viewport. On mobile browsers, the visual viewport can change as browser chrome expands/collapses without a matching layout viewport change. The drawer now computes an explicit height from `window.visualViewport` (with `window.innerHeight` fallback) and resynchronizes on window resize, orientation change, visual viewport resize, and visual viewport scroll. Existing safe-area padding, internal scrolling, body scroll lock, focus trapping, Escape handling, and canonical navigation remain intact.

The focused mobile viewport validator was extended to assert the new visual-viewport behavior. It reports 10/10 distinct checks passing.

## Regression checks executed

| Gate | Result |
|---|---|
| Mobile menu viewport validator | PASS — 10/10 |
| Chat/notification routing contracts | PASS |
| Chat surface convergence | PASS |
| Navigation convergence | PASS — 43/43 |
| Runtime integrity | PASS — 7/7 |
| Session availability source contracts | PASS — 7/7 |
| Vercel CI contract | PASS |
| Registration/onboarding source gate | PASS — 47/47 |
| Refresh-token reuse integrity | PASS — 6/6 |
| High-risk boundaries | PASS |
| Payment gateway lifecycle | PASS — 13/13 |
| Payment/escrow domain gate | PASS — 9/9 |
| Financial ledger reconciliation | PASS — 13/13 |
| Private upload cache/access | PASS |
| Foundation integrity | PASS |
| Frontend runtime contracts | PASS |
| Deployment readiness | PASS |
| Supabase migration filename/version preflight | PASS in prior foundation report; no migrations changed here |

## Blockers and unverified areas

- Runtime preflight remains 9/10 because the available Node runtime is `22.16.0`; the project requires `>=22.22.2`. The engine contract was not weakened.
- `validate-backend-boot.mjs` could not execute because dependencies are not installed in this extracted archive (`ERR_MODULE_NOT_FOUND`). This is an environment/install blocker, not evidence that the backend boot passes.
- Full clean `npm ci`, TypeScript check, Vitest suite, Vite production build, browser/device test, and live authenticated messaging journey remain unverified.
- Messages routing/auth issue remains open pending a live session result. Do not remove the auth guard or redirect logged-out users directly into private conversations.

## Next controlled steps

1. On a laptop with Node `>=22.22.2`, install dependencies and run typecheck, focused tests, and production build.
2. Test the drawer on Android Chrome at 320, 360, 375, 390, 412, and 430 CSS px with browser chrome expanded/collapsed, rotation, keyboard/focus, and background-scroll checks.
3. Test signed-in Messages against `/api/v1/auth/me` and the canonical chat API, then patch only the evidenced failing layer.
4. Keep this ZIP as the next foundation; do not push or deploy until explicitly requested.
