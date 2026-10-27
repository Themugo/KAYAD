# Maintenance policy matrix

Source of truth: `backend/config/maintenancePolicy.js` (pure, no I/O). Consumers: `middleware/systemCheck.js` (pre-auth), `middleware/maintenanceEnforcement.js` (identity-aware: `protect()`, login, refresh), `routes/maintenanceControlRoutes.js` (control plane). The frontend only *displays* the server's decision.

## 1. Scopes (what the System Owner can choose)

| Scope id | Label | Restricted audiences | Unaffected |
|---|---|---|---|
| `global` | Global shutdown (typed confirmation `GLOBAL SHUTDOWN`) | anonymous (public browsing + registration), buyers/private sellers, dealers + dealership staff, all staff | System Owners; staff holding an explicit `platform_recovery` grant (recovery lane only) |
| `ordinary_users` | All ordinary users | buyers/private sellers, dealers + dealership staff | public browsing, all staff, owners |
| `buyers_sellers` | Buyers and private sellers | buyers/private sellers; new buyer registration paused | public browsing, dealers + dealer staff, staff, owners |
| `dealers` | Dealers and dealership staff | dealers; active dealer-team members | public browsing, buyers/sellers, staff, owners |

Targeting uses only what the backend can enforce reliably: the caller's server-side role and an active `dealer_teams` row, re-resolved from the database on every protected request. Nothing else (no email lists, no client-supplied group) is accepted. A legacy hosted row (`isMaintenanceMode:true`, no scope) is treated as `global`; an unknown stored scope fails closed to `global`.

"Restricted" means: cannot sign in, refresh a token, or call any signed-in endpoint (HTTP 503 `SYSTEM_MAINTENANCE`, with the scope). Existing access tokens and refresh tokens of a restricted audience stop working on the very next request because `protect()` and `refreshToken` evaluate the policy per request.

## 2. Route classes

| Class | Routes | Purpose |
|---|---|---|
| `session` | `GET /auth/me`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/csrf`, `GET /auth/profile` | authentication, MFA, session verification, safe logout |
| `control` | `GET /admin/system/maintenance/status`, `POST /admin/system/maintenance/recover`, `POST /admin/system/maintenance/activate` | the maintenance control plane |
| `registration` | `POST /auth/register` | creating an ordinary account |
| `other` | everything else (marketplace, dealer, finance, admin...) | |

## 3. Decision table (`decide`)

Legend: ✔ allowed · ✖ 503 `SYSTEM_MAINTENANCE` · 403 = `MAINTENANCE_CONTROL_FORBIDDEN`.

### Scope `global`

| Caller | session | control | registration | other (incl. all admin & finance) |
|---|---|---|---|---|
| anonymous | ✔ (handler authenticates) | ✔ (handler authenticates; 401 without a session) | ✖ | ✖ |
| buyer / private seller | ✖ (after password check at login; per request after) | 403 | ✖ | ✖ |
| dealer / dealer staff | ✖ | 403 | ✖ | ✖ |
| ordinary staff / admin / superadmin-labelled non-owner | ✖ | 403 | ✖ | ✖ |
| technical staff (`platform_recovery` granted) | ✔ | status ✔ · recover ✔ · activate 403 | ✖ | ✖ (admin & financial APIs stay closed) |
| System Owner | ✔ | status ✔ · recover ✔ · activate ✔ | ✖ | ✖ (admin & financial APIs stay closed) |

### Scoped maintenance (`ordinary_users`, `buyers_sellers`, `dealers`)

| Caller | `ordinary_users` | `buyers_sellers` | `dealers` |
|---|---|---|---|
| anonymous browsing / public API | ✔ | ✔ | ✔ |
| anonymous `POST /auth/register` | ✖ | ✖ | ✔ |
| buyer / private seller (login, refresh, any signed-in call) | ✖ | ✖ | ✔ |
| dealer / dealer staff (login, refresh, any signed-in call) | ✖ | ✔ | ✖ |
| staff roles | ✔ | ✔ | ✔ |
| technical staff | ✔ (+ control status/recover) | ✔ (+ control) | ✔ (+ control) |
| System Owner | ✔ (+ control status/recover/activate) | ✔ (+ control) | ✔ (+ control) |
| control endpoints for non-owner / non-technical callers | 403 | 403 | 403 |

Unknown roles are treated as ordinary (most restricted), never privileged.

## 4. Who is "technical recovery"

All of: a staff role (`admin, superadmin, marketing, technical_support, hr, accounts, escrow_officer, ad_manager, moderator, ghost_checker`) AND status `approved` AND the account's own `grantedPermissions` contains `platform_recovery` AND it is not in `revokedPermissions`.

Never sufficient: a role label (including `superadmin`), an e-mail address, a default role permission set, dealer membership, or `isOwner` environment lists. The grant is made only by a System Owner through the existing `PUT /api/admin/staff/:id/permissions` (`systemOwnerOnly`; superadmin targets cannot be modified through it).

## 5. Control plane rules

| Endpoint | Who | Step-up | Other requirements |
|---|---|---|---|
| `GET .../status` | owner or technical | none (session only) | honest 503 `MAINTENANCE_STORE_UNAVAILABLE` if the store cannot be read |
| `POST .../recover` | owner or technical | owner: password + owner MFA (when enrolled) via `requireStepUp`; technical: password via `passwordStepUp` | reason ≥ 8 chars required for technical staff; optional `incidentRef`; optional `expectedVersion` |
| `POST .../activate` | **owner only** | owner: password + owner MFA (when enrolled) | reason ≥ 8 chars, optional `incidentRef`, typed `GLOBAL SHUTDOWN` for `global`, optional `expectedVersion` |

All three are rate-limited (`adminLimiter`, `stepUpLimiter` on mutations), CSRF-protected like every cookie-session mutation, and audited. Mounted before `/api/admin`, so they are independent of the general admin router.

Legacy endpoints: `POST /api/admin/system/kill-switch {full_maintenance}` and `POST /api/admin/system/recover {maintenance}` return 400 `MAINTENANCE_USE_SCOPED_CONTROL`. The per-feature switches (auctions, payments, ghost check) still work and share the same atomic writer.

## 6. Concurrency & idempotency

Every write is a compare-and-swap on `maintenanceVersion` (PostgREST conditional update; insert with 23505 retry; max 8 attempts, then 503 `MAINTENANCE_STATE_CONTENDED`). A caller-supplied `expectedVersion` mismatch returns 409 `MAINTENANCE_STATE_CONFLICT` with the current state. Re-asking for the existing state returns `changed:false` and writes no audit row. The response always carries the state read back from the database.

## 7. Failure behaviour (honest errors)

| Failure | Result |
|---|---|
| settings store unreadable on an ordinary request | marketplace stays up (pre-existing fail-open); control `status` returns 503 `MAINTENANCE_STORE_UNAVAILABLE` |
| settings store unreadable during activate/recover | 503, nothing changed, UI keeps showing server-confirmed state |
| dealer-team lookup fails for a role-`user` caller while scoped maintenance is active | fail closed: 503 `MAINTENANCE_POLICY_UNAVAILABLE` |
| auth/identity store down at login | existing login 5xx path; no fake success |
