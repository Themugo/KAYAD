# KAYAD Phase 14.3 — Header, Profile, Notification and Logout Audit

| Control | Where | Finding |
|---|---|---|
| KAYAD branding, global navigation, search | global `Navbar.tsx` above the dealer workspace | present on every dealer page in screenshots; not modified |
| Dealer name / avatar / role | Navbar account menu (`Amani Motors`, role `Dealer` in screenshots) | uses the authenticated user; not modified |
| Notifications | Navbar entry plus the dealer header bell | Both reach the existing `/notifications` route (`NotificationsPage`, renders in the browser at 3 widths). The dealer bell shows **no count** (no per-dealer unread source is wired there); the Navbar count comes from its own notification store. |
| Profile / settings / support links | Navbar | not modified; no dealer-specific duplicate was created |
| Organization switcher | none exists | none added |
| Logout | `AuthContext.logout` → `POST /api/v1/auth/logout` | Backend `logout` revokes all refresh tokens for the user, increments `tokenVersion`, invalidates the user cache and clears the `token` and `refreshToken` cookies. The client then clears the in-memory CSRF token and settles to unauthenticated. If the network call fails, the client still clears its state and logs the error; a failed call therefore leaves the server session valid while the UI shows signed-out. This is the existing fail-closed-on-client design; not changed (authentication architecture out of scope). Covered by existing `AuthContext` and `Navbar` tests; **not exercised against a live session here**. |

Verification and dealership approval are never automatic anywhere in this phase's changes.
