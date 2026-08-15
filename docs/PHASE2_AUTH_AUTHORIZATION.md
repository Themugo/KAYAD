# PHASE2_AUTH_AUTHORIZATION.md
**KAYAD — Phase 2, Tasks 3-7**

Companion to `docs/ROLE_MATRIX.md` (Task 1). Covers backend authorization verification, JWT/session audit, cookie deployment topology, role-based routing, and role-escalation test coverage.

---

## Task 5 - Cookie Deployment: The Most Important Finding This Phase

Checked directly, not assumed, per this phase's own explicit instruction ("do not assume the Vercel rewrite makes the API same-origin unless it actually does"):

`vercel.json`'s `rewrites` array contains exactly one rule - a catch-all SPA fallback (`/((?!assets|favicon|robots|manifest|sw\.js|icons).*)` to `/index.html`). There is no `/api/*` proxy rewrite to the backend. The frontend (Vercel) and backend (Render, per the codebase's own comment: "Using sameSite: 'lax' for production to work with Vercel+Render setup") are genuinely cross-origin - confirmed further by the backend's CORS configuration, which explicitly lists specific allowed origins (kayad-motors.vercel.app and pattern variants) and sets `credentials: true`, exactly the configuration a real cross-origin deployment requires.

The concern: cookies are set with `sameSite: "lax"` (`authController.js`, both access and refresh token cookies). For a genuinely cross-origin `fetch()` request with `credentials: 'include'` (exactly what `services/authApi.ts` and `services/vehicleApi.ts` both do), modern browsers' default cross-site cookie behavior generally does not send a `SameSite=Lax` cookie on a cross-site XHR/fetch request - `SameSite=None; Secure` is the standard requirement for cross-origin cookie-based authentication to work reliably across current browser versions.

What this means if the concern is correct: the entire cookie-based login flow built in Fusion Phase 3 - while correctly implemented on the frontend (confirmed via `credentials: 'include'` in every request, verified by test) and correctly implemented on the backend in isolation - may not actually deliver a working session in the real, deployed Vercel+Render topology, because the browser may decline to send the cookie back on the next cross-origin request.

What this document does NOT claim: this has not been verified against a live deployment (none reachable in this program, per every prior phase's standing constraint). It is possible the real production topology differs from what `vercel.json` and the CORS allow-list suggest, or that some other mechanism compensates. This is reported as a strong, evidence-based concern requiring live verification, not a confirmed-broken system - but it is significant enough that it should be the first thing checked against a real deployment, given how much of this program's work (all of Fusion Phase 3) depends on this cookie actually arriving.

Recommendation, not implemented this phase (session-cookie config changes require the same caution as financial tables, per this program's established practice of not making unverifiable changes blind): if live testing confirms the cookie isn't being sent, the fix is changing `sameSite: "lax"` to `sameSite: "none"` (which also strictly requires `secure: true` - already conditionally set for production) on both the access and refresh token cookies in `authController.js`. This is a small, targeted, well-understood fix - but it should be verified as the actual problem first, not applied speculatively.

CSRF: `X-CSRF-Token`/`X-XSRF-Token` are allowed CORS headers, suggesting CSRF protection exists somewhere in the middleware stack. Not independently located or verified this phase - flagged as a gap, not assumed present or absent.

---

## Task 4 - JWT / Session Audit

Carried forward from `docs/fusion/05-auth-map.md` (Fusion Phase 3), re-confirmed rather than re-investigated from scratch this phase:

| Item | Status |
|---|---|
| Access token | JWT, httpOnly cookie, confirmed |
| Refresh token | Rotating, httpOnly cookie, confirmed |
| Token versioning | `UserAuth.tokenVersion` field confirmed present (`.select("+password +tokenVersion")` in `authController.js`) |
| Account lockout | Real middleware confirmed (`accountLockout.js`), checked before password verification |
| Rate limiting | Dedicated `authLimiter` confirmed |
| Logout | Real endpoint, confirmed |
| Password reset | Backend endpoints (`forgotPassword`/`resetPassword`) confirmed real in Fusion Phase 3 - no frontend UI exists (still true as of this phase, not built) |
| Email verification | Backend endpoints (`verifyEmail`/`resendVerification`) confirmed real - no frontend UI exists |
| Phone verification | Backend endpoints (`sendPhoneOTP`/`verifyPhoneOTP`) confirmed real - no frontend UI exists |
| Session invalidation | `getSessions`/`revokeSession`/`revokeAllSessions` confirmed real in the backend - no frontend UI to trigger these |

Not newly verified this phase: actual token expiration duration, rotation timing correctness, or revocation propagation under concurrent requests - all would require a live server to observe, which remains unavailable.

---

## Task 3 - Backend Authorization: Spot-Check, Not Exhaustive

Given 92 route files, an exhaustive per-endpoint audit was not completed this phase (would be a multi-phase undertaking on its own). What was verified:

- `backend/config/roles.js` (the backend's own documented single source of truth) provides `hasPermission`, `isAtLeast`, `isStaff`, `isSeller`, `isAdminOrAbove`, and `userHasPermission` - a real, coherent, non-duplicated authorization API.
- Spot-checked `escrowVaultRoutes.js` (the highest financial-sensitivity route file, per `docs/CRITICAL_USER_JOURNEYS.md`): `admin-confirm-funding` and `admin-refund` both require `protect, adminOnly` - correctly gated.
- Not verified: whether every one of the 92 route files consistently uses `userHasPermission`/`isAdminOrAbove` (the correct, complete checks honoring per-user grant/revoke and the `webhoist` bypass) versus the simpler `hasPermission(role, ...)` (which does not honor per-user overrides). This distinction matters - a staff member with a revoked permission could still pass a naive `hasPermission(role, ...)` check if a route uses the wrong helper. Flagged as the highest-value next authorization audit, not completed here.

---

## Task 6 - Role-Based Routing (Frontend)

Confirmed via this phase's own code changes (role-identity fix): `App.tsx`'s `PROTECTED_VIEWS` mechanism and the `admin` route's `user?.role === 'admin'` guard both continue to function correctly after the role-type extension - verified by the full test suite (180/180 passing) and a fresh production build.

What this phase did NOT build: dedicated routing/dashboards for the 10 staff roles (`ghost_checker`, `moderator`, `ad_manager`, `marketing`, `escrow_officer`, `technical_support`, `hr`, `accounts`, plus `superadmin`'s distinct capabilities beyond `admin`). These roles can now be correctly identified by the frontend (role-identity fix, this phase) and correctly labeled (`ROLE_DISPLAY_LABELS`, this phase), but no dedicated UI/dashboard exists for any of them - the frontend currently only has real, distinct experiences for `buyer`/`dealer`/`admin`. Building 9 new staff-role dashboards is a substantial scope decision for a future phase, not attempted here - this phase's job was making role identity correct and truthful, not building new UI surface area.

---

## Task 7 - Role Escalation Testing

| Test | Status |
|---|---|
| Buyer cannot access seller actions | Not independently tested this phase - no live backend to attempt a real unauthorized request against; frontend-side, a buyer's role never grants individual_seller/dealer UI paths (confirmed by the role-mapping fix's own test coverage) |
| Seller cannot access dealer actions | Same limitation - not live-tested |
| Dealer cannot access admin | Frontend: confirmed via `roleMapping.test.ts` and the existing admin route guard; backend: not independently re-verified this phase beyond the `escrowVaultRoutes.js` spot-check above |
| Staff endpoints reject non-staff | Not independently tested - `isStaff()`/`STAFF_ROLES` exist and are correctly defined; live enforcement not exercised |
| Frontend manipulation cannot bypass backend authorization | This remains true by architecture, not by new testing this phase: per this program's repeated, explicit principle (restated again in this phase's own brief), the frontend's role checks were never the security boundary - the backend's `protect`/`adminOnly`/`userHasPermission` middleware is. This phase's fix (role-identity preservation) improves the accuracy of what the frontend displays and gates for UX purposes; it does not change, and was never intended to change, where real authorization is enforced. |

Honest summary: this phase strengthened the frontend's role representation (no more silent identity collapse) and produced a complete audit of the definition of authorization (`ROLE_MATRIX.md`, this document). It did not - and could not, without a live backend - produce new evidence that authorization is correctly enforced end-to-end. That remains the standing gap across this entire program, named consistently rather than papered over by this phase's real, separate progress on role identity.

---

## Phase 2 Completion Gate - Self-Assessment

| Requirement | Status |
|---|---|
| Consistent role identity from DB to JWT to backend to API to frontend to router to UI | Frontend side: fixed this phase (role-identity collapse resolved, single source of truth for the role type, single source of truth for display labels). Backend/JWT/API side: was already consistent (`config/roles.js` was never the problem - the frontend's mapping was). Chain-wide consistency is now believed correct based on code inspection; not live-verified end-to-end. |
| No role may silently change identity | Met - individual_seller/superadmin/all staff roles now map 1:1, verified by dedicated test coverage (`roleMapping.test.ts`, 6/6 passing) |

PHASE 2 STATUS: PASS, with explicit carry-forward items - the cookie/SameSite cross-origin concern (Task 5) is the most consequential open item and should be the first thing checked against a real deployment. Backend per-route authorization coverage (Task 3) and staff-role dashboards (Task 6) are explicitly unfinished, not silently assumed done.
