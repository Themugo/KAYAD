# KAYAD — Mobile Navigation & Runtime Certification (2026-11-14)

Base: `KAYAD-DESIGN-DIRECTION-IMPLEMENTATION-320-430-2026-11-14.zip`. Node 22.x, `npm ci` from the existing lockfile (no force, lockfile untouched). Nothing committed, pushed, deployed or migrated.

## 1. Initial findings (real defects in the supplied ZIP, found only after dependencies were installed)
1. `src/pages/AuctionLivePage.jsx` declared `handleRefreshEligibility` twice, so the **production build failed**. Duplicate removed.
2. `src/features/UnifiedCommunicationHub.tsx` called `joinMessages(threadId, fn)` with the wrong signature, so **`tsc` failed**. Now passes `{ onMessage }`.
3. Shell navigation (`setActiveNav`) used `history.replaceState` for every menu/dock tap, so **browser Back could not return between shell destinations**, and the Back/Forward/recent-pages bar was inert. User-initiated navigation now pushes one entry through the router. URL normalisation and access redirects still replace.
4. The legacy account dropdown JSX (hidden but still shipped, with state, refs and handlers) was still in `Navbar.tsx`.
5. `src/components/layout/MobileBottomNav.tsx` was an unused second bottom dock (no importer). Removed. The canonical dock is `src/components/MobileBottomNav.tsx`.
6. A first visit to Home showed a disabled Back/Forward bar and a lone "Home" tab (about 60px) above the hero. It is now hidden until there is history.
7. 8 test files were stale against the ZIP's own source and failed (SocketContext rejoin, ChatPage, Sweep1105b, AdminSettingsOnboarding, DealerAccountStatus, AuctionLivePage, NavbarStaffMenu x12). Corrected to the current behaviour.

## 2. Files changed
`src/App.tsx`, `src/components/Navbar.tsx`, `src/components/navigation/PageJourneyNavigation.tsx`, `src/pages/AuctionLivePage.jsx`, `src/features/UnifiedCommunicationHub.tsx`, removed `src/components/layout/MobileBottomNav.tsx`; tests: `NavbarStaffMenu.test.jsx`, `SocketContext.rejoin.test.tsx`, `ChatPage.test.jsx`, `Sweep1105b.test.tsx`, `AdminSettingsOnboarding.test.jsx`, `DealerAccountStatus.test.tsx`, `AuctionLivePage.test.jsx`; validators updated to the unified design: `validate-unified-mobile-menu`, `validate-mobile-navigation-polish-20261012`, `validate-navigation-convergence`, `validate-admin-route-convergence`, `validate-business-ownership-and-mobile-nav`; new `scripts/browser-certify-mobile-nav.mjs`.

## 3. Unified navigation
- One full menu: the hamburger drawer (`role=dialog`). The avatar (`#user-profile-menu-button`) is a plain account destination (`onNavClick('profile')`), with no `aria-expanded`/`aria-controls`.
- The drawer header shows name, email and a role label (Super Admin / Verified Dealer / NTSA Mechanic / Personal account), plus Log out.
- Role links come from the existing role helpers: buyer/seller (My Account or Buyer Dashboard, Selling Workspace, Account Settings, Messages, Notifications, Payment History), dealer (Dashboard, Inventory, Leads, Analytics, Settings, Messages, Notifications, no buyer/seller shortcuts), staff (Messages, Notifications, Admin Console, Account Settings), mechanic (Dashboard, Inspection Portal, ...).
- Menu visibility is not authorization. Backend permissions and route guards were not touched. Browser check: signed-out and buyer visits to `/admin` do not render the admin console.
- Regression tests make the retired panel unable to reappear (`NavbarStaffMenu.test.jsx`).

## 4. Browser verification (real built app, Chromium, `vite preview`)
The `/api/**` network boundary is answered by the harness, because no backend/database is reachable here. App code is not mocked. The fixture inventory is 12 test vehicles using `public/hero` images, so these screenshots do **not** show live KAYAD inventory.

| Viewport | scrollWidth / innerWidth | Page height | Header h | Dock h |
|---|---|---|---|---|
| 320px | 320 / 320 | 8352 | 63 | 76 |
| 360px | 360 / 360 | 7809 | 63 | 76 |
| 390px | 390 / 390 | 7831 | 65 | 76 |
| 414px | 414 / 414 | 7984 | 63 | 76 |
| 430px | 430 / 430 | 8106 | 63 | 76 |
| 768px | 768 / 768 | 5975 | 83 | 76 |
| 1024px | 1024 / 1024 | 5271 | 85 | - |
| 1440px | 1440 / 1440 | 3347 | 85 | - |

Per-check results (`docs/audits/screenshots/browser-results.json`):

| Result | Check |
|---|---|
| PASS | 320px home: no horizontal overflow |
| PASS | 320px home: no off-screen elements |
| PASS | 320px home: no uncaught page errors |
| PASS | 320px dock: last interactive element clears the fixed dock |
| PASS | 360px home: no horizontal overflow |
| PASS | 360px home: no off-screen elements |
| PASS | 360px home: no uncaught page errors |
| PASS | 360px dock: last interactive element clears the fixed dock |
| PASS | 390px home: no horizontal overflow |
| PASS | 390px home: no off-screen elements |
| PASS | 390px home: no uncaught page errors |
| PASS | 390px dock: last interactive element clears the fixed dock |
| PASS | 414px home: no horizontal overflow |
| PASS | 414px home: no off-screen elements |
| PASS | 414px home: no uncaught page errors |
| PASS | 414px dock: last interactive element clears the fixed dock |
| PASS | 430px home: no horizontal overflow |
| PASS | 430px home: no off-screen elements |
| PASS | 430px home: no uncaught page errors |
| PASS | 430px dock: last interactive element clears the fixed dock |
| PASS | 768px home: no horizontal overflow |
| PASS | 768px home: no off-screen elements |
| PASS | 768px home: no uncaught page errors |
| PASS | 768px dock: last interactive element clears the fixed dock |
| PASS | 1024px home: no horizontal overflow |
| PASS | 1024px home: no off-screen elements |
| PASS | 1024px home: no uncaught page errors |
| PASS | 1024px no fixed mobile dock at desktop width |
| PASS | 1440px home: no horizontal overflow |
| PASS | 1440px home: no off-screen elements |
| PASS | 1440px home: no uncaught page errors |
| PASS | 1440px no fixed mobile dock at desktop width |
| PASS | 320px search: keyword field accepts typed text |
| PASS | 320px filters: Make, Price, Year and Body style controls are available |
| PASS | 320px filters open: no horizontal overflow |
| PASS | 320px empty inventory: no horizontal overflow |
| PASS | 320px timeout: Retry button visible above the dock |
| PASS | 320px retry: triggers a real inventory request and recovers |
| PASS | 390px search: keyword field accepts typed text |
| PASS | 390px filters: Make, Price, Year and Body style controls are available |
| PASS | 390px filters open: no horizontal overflow |
| PASS | 390px empty inventory: no horizontal overflow |
| PASS | 390px timeout: Retry button visible above the dock |
| PASS | 390px retry: triggers a real inventory request and recovers |
| PASS | 390px public: exactly one navigation dialog and no account dropdown |
| PASS | 390px public: drawer offers Sign In / Sign Up |
| PASS | 390px public drawer: no horizontal overflow |
| PASS | 390px public: Escape closes the drawer |
| PASS | 390px buyer: exactly one navigation dialog and no account dropdown |
| PASS | 390px buyer: drawer shows identity + Sign out |
| PASS | 390px buyer: role links present (Messages, Notifications) |
| PASS | 390px buyer drawer: no horizontal overflow |
| PASS | 390px buyer: Escape closes the drawer |
| PASS | 390px seller: exactly one navigation dialog and no account dropdown |
| PASS | 390px seller: drawer shows identity + Sign out |
| PASS | 390px seller: role links present (Messages, Notifications) |
| PASS | 390px seller drawer: no horizontal overflow |
| PASS | 390px seller: Escape closes the drawer |
| PASS | 390px dealer: exactly one navigation dialog and no account dropdown |
| PASS | 390px dealer: drawer shows identity + Sign out |
| PASS | 390px dealer: role links present (Inventory, Leads, Analytics) |
| PASS | 390px dealer: no buyer/private-seller shortcuts |
| PASS | 390px dealer drawer: no horizontal overflow |
| PASS | 390px dealer: Escape closes the drawer |
| PASS | 390px admin: exactly one navigation dialog and no account dropdown |
| PASS | 390px admin: drawer shows identity + Sign out |
| PASS | 390px admin: role links present (Admin Console) |
| PASS | 390px admin: no buyer/seller shortcuts |
| PASS | 390px admin drawer: no horizontal overflow |
| PASS | 390px admin: Escape closes the drawer |
| PASS | 320px public: exactly one navigation dialog and no account dropdown |
| PASS | 320px public: drawer offers Sign In / Sign Up |
| PASS | 320px public drawer: no horizontal overflow |
| PASS | 320px public: Escape closes the drawer |
| PASS | 320px admin: exactly one navigation dialog and no account dropdown |
| PASS | 320px admin: drawer shows identity + Sign out |
| PASS | 320px admin: role links present (Admin Console) |
| PASS | 390px admin: no buyer/seller shortcuts |
| PASS | 320px admin drawer: no horizontal overflow |
| PASS | 320px admin: Escape closes the drawer |
| PASS | 1440px: account avatar present |
| PASS | 1440px: avatar navigates to a profile/account destination (no dropdown) |
| PASS | Back returns to the previous page |
| PASS | Forward returns to the profile page |
| PASS | Refresh keeps the profile page |
| PASS | Direct URL entry loads the page (no redirect loop) |
| PASS | signed-out /admin: not rendered (redirected or gated) |
| PASS | buyer /admin: admin console not shown |

Covered: home at 320/360/390/414/430/768/1024/1440; search typing; filter drawer; empty inventory; timeout then Retry (real new request, then recovery); drawer for public/buyer/seller/dealer/admin; Escape; profile destination; Back, Forward, Refresh, direct URL; dock clearance of the last interactive element. Screenshots: `docs/audits/screenshots/mobile/`, `docs/audits/screenshots/tablet-desktop/`.

## 5. Inventory timeout
Frontend path inspected: `vehicleApi.getCars` runs a 20s first attempt and a 45s retry for transient errors only (network/408/502/503/504), de-dupes in-flight requests, and the Retry button re-issues the real query with filters preserved (verified in browser). The **server-side cause of slow responses (API/Supabase query time) is not established**: no database or server logs were available. It remains outstanding.

## 6. Build and tests
| Test | Command | Result |
|---|---|---|
| Source validation: TypeScript | `npx tsc --noEmit` | pass |
| Build | `npx vite build` | pass |
| Unit/integration (frontend) | `npx vitest run` | 194 files, 1610 passed, 1 skipped |
| Browser | `node scripts/browser-certify-mobile-nav.mjs` | 88/88 |
| Source validators | `npm run validate:*` (180) | 165 pass; the 5 navigation validators were updated and pass |
| Backend (Jest chunks, Vitest, node:test) | see section 9 | all chunks exit 0 after test fixes; no live database |

15 validators fail identically on the untouched supplied ZIP (not caused by this work): phase39, release, phase8-operations (missing docs), communications:providers and live-runtime (credentials), local-runtime and phase13f (backend deps), stage5f7 (missing contract file), premium-presentation-pass, brand-palette-convergence (33 issues), auction-phase10, premium-sell-auth-public-convergence, stage24-theme-convergence, admin-logo-identity, super-admin-phase1-navigation (stale string check).

## 7. Accessibility
Drawer is a labelled modal dialog with focus trap and Escape (verified in browser for each role); the avatar has an accessible name; the dock and header controls are real buttons/links. A full keyboard/contrast audit was **not** performed.

## 8. Remaining blockers / not done
- ESLint was not run (no lint script was exercised).
- Tablet/desktop pages beyond Home, and every standalone page's Back/Forward fallbacks, were not individually browser-tested. Only the shell, profile and journey bar were.
- Android safe-area behaviour was not tested on a real device.
- Live inventory performance, live Supabase and provider UAT are outstanding.
- The ZIP's admin policy UI only offers auto-publish; a hold-for-review choice is not exposed there. Not changed.

## 9. Follow-up pass (same day)
**Backend** (dependencies installed with `npm ci`): the full backend suite was run in chunks (a single `npm test` is killed for memory in this 8 GB sandbox). It found 8 stale or misplaced tests in the supplied ZIP; all are fixed and every chunk now exits 0 (Jest chunks, backend Vitest, node:test).
- Four tests still expected platform staff to edit another business's listing, auction terms or photos. They now assert the business boundary (403, nothing saved): `softDeletedListingReadOnly`, `stage1ListingWriteBoundaries` (x2), `carAuctionLockAndUpdate`.
- `featureFreezeEnforcement`: the new `POST /:id/registration/refresh-eligibility` route is classified as exempt (moves no money, places no bid).
- `registrationEligibilityRefresh`: the db mock was missing `findAll`.
- `reawardAtomicity`: a Vitest-API file sitting in the Jest tree with a wrong migration path. Path fixed, moved to the backend Vitest include list and the Jest ignore list.
- `stage5aSellerSelfPublication`: the test supplied the dealer's progressive-access context in the wrong place. Fixed to match the controller.
- `companyNameUniquenessMigration`: no longer asserts "newest migration".
No production backend code was changed.

**Frontend**: `npx eslint` on the changed files reports 0 errors (81 pre-existing hook warnings, none introduced by this work). The repo's `lint` script is `tsc --noEmit`. The phone inventory card image is shorter (16/11 on phones, 4/3 from `sm`) to reduce card height. Vitest 194 files, 1610 passed, 1 skipped.

**Page audit** (`scripts/browser-audit-pages.mjs`, results in `docs/audits/screenshots/page-audit-results.json`): all 23 shell destinations (`?nav=`) x 5 roles (signed-out, buyer, seller, dealer, superadmin) x 320px and 390px = 230 page loads. Each was checked for rendering, horizontal overflow, uncaught page errors and the last control clearing the fixed dock: 0 issues. Signed-out visits to protected pages redirect rather than render.

**History**: dock taps add exactly one entry each. Back x2 and Forward x2 retrace them (e.g. `/` > `?nav=discovery` > `/login?next=...`). The certification script now has 91 checks, all passing.

**Fixture note**: the harness's CSRF stub had to return `{ csrfToken }` at the top level. Before that fix, signed-out pages showed "We couldn't verify your session". That was a harness artefact: the app fails safe to a retry screen, and no app code was changed for it.

**Still outstanding**: live Supabase/provider tests; the server-side cause of slow inventory responses; real-device Android safe-area check; keyboard/contrast audit; individual deep pages beyond the shell destinations (vehicle detail, auction detail, listing edit) for fallback-return behaviour; 15 pre-existing repo validators that fail on the untouched ZIP (listed in section 6).
