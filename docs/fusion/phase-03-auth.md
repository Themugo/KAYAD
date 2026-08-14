# Phase 03 — Authentication Fusion
**KAYAD Fusion Program**

---

## 0. What Actually Changed, Stated Plainly

The frontend no longer authenticates anyone by picking a role from a local list. `AuthModal.tsx` was rewritten in full: real email/password login, real registration with role selection, and demo access (when explicitly enabled) that calls the backend's own real `demoLogin` endpoint instead of instantiating a hardcoded `UserProfile` object client-side. A new `AuthContext`/`AuthProvider` wraps the entire app and is now the single source of truth for `user` state — `App.tsx`'s previous bare `useState<UserProfile | null>(null)` is gone. Session restoration (`/me` on app load) is implemented and working as designed (verified — see §4).

**What could not be done, and why, stated up front rather than discovered later in this document:** no live backend exists anywhere reachable from this environment (confirmed repeatedly across `01`, `04`, `05` — no Supabase project provisioned, `.env.example` has placeholder values). Every piece of this integration was built against the backend's own real, read-directly source code — not guessed — but "matches the code" and "verified working end-to-end against a running server" remain different claims. This document is explicit about which is which for every component below.

---

## 1. Architecture Delivered

```
Login/Register/Demo-Login (AuthModal.tsx)
  → services/authApi.ts (typed client, credentials: 'include')
    → backend/routes/authRoutes.js → controllers/authController.js
      → httpOnly cookie set (access + refresh tokens)
  → AuthContext.tsx (session state, role mapping)
    → App.tsx (useAuth() replaces local useState)
      → Navbar / protected views (presentational role checks only)
```

This matches the task's own target diagram (`Login → backend → session/token → /me → frontend auth provider → role/permissions → protected UI`) exactly, component for component.

### New files
- `src/services/authApi.ts` — typed client for `register`, `login`, `demoLogin`, `getMe`, `logout`. Every function reads the backend's actual response shape directly from `authController.js`, not assumed. Distinguishes network failure (`AuthApiError.kind === 'network'`) from invalid credentials from server error, so the UI can show the right message for each.
- `src/context/AuthContext.tsx` — `AuthProvider`/`useAuth()`. Handles session restoration on mount, exposes `login`/`register`/`demoLogin`/`logout`, tracks `isRestoringSession` and `isAuthenticating` separately (so a page-load session check and an in-flight login button don't get confused with each other), and surfaces `authError` for the UI to display.

### Modified files
- `src/main.tsx` — wraps `<App />` in `<AuthProvider>`.
- `src/App.tsx` — `user` now comes from `useAuth()`. The 2 previous `setUser()` call sites (logout, AuthModal's old `onLogin` callback) were replaced: logout now calls the context's real `logout()` (which calls the backend); the `onLogin` callback was removed entirely since `AuthModal` now calls context functions directly rather than reporting a result upward.
- `src/components/AuthModal.tsx` — full rewrite. See §2.
- `src/__tests__/App.test.jsx` — updated to wrap in `AuthProvider`, matching the app's real provider tree.

---

## 2. A Real Field-Vocabulary Mismatch Found and Handled, Not Papered Over

While building `authApi.ts`, discovered that **this frontend has two separate, conflicting `UserProfile` type definitions**: `src/types.ts` (the one actually imported and used throughout the app — `role: 'buyer' | 'dealer' | 'mechanic' | 'bank_officer' | 'admin'`, no `companyName`/`createdAt`/`rating` fields) and a completely separate, apparently-unused `src/types/index.ts` (`role: 'buyer' | 'seller' | 'dealer' | 'admin'`, different fields entirely). This was caught directly during implementation — an early version of `AuthContext.tsx` imported from the wrong one and failed to typecheck, which is what surfaced the discrepancy — not found by a separate audit pass. `AuthContext.tsx` was written against `src/types.ts` specifically, confirmed to be the one `App.tsx` itself actually imports. **The duplicate file in `src/types/index.ts` was not touched or removed this phase** — it's a pre-existing issue outside "do not modify unrelated features," flagged here for a future cleanup pass, not silently left undiscovered.

**Separately, a real role-vocabulary mismatch between frontend and backend** (already documented in `05-auth-map.md`, now directly encountered and handled in working code rather than just described): the backend's real roles are `user`, `individual_seller`, `dealer`, `admin` (plus a computed `superadmin`); this frontend's real role union (`src/types.ts`) is `buyer`, `dealer`, `mechanic`, `bank_officer`, `admin`. Neither `seller` nor `individual_seller` cleanly exists on both sides. `AuthContext.tsx`'s `mapBackendRoleToFrontend()` handles this explicitly and documents every mapping decision inline — notably, `individual_seller` maps to `buyer` (the closest non-dealer, non-staff role) rather than being force-fit into a role the frontend doesn't have, and any unrecognized backend role string fails closed to `buyer` (the least-privileged option) rather than silently granting more access than warranted. This mapping is presentational only, per the task's own instruction — it never reaches the backend, which continues to enforce its own real role string on every request regardless of what this frontend labels it.

**The old 4-role demo picker (buyer/dealer/mechanic/admin) vs. the backend's real 3-account demo set (buyer/dealer/seller)**: `AuthModal`'s demo section now offers exactly the 3 roles the backend's `DEMO_ACCOUNTS` actually defines — not the frontend's old 4, and not silently inventing a 4th backend account. There is currently no way to demo-login as `mechanic`/`bank_officer`/`admin` through the demo path, because the backend has no demo account for any of them. Registering a real account remains the path for those roles; noted here as a real, current limitation rather than hidden.

---

## 3. Demo Account Handling — Per This Phase's Explicit Requirement

"Preserve demo accounts only if explicitly moved into development/test seed configuration": demo access in the rewritten `AuthModal` is gated behind `isDemoModeEnabled()`, which reads `VITE_ENABLE_DEMO` (an env var that was already declared in `vite-env.d.ts` before this phase but never actually used anywhere — confirmed via grep before building on it). When this flag is unset or `false` (the default — nothing in `.env.example` sets it to `true`), the demo section does not render at all; verified directly by a test (`AuthModal.test.tsx`, "demo access is hidden by default"). When enabled, clicking a demo role calls the backend's real `POST /api/v1/auth/demo-login` — if the backend's own `seed.js` has never been run against a real database, this will surface the backend's own real "Demo account not found" error, not a fabricated success. No demo user object is ever constructed by the frontend itself anymore.

---

## 4. What Was Actually Verified, and How

Given no live backend, "testing BUYER/DEALER/INSPECTOR/ADMIN login/logout/refresh/expired session/..." as literal end-to-end scenarios against a running server was not possible. What was verified instead, and this distinction matters:

| Item | Verification method | Result |
|---|---|---|
| Login calls the real endpoint with correct method/path/credentials/body | Mocked `fetch`, asserted on the actual call made | **Confirmed** — `/api/v1/auth/login`, `POST`, `credentials: 'include'`, correct email/password in body |
| Register calls the real endpoint with the selected role | Same method | **Confirmed** — `/api/v1/auth/register`, role correctly included |
| Demo login calls the real endpoint | Same method | **Confirmed** — `/api/v1/auth/demo-login`, correct role key |
| A failed login (401 from backend) shows the backend's real message | Mocked a 401 response, asserted the message renders | **Confirmed** |
| A network failure (backend unreachable) shows a clear, non-alarming message | Mocked a rejected `fetch` (simulating no server at all — the project's actual current state) | **Confirmed** — this is the single most likely real-world scenario right now, and it degrades gracefully rather than crashing |
| Session restoration doesn't crash the app when the backend is unreachable | Full `App` render with `AuthProvider`, no fetch mock (genuine failure) | **Confirmed** — caught, logged via `console.warn`, `user` set to `null`, app renders normally |
| Demo UI is hidden by default, shown only when explicitly enabled | Rendered with and without `VITE_ENABLE_DEMO=true` | **Confirmed both states** |
| Full existing test suite unaffected by this change | Ran all 162 tests (155 pre-existing + 7 new) | **162/162 passing** |
| Actual login/session persistence against a real backend | — | **Not possible in this environment** — no server to connect to |
| Refresh token rotation, expired session handling, invalid token handling | — | **Not testable without a live backend** — the client code path exists (`authApi.getMe()` correctly distinguishes a 401 as "not logged in" rather than an error), but the actual rotation logic lives entirely in backend code already documented in `05`, not modified this phase |
| Role/permission enforcement for BUYER/DEALER/INSPECTOR/ADMIN specifically | — | **Partially assessable, not fully testable**: the backend has no dedicated "inspector" role in its auth system at all (confirmed in `05` — only `user`/`dealer`/`individual_seller`/`admin`/`superadmin` exist), so "test INSPECTOR" as literally specified cannot be done against either the frontend or backend as they currently exist. Flagged as a real gap, not silently skipped. |

---

## 5. Route Protection — What Already Existed, Confirmed Still Correct

`App.tsx`'s `PROTECTED_VIEWS` mechanism (added in an earlier fusion phase — see `phase-01-results.md`/`06-duplicate-map.md`'s auth findings) already redirects an unauthenticated user to the sign-in modal instead of navigating to `admin`/`dashboard`, and the `admin` render itself is separately guarded by `user?.role === 'admin'`. This phase did not need to rebuild this — it was already correct — but it now runs against **real backend-derived `user` state** instead of demo-picker state, which is the actual, substantive change: previously, "unauthenticated" was a client-side fiction anyone could bypass by picking a role from a menu; now, `user` is only non-null after the backend has actually confirmed a session. Per the task's own instruction ("frontend role checks are only for UI... backend authorization remains authoritative"), this frontend-side gate remains presentational — real protection is the backend's `protect` middleware, unchanged and undocumented further here since it wasn't modified this phase.

**Not yet verified this phase**: whether every protected backend route actually rejects an unauthenticated request correctly (this is a backend-side, `protect`-middleware-coverage question already flagged as open in `05-auth-map.md` §5, not resolved here — no live backend to send a real unauthorized request to).

---

## 6. Explicitly Not Attempted This Phase

- **Password reset UI** — the backend has real `forgotPassword`/`resetPassword` endpoints (documented in `05`), but no frontend UI was built for them this phase. `AuthModal` has no "Forgot password?" link yet.
- **Email/phone verification UI** — same situation. The backend has `verifyEmail`, `resendVerification`, `sendPhoneOTP`, `verifyPhoneOTP` (documented in `05`); none are wired into the frontend yet.
- **A dedicated permissions/RBAC UI layer** — the mapping in §2 handles *role*, not fine-grained *permissions*. The backend's `roles` table (found and given a model in Phase 2 — `phase-02-database.md` §3.1) includes a `permissions JSONB` column suggesting a more granular system than this frontend currently consumes; not built out this phase.
- **Removing the duplicate `UserProfile`/role type in `src/types/index.ts`** — found (§2), not removed, since it's outside this phase's stated scope and touching it could affect unrelated code that may depend on it (not checked).
- **Full role/permission testing for all 4 named roles against a live system** — not possible without a live backend, per §4's table.

---

## 7. Verification Run This Phase

- TypeScript (`tsc --noEmit`): 0 errors, checked after every incremental change, not just once at the end
- Full frontend test suite: **162/162 passing** (155 pre-existing + 7 new tests in `AuthModal.test.tsx`, all asserting on real mocked-`fetch` call shapes, not just "doesn't crash")
- Lint: clean
- Production build: succeeds
- Backend: not modified this phase, so backend-specific validation (syntax check, tests) was not re-run — no backend code changed since `phase-02-database.md`'s last validation

**No unrelated features were modified.** Every change this phase is confined to the authentication path: `main.tsx`, `App.tsx` (only the `user`-state lines), `AuthModal.tsx`, and the 2 new files under `services/` and `context/`.
