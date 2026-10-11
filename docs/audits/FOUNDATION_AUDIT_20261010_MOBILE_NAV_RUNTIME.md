# KAYAD Foundation Audit — Mobile Navigation, Messaging, Runtime

Date: 2026-10-10
Foundation: `KAYAD-MOBILE-MENU-VIEWPORT-FIX-20261010.zip`
Scope: controlled audit only. No unrelated UI, backend, payment, auction, or schema changes.

## Confirmed source contracts

- Mobile navigation is one shared drawer, opened by the header and the mobile dock event `kayad:open-mobile-menu`.
- Drawer is a labelled modal dialog, includes focus handling, Escape close, dynamic header offset, resize/orientation synchronization, and body scroll lock.
- The drawer uses the canonical `navItems` configuration and existing `handleNavSelect` path; it does not create a second routing system.
- Signed-in users receive a Messages action targeting the existing `chat` navigation surface. Logged-out users see the sign-in card; protected destinations remain guarded.
- Chat UI uses the single mounted `UnifiedCommunicationHub` and canonical `chatApi` transport.
- Notification/chat routing helper remains covered by the dedicated routing validator.

## Static validation results

| Gate | Result |
|---|---|
| Chat / notification / navbar routing | PASS |
| Chat surface convergence | PASS |
| Navigation convergence | PASS — 43/43 |
| Communications initiative | PASS |
| Socket contract | PASS |
| Runtime integrity | PASS — 7/7 |
| Startup convergence | PASS |
| Runtime hotspots | PASS — 8/8 |
| Session availability | PASS — 7/7 |
| Deployment readiness | PASS |
| Frontend runtime contracts | PASS |
| Supabase migration filename/version preflight | PASS — 166 unique versions |
| Vercel CI contract | PASS |

## Environment blocker

`node scripts/validate-v14-runtime-preflight.mjs` reports 9/10 checks passing. The only failure is the local runtime: Node `22.16.0`, while `package.json` requires `>=22.22.2`. Do not lower the engine contract to make this environment pass. Full `npm ci`, TypeScript, Vitest, Vite build, real-browser/mobile checks, and live authenticated chat verification remain unconfirmed in this environment.

## Outstanding risk requiring runtime evidence

The reported Messages-to-login behavior cannot be certified or safely fixed by changing the nav link alone. The current guard intentionally protects chat. On the laptop, inspect `/api/v1/auth/me` after sign-in and the click sequence, including status/cookies and any auth-expired event. If the session endpoint returns 200, inspect the route state and `onNavClick`; if 401, diagnose cookie/session configuration; if 5xx, diagnose backend availability. Do not weaken auth guards or expose chat to anonymous users.

## Next controlled steps

1. Use Node `>=22.22.2` and perform clean dependency install, typecheck, focused Vitest tests, and production build.
2. Test drawer at 320, 360, 375, 390, 412, and 430 CSS px, including browser chrome/visual viewport changes, rotation, reduced motion, keyboard focus, and background scroll lock.
3. Test authenticated and unauthenticated Messages navigation against the live API; record HTTP status and final route.
4. Only patch the specific failing contract; do not modify unrelated surfaces.

No production deployment, Git push, database migration, or live mutation was performed during this audit.
