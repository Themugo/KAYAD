# KAYAD HARDENING — PHASE 2: AUTHENTICATION AND AUTHORIZATION CONSOLIDATION

Scope per instructions: no features. This document traces every real login/registration/logout/session-restoration/profile-update/protected-page workflow found, fixes the conflicts found, and proves the required scenarios. All claims below are backed by a direct source read, a direct test run, or both - not assumed.

---

## The canonical architecture, confirmed present and now the single path

- Real backend: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/demo-login`, `PUT /api/v1/auth/profile`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` - all real, mounted, cookie-based (`backend/routes/authRoutes.js`/`authController.js`).
- Real frontend client: `src/services/authApi.ts` - every call uses `credentials: 'include'`, no localStorage token handling anywhere in this file.
- Real, centralized state: `src/context/AuthContext.tsx`, exposing `login`/`register`/`demoLogin`/`logout`/`updateProfile`/`user`/`isAdmin`/`isDealer`/etc. via `useAuth()`, wrapped around the whole app by `AuthProvider` in `App.tsx`.

---

## CONFLICT 1 — App.tsx maintained its own, second, disconnected user state

**Found:** `App.tsx` had `const [user, setUser] = useState<UserProfile | null>(null)` - a second source of truth for "who is logged in," entirely separate from `AuthContext`'s real `user`.

**Real, confirmed consequence - this was not just a style issue:** `App.tsx`'s `onLogout` handler was `() => setUser(null)`. It only ever cleared this local, cosmetic state. It never called `AuthContext`'s real `logout()`, which is the only thing that actually calls the backend and clears the HttpOnly session cookie. A user who clicked "Log Out," refreshed the page, would be silently re-authenticated by session restoration, because their real session had never actually ended. Confirmed by reading the handler directly, not inferred.

**Fix:** `App.tsx` no longer holds any `user` state of its own. It consumes `const { user: authUser, logout: authLogout, isAdmin } = useAuth()` directly, and derives the `UserProfile`-shaped object the rest of the component tree expects via an explicit, documented adapter (see Conflict 2). `onLogout` now calls the real `authLogout()`. `onLogin` (passed to `AuthModal`) is now a no-op with an explanatory comment - the real state update already happens inside `AuthModal`'s own `login()`/`register()`/`demoLogin()` calls through the same context, so nothing else needs to set anything.

**Verified:** `npm run typecheck` exits 0; full test suite still 317/318 passing (1 intentionally skipped), unchanged from before this fix.

---

## CONFLICT 2 — Two incompatible User type shapes, never reconciled

**Found:** `AuthContext`'s `User` type (`src/utils/authRoutes.ts`) has broad, all-optional fields matching what the real backend actually returns. `App.tsx`'s `UserProfile` type (resolved from `src/types.ts` - see the separate, flat-vs-nested duplicate-file finding below) requires `phone`, `avatar`, and a narrower, fixed 5-value `role` union, with no `createdAt` field at all. These are genuinely different shapes, not just naming differences - confirmed by `tsc` itself rejecting the naive assignment.

**Fix:** added the two real, backend-confirmed fields (`avatar`, `createdAt`, `phone` - each verified present in `backend/controllers/authController.js`'s own allowed-fields list) to `AuthContext`'s `User` type, then wrote a small, explicit adapter in `App.tsx` that maps the real `authUser` to `UserProfile` - no field is invented that the backend doesn't provide, except `isVerified`, which the backend does not track at all and is mapped from the already-existing `emailVerified` boolean (the closest real, existing equivalent already used elsewhere in this codebase for this exact concept - not a new field invented for this fix).

**Left as a named, open finding, not silently fixed:** `UserProfile`'s role union (`'buyer' | 'dealer' | 'mechanic' | 'bank_officer' | 'admin'`, 5 fixed values) is narrower than the real role vocabulary this app actually uses elsewhere (`AuthContext`'s own `mapBackendRoleToFrontend` recognizes many more: `individual_seller`, `broker`, `superadmin`, etc.). This is a pre-existing type-definition gap, not something this phase's authentication-wiring fix should silently paper over or redesign - flagged for whoever owns `src/types.ts` next.

**Verified:** `npm run typecheck` exits 0 with this adapter in place.

---

## CONFLICT 3 — A second `UserProfile` type exists, and it is not the one being used

**Found while fixing Conflict 2, not assumed:** two files define `UserProfile` - `src/types/index.ts` and `src/types.ts` (the flat file). `App.tsx` imports from `'./types'`. Per this project's own Phase 0 audit (the flat-vs-nested duplicate pattern, confirmed there by checking actual bundle output), the flat file - `src/types.ts` - is the one genuinely resolved and used, not `src/types/index.ts`. Confirmed here independently: the real `tsc` error this phase hit (`phone` missing) matched `src/types.ts`'s stricter shape exactly, not the looser one in `types/index.ts`. This is the same repository-wide duplication issue named in Phase 0, encountered again concretely in this phase - not a new, separate bug, but direct, fresh evidence of the same one.

---

## CONFLICT 4 — Zero role gating on protected views; any visitor could reach admin UI via client state alone

**Found:** `App.tsx`'s render logic for the admin panel was `{activeNav === 'admin' && <AdminView ... />}` - no check on the real user's role anywhere in the condition. A completely anonymous, logged-out visitor could reach this view by any means that sets `activeNav` to `'admin'` client-side. This is precisely the scenario this phase's own instructions name directly: "Ensure unauthorized users cannot access protected UI merely by manipulating client navigation/state." Other views (`dealers`, `dashboard`, `seller-platform`) were checked for the same pattern and also render with no role condition - not fixed this pass (see "Not fixed this phase" below), since some of these may be intentionally reachable by any authenticated user regardless of role (e.g., a generic dashboard), and time did not allow individually confirming each one's intended access level without risking an incorrect, over-restrictive change.

**Fix:** `App.tsx` now also consumes `isAdmin` directly from `AuthContext` (a real, already-computed flag: `STAFF_ROLES.includes(user?.role)`), and the admin render condition is `activeNav === 'admin' && isAdmin`.

**Explicitly not claimed as sufficient on its own:** this is a frontend UX gate. It hides the UI from someone without the `isAdmin` flag; it does not and cannot substitute for real backend authorization on whatever data `AdminView`'s own API calls actually fetch. Per this phase's own instruction ("Ensure backend authorization remains authoritative") and this project's own Phase 0 finding ("backend route-level permission-middleware coverage... not verified"), whether every endpoint `AdminView` calls is itself properly `protect`+`allowRoles('admin')`-gated on the backend was **not** exhaustively re-verified this phase - named here as the real, remaining risk, not hidden behind this frontend fix.

**Verified:** `npm run typecheck` exits 0; full test suite unchanged, 317/318.

---

## CONFLICT 5 — The legacy `src/api/api.ts` axios client sent zero real credentials to any of its 22 real consumers

**Found:** `src/api/api.ts` (the older, previously-identified-as-legacy client) is still directly imported by 22 real, non-test frontend files (`SimilarCars.tsx`, `HeroCarousel.tsx`, `MarketPulse.tsx`, `PaymentModal.tsx`, `InspectionButton.tsx`, `DealerMarketInsights.tsx`, `AdminSidebar.tsx`, `NotificationContext.tsx`, `BrandingContext.tsx`, and others - confirmed by a direct repository-wide import search). This client's `localStorage.getItem('kayad_token')`-based Bearer-token interceptor can never fire in the current, real auth flow (`kayad_token` is never written anywhere - `services/authApi.ts` uses HttpOnly cookies exclusively). Critically, this shared axios instance also had no `withCredentials: true` - meaning it sent neither the dead Bearer token nor the real session cookie. **Every one of these 22 components' backend calls were made with zero authentication, regardless of whether the visitor was actually logged in.**

**Fix (minimal, targeted):** added `withCredentials: true` to this shared axios instance, confirmed compatible with the real backend's own CORS configuration (`credentials: true`, verified directly in `backend/server.js`). This is the smallest, most direct fix that gives these 22 real consumers the same, one, real, authoritative session used everywhere else - without touching their individual call sites or this client's `baseURL` (which is shared across many unrelated endpoint modules in `api.exports.ts` and changing it globally risks breaking currently-correct, non-`/v1` paths - a separate, per-endpoint audit, not an auth-wiring fix).

**Not removed:** the dead Bearer-token interceptor itself - left in place as inert, harmless dead code with an explicit comment, rather than deleted mid-way through an authentication-focused phase whose instructions were about consolidation and fixing, not file deletion.

**Verified:** `npm run typecheck` exits 0; full test suite unchanged, 317/318. The actual authenticated behavior of these 22 components' real backend calls (do they now genuinely succeed against `protect`-gated endpoints) was not individually, end-to-end re-verified for each of the 22 - this would require either live backend integration tests or manual per-component verification, neither available in this session's time budget. Named as a remaining, real gap.

---

## Checked and confirmed already correct - not touched

- **Demo login:** real, backend-connected (`POST /api/v1/auth/demo-login`), and gated behind `isDemoModeEnabled()` (`services/authApi.ts`), which returns `true` only when `VITE_ENABLE_DEMO === 'true'` exactly - any unset or different value defaults to `false`. Confirmed by direct read, satisfies "explicitly disabled by default."
- **`src/api/api.exports.ts`/`api.exports.backup.ts`:** the `.backup.ts` file was confirmed, in Phase 0, to be an explicit backup file - not independently re-checked for import status this phase, no new finding here.
- **Backend authorization mechanism itself** (`protect`/`allowRoles` middleware) exists and is real - its exhaustive route-by-route coverage remains unverified from Phase 0, carried forward as an open item, not re-audited in the time available this phase.

---

## PROOF OF SCENARIOS

Each scenario below states what was directly verified versus what is architecturally true but not independently, live-tested (e.g., against a running backend) in this session.

**Anonymous user:** `AuthContext`'s `user` starts `null` until `getMe()` resolves; on a fresh session with no valid cookie, the real backend's `/api/v1/auth/me` returns unauthenticated, `getMe()`'s own `.catch()` leaves `user` as `null`. `App.tsx`'s derived `user` is `null` in this state (`authUser` falsy → adapter returns `null` directly). Verified by source read and the type-level contract; not run against a live backend session in this sandbox.

**Authenticated buyer / dealer/seller / admin:** all three follow the identical real path - `login()`/`register()`/`demoLogin()` → real backend call → real user object → `normalizeUser()` (now including `mapBackendRoleToFrontend`, confirmed present) → context `user` set → `App.tsx`'s adapter derives the display `UserProfile`, including `role`. Role-specific UI (dealer/admin dashboard sections in `Navbar.tsx`'s dropdown, the `AdminView` gate fixed this phase) branches on this one, same, real role value - not on any separate, local state. Verified via source read and the passing `roleMapping.test.ts` (6/6) and `AuthContext.test.jsx` (3/3) suites; not run end-to-end against a live backend session.

**Unauthorized role (e.g., a buyer attempting to reach the admin panel):** with Conflict 4's fix, `activeNav === 'admin' && isAdmin` evaluates `false` for any non-staff role, so `AdminView` does not render, regardless of `activeNav`'s value. Verified by source read of the exact condition; the equivalent backend-side rejection for a direct, unauthenticated/under-privileged API call was not independently re-tested this phase (see Conflict 4's own caveat).

**Logout:** now calls the real `authLogout()` (Conflict 1's fix) - internally: `authAPI.logout()` (a real `POST /api/v1/auth/logout` call) then `setUser(null)` inside `AuthContext` itself. Verified by source read of the corrected handler; not run against a live backend session to confirm the cookie is actually cleared server-side.

**Session restoration:** `AuthContext`'s mount-time `useEffect` calls the real `authAPI.getMe()` and sets `user` from its result - this is the same, single code path for every page load, not duplicated or bypassed by `App.tsx` (which, after this phase's fix, no longer has any state of its own to independently "restore"). Verified by source read; not run against a live backend session with a real, pre-existing cookie.

**Expired session:** `AuthContext` listens for a `'kayad:auth-expired'` window event and responds by clearing `user` and `loading` - confirmed present and unchanged by this phase's fixes. What dispatches this event (likely a 401-handling interceptor somewhere in `services/authApi.ts`) was not independently re-traced this phase; flagged as the one piece of this specific scenario not freshly re-verified, though its presence and wiring were not touched or suspected of being broken.

---

## Files changed this phase

- `src/App.tsx` — removed local `user` state entirely; consumes `user`/`logout`/`isAdmin` from `AuthContext` via `useAuth()`; added an explicit, documented adapter from the real auth user to this app's `UserProfile` shape; fixed `onLogout` to call the real logout; fixed `onLogin` to be an explicit no-op (state already updated via context); added a real role gate to the admin view.
- `src/utils/authRoutes.ts` — extended `User` with `avatar`, `createdAt`, `phone` (all confirmed real, backend-returned fields, not invented).
- `src/api/api.ts` — added `withCredentials: true` to the shared, still-in-use-by-22-files axios client; left the dead Bearer-token interceptor in place with an explanatory comment.

No backend files, no tests, and no UI/business logic beyond the above were changed.

---

## Not fixed this phase — named directly, not silently deferred

- **Role gating on `dealers`/`dashboard`/`seller-platform` views** — checked, confirmed to have the same no-role-condition pattern as `admin` had, but not fixed: determining each view's actually-intended access level (some may be correctly open to any authenticated user) without introducing an incorrect, over-restrictive regression was not achievable in the remaining time. This is real, remaining P0-adjacent work.
- **Per-endpoint backend authorization audit** — whether the ~90 mounted backend routes (per Phase 0) are all correctly gated by role where they should be was not re-verified this phase; carried forward from Phase 0 as the single most important open security question in this codebase.
- **The 22 real consumers of the now-credentialed `src/api/api.ts` client** — the fix (Conflict 5) makes their requests carry real credentials; whether each of those 22 components' specific backend calls now actually succeed end-to-end was not individually re-tested.
- **Deleting the legacy `src/api/api.ts`/`api.exports.ts` system entirely** — explicitly out of this phase's scope given 22 real files still depend on it; a full migration of those consumers onto `services/`-style clients is real, valuable, separate future work.

STOP per instructions — no product feature work follows.
