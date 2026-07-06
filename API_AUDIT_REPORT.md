# Backend API Audit Report

Generated: 2026-06-28

## Scope

Audited all backend APIs across:
- **67 route files** in `backend/routes/`
- **53 controller files** in `backend/controllers/`
- **36 middleware files** in `backend/middleware/`
- **16 validation schema files** in `backend/validation/`
- **Server entry point**: `backend/server.js` (970 lines)
- **Auth middleware**: `backend/middleware/auth.js`
- **RBAC middleware**: `backend/middleware/rbac.js` + `backend/middleware/role.js`
- **Error handler**: `backend/middleware/errorHandler.js`
- **Rate limiter config**: `backend/middleware/rateLimiter.js`
- **Response utilities**: `backend/utils/response.js`

---

## 1. Authentication

### Rating: ⚠️ Good, with minor gaps

| Aspect | Status | Details |
|--------|--------|---------|
| JWT verification | ✅ | `protect` middleware in `auth.js:51` verifies Bearer token + cookie fallback |
| Token versioning | ✅ | `tokenVersion` check invalidates old tokens on logout/password change |
| Token caching | ✅ | 20s in-memory LRU cache (`auth.js:22-42`) avoids DB thundering herd |
| Owner bypass | ✅ | `isOwnerEmail()` elevates to `superadmin` role with `webhoist` effective role |
| Email verification gate | ✅ | Config-gated via `REQUIRE_EMAIL_VERIFICATION` env var |
| Session management | ✅ | `GET /sessions`, `DELETE /sessions/:tokenId`, `POST /sessions/revoke-all` |
| `optionalAuth` | ✅ | Safe for public routes — attaches user if token valid, never blocks |

### Issues

| # | Severity | Issue |
|---|----------|-------|
| A1 | **Low** | `optionalAuth` in `auth.js:247` does NOT use the cache (hits DB every time). Under high traffic on public car listing pages, this adds unnecessary load. |

---

## 2. Authorization

### Rating: ❌ Inconsistent — three competing systems

Three different authorization approaches are used across routes, with different error messages and different behaviors:

### System A: `auth.js` (legacy)
- `adminOnly` — checks `STAFF_ROLES` includes user role
- `dealerOnly` — checks `SELLER_ROLES` + `STAFF_ROLES`
- `allowRoles(...)` — generic role allow-list
- **Error:** `{ success: false, message: "Admin access only" }` (hardcoded)
- **No audit log** on denial

### System B: `rbac.js` (current)
- `requirePermission(...)` — checks effective permissions (role defaults ∪ grants − revokes)
- `requireRole(...)` — checks role allow-list
- `requireAtLeast(minRole)` — hierarchy-based check
- **Error:** `{ success: false, message: "Missing permission: {perm}", requiredRole: [...] }` (dynamic)
- **Audit log:** writes `AuditLog` entry on `access_denied`

### System C: `role.js` (wrapper around rbac.js)
- Re-exports from `rbac.js` plus adds `authorize(...roles)` — same as `requireRole`
- Small difference in error message format

### Issues

| # | Severity | Issue |
|---|----------|-------|
| B1 | **High** | **`requireAtLeast` in `rbac.js:128-162` has a STALE hierarchy** — it hardcodes `["user","dealer","ghost_checker","moderator","ad_manager","escrow_officer","admin","superadmin"]` which differs from `config/roles.js:8-22`. Missing: `individual_seller`, `marketing`, `technical_support`, `hr`, `accounts`. If any code uses `requireAtLeast("marketing")`, the check silently fails because `marketing` isn't in the hardcoded array (returns -1, grants access to everyone). |
| B2 | **High** | **`role.js:authorize` sends different error messages** than `rbac.js:requireRole`. `authorize` says `"Access denied for role: {role}"` while `requireRole` says `"Access denied. Required roles: ..."` and includes `yourRole`. |
| B3 | **Medium** | **Route files mix auth systems inconsistently.** Some routes use `protect, adminOnly` (auth.js), others use `protect, requirePermission(PERM.MANAGE_X)` (rbac.js), still others use `protect, allowRoles("admin","superadmin")` (auth.js). This makes it hard to audit who can access what. |
| B4 | **Medium** | **`adminRoutes.js` uses hardcoded `authorize("admin","superadmin")` and `authorize("superadmin")` inline** instead of the centralized permission system. This bypasses the per-user grant/revoke system and ignores `effectiveRole: "webhoist"`. |

---

## 3. Request Validation

### Rating: ⚠️ Mixed — good Zod coverage but many gaps

### Schemas present (16 files):
- `auth.schema.js`: register (strong password), login, change-password, forgot/reset password
- `car.schema.js`: create/update car with field-level coercion
- `payment.schema.js`: initiate payment + M-Pesa callback
- `escrow.schema.js`: create escrow, release (OTP 6-digit), vault webhook
- `chat.schema.js`: create chat, send message
- `dispute.schema.js`: full state machine validation (11 schemas)
- `admin.schema.js`: toggle-ban, dealer approval, config, staff, ads, market data, kill-switch
- `dealer.schema.js`: team invite, mark sold, bid accept, auction start/extend
- `inspection.schema.js`: order, confirm payment, assign, submit
- `inspectorApplication.schema.js`: apply, approve, reject
- `ntsa.schema.js`: queue, process, add documents
- `savedSearch.schema.js`: create, update
- `query.schema.js`: 15 query validation schemas (pagination + filters)
- `response.schema.js`: 16 response validation schemas
- `ledger.schema.js`: record entry, query, reverse, reconciliation
- `platform.schema.js`: create review + dispute escrow (2 schemas, mostly superseded by dispute.schema.js)

### Issues

| # | Severity | Issue |
|---|----------|-------|
| V1 | **High** | **`dealerRoutes.js` (1157 lines) has NO Zod body validation** for any POST/PUT handler. All validation is inline and inconsistent. E.g. `POST /team/invite` silently trusts `req.body` without validation. |
| V2 | **High** | **`adminRoutes.js` (2080 lines) uses Zod for only ~5 of 40+ mutation endpoints.** Endpoints like `POST /users/:id/toggle-ban`, `POST /users/:id/approve-dealer`, `POST /cars/:id/moderate` lack Zod validation — they rely on inline `if (!req.body.x)` checks. |
| V3 | **Medium** | **`favoriteRoutes.js` has NO body validation** for `POST /:carId/toggle` and `PUT /:carId/price-alert`. |
| V4 | **Medium** | **`notificationRoutes.js` has NO body validation** for `POST /read-all` (should be harmless but inconsistent). |
| V5 | **Medium** | **`securityLogRoutes.js` has NO body validation** despite accepting queries with filters. |
| V6 | **Medium** | **`userRoutes.js` uses inline validation** for `PUT /settings` instead of a Zod schema. |
| V7 | **Low** | **`response.schema.js` schemas are not actually used** in production — they're exported but only `authResponseSchema` and `escrowResponseSchema` are referenced in route files (`authRoutes.js` line 19, `bidRoutes.js` line 22, `paymentRoutes.js` line 26). No middleware enforces response validation at the app level. |
| V8 | **Low** | **`platform.schema.js` contains `createReviewSchema`** — this is imported and used via `validate.js`. But `disputeEscrowSchema` in the same file is never imported by any route (the dispute module has its own schemas). |

---

## 4. Rate Limiting

### Rating: ✅ Good coverage

| Limiter | Window | Max | Key | Applied At |
|---------|--------|-----|-----|------------|
| `globalLimiter` | 15 min | 500 | user ID or IP | App-level (all routes) |
| `authLimiter` | 15 min | 20 | IP only | `/api/auth/*`, `/api/v1/auth/*` |
| `bidLimiter` | 1 min | 10 | user ID or IP | Bid routes |
| `paymentLimiter` | 1 min | 5 | user ID or IP | Payment routes |
| `chatLimiter` | 1 min | 30 | user ID or IP | Chat routes |
| `reviewLimiter` | 1 min | 5 | user ID or IP | Review routes |
| `otpLimiter` | 1 min | 3 | IP only | OTP routes |
| `webhookLimiter` | 1 min | 10 | IP only | Webhook routes |
| `createLimiter` | 1 min | 10 | user ID or IP | Car creation, chat creation |
| `uploadLimiter` | 15 min | 30 | user ID or IP | Image upload |
| `adminLimiter` | 15 min | 200 | user ID or IP | Admin routes |
| `socketRateLimit` | 1 sec | 3 | Per-user | Socket.IO events |

### Issue

| # | Severity | Issue |
|---|----------|-------|
| R1 | **Low** | `contactLimiter` (5/hr) is applied in `contactRoutes.js` but NOT defined in `rateLimiter.js` exports as a named export. It's defined inline in `contactRoutes.js` as a custom `rateLimit({ windowMs: 3600000, max: 5 })`. This works but is inconsistent with the centralized approach. |

---

## 5. Error Handling

### Rating: ✅ Solid coverage with minor inconsistencies

### Global error handler (`errorHandler.js`):
- Catches Mongoose CastError → 400
- Catches Mongoose duplicate key → 400 (AppError.conflict)
- Catches Mongoose ValidationError → 400
- Catches JsonWebTokenError → 401
- Catches TokenExpiredError → 401
- Catches AbortError (fetch timeouts) → 504
- Adds `requestId` to response if present
- Adds stack trace in non-production
- Consistent `{ success: false, message, ... }` format

### `response.js` helpers:
- `success(res, data, message, meta)` → `{ success: true, message, data, meta }`
- `error(res, message, code, details)` → `{ success: false, message, details }`
- `validationError(res, errors)` → `{ success: false, message: "Validation failed", errors }`
- `notFound(res, message)` → `{ success: false, message }`
- `unauthorized(res, message)` → `{ success: false, message }`

### Issues

| # | Severity | Issue |
|---|----------|-------|
| E1 | **Medium** | **Inconsistent helper usage.** Many route handlers use `res.status(N).json({...})` directly instead of using the `response.js` helpers. This means `validationError`'s specific `errors` field format is not used consistently — some validation errors return `{ success: false, errors: "..." }` (from Zod) while others return `{ success: false, message: "Validation failed" }` (from misc handlers). |
| E2 | **Low** | **`responseWrapper.js` only adds `success: true`** — it doesn't normalize the response structure. Responses with `success: false` might lack `message` or `errors` fields depending on which code path generated them. |
| E3 | **Low** | **`notFound` middleware** (last in stack) returns `{ success: false, message: "Route not found", path: req.originalUrl }` — the path field is a nice debugging touch but is not part of the standard error response schema. |

---

## 6. Response Consistency

### Rating: ⚠️ Mostly consistent with minor variations

### Response wrapper (`responseWrapper.js`):
Ensures every JSON response has a `success` field (adds `success: true` if missing).

### Consistent patterns:
| Scenario | Status | Shape |
|----------|--------|-------|
| Success | 200 | `{ success: true, message, data?, meta? }` |
| Validation error | 400 | `{ success: false, message: "Validation failed", errors }` |
| Auth error | 401 | `{ success: false, message }` |
| Forbidden | 403 | `{ success: false, message }` |
| Not found | 404 | `{ success: false, message }` |
| Server error | 500 | `{ success: false, message, stack?, requestId? }` |

### Issue

| # | Severity | Issue |
|---|----------|-------|
| C1 | **Low** | **`auth.js` returns `{ success: false, message }` for auth failures** (401) while **`rbac.js` returns `{ success: false, message, requiredRole?, yourRole? }`** for auth failures. The extra fields are useful but inconsistent. |

---

## 7. Duplicate Endpoints

### Rating: ❌ Critical — 25 route groups double-mounted

### Problem

`server.js` mounts `v1Routes` (from `v1.js`) at **both** `/api` (line 441) **and** `/api/v1` (line 630). Additionally, the same 25 route routers imported by `v1.js` are also mounted individually under `/api/*` (lines 559-585).

This means every request to the 25 overlapping route groups is processed **twice** by Express:

| Route | Mount Points | Effect |
|-------|-------------|--------|
| `/api/auth/*` | Via `v1Routes` at `/api` + individually at `/api/auth` (line 560) | Handler runs **twice** per request |
| `/api/cars/*` | Via `v1Routes` at `/api` + individually at `/api/cars` (line 561) | Handler runs **twice** per request |
| `/api/bids/*` | Via `v1Routes` at `/api` + individually at `/api/bids` (line 562) | Handler runs **twice** per request |
| ... (22 more) | Same pattern | Handler runs **twice** per request |

The 25 duplicated route groups are: `auth`, `cars`, `bids`, `dealer`, `admin`, `payments`, `escrow`, `chat`, `favorites`, `notifications`, `reviews`, `transactions`, `auction-admin`, `ads`, `users`, `saved-searches`, `ntsa-verification`, `inspections`, `escrow-vault`, `security-logs`, `sms-bidding`, `inspector-applications`, `referral`, `contact`, `market`.

The second execution typically causes Node.js `ERR_HTTP_HEADERS_SENT` errors (caught by the error handler) or silently corrupts responses.

### Root Cause

Two separate routing systems were built:
1. **`v1.js`** (aggregator pattern) — imports all route files and mounts them under sub-paths
2. **`server.js` lines 559-585** (direct pattern) — mounts the same route files directly

When `server.js` switched to individual mounts (lines 559+), `v1Routes` was kept for backward compatibility (line 441: `app.use("/api", v1Routes)`). The result: every route is processed by both paths.

### Recommendation

Remove `app.use("/api", v1Routes)` (line 441) or the individual duplicate mounts (lines 559-585). Keep one routing strategy. The individual mounts have more specific middleware (idempotency, CSRF, rate limiters applied per-group) so they should be the canonical ones. `v1Routes` should only be mounted at `/api/v1` for versioned access.

---

## 8. Unused / Orphan Endpoints & Code

### Controller files with zero imports:

| File | Size | Notes |
|------|------|-------|
| `backend/controllers/escrowAnomalyController.js` | 6.4 KB | Dead code — original route file was deleted in earlier audit sweep |

### Middleware files with zero imports:

| File | Notes |
|------|-------|
| `backend/middleware/bulkhead.js` | Unused — no route or server.js reference |
| `backend/middleware/distributedLock.js` | Unused — no route or server.js reference |

### `v2.js` route file

`backend/routes/v2.js` (24 lines) is a placeholder that returns `{ success: true, message: "API v2 coming soon" }`. It is mounted at `/api/v2` but never advertised or used. Not harmful but adds dead weight.

---

## 9. Missing Validation — Complete Inventory

| Route File | Endpoint | Validation Status |
|-----------|----------|------------------|
| `dealerRoutes.js` | All 15+ POST/PUT endpoints | ❌ No Zod validation |
| `adminRoutes.js` | 35 of 40 mutation endpoints | ❌ No Zod validation (except staff, ads, config, market-data) |
| `favoriteRoutes.js` | `POST /:carId/toggle`, `PUT /:carId/price-alert` | ❌ No body validation |
| `notificationRoutes.js` | `POST /read-all` | ❌ No body validation |
| `userRoutes.js` | `PUT /settings` | ❌ No Zod validation (inline only) |
| `securityLogRoutes.js` | All endpoints | ❌ No query validation |
| `conversionFunnelRoutes.js` | All POST endpoints | ❌ No body validation |
| `operationsRoutes.js` | All endpoints | ❌ No validation |
| `supportRoutes.js` | `PATCH /:ticketId/status`, `POST /:ticketId/rate` | ❌ No body validation |
| `fraudRoutes.js` | `PUT /:fraudId/status` | ❌ No body validation |
| `leadRoutes.js` | `POST /`, `PUT /:leadId/stage`, `POST /:leadId/notes` | ❌ No body validation |
| `eventRoutes.js` | All tracking POST endpoints | ❌ No body validation |
| `marketRoutes.js` | All endpoints | ❌ No body/query validation |

---

## 10. Summary

| Category | Rating | Critical Issues |
|----------|--------|-----------------|
| Authentication | ⚠️ Good | 1 low — `optionalAuth` bypasses cache |
| Authorization | ❌ Inconsistent | 3 systems, stale hierarchy in `requireAtLeast`, missing `route.js` bypass for webhoist |
| Request Validation | ⚠️ Mixed | No Zod on dealer, admin, favorites, notifications, user settings |
| Rate Limiting | ✅ Good | No critical issues |
| Error Handling | ✅ Solid | Minor inconsistency in helper usage |
| Response Consistency | ⚠️ Mostly consistent | Minor field variations |
| Duplicate Endpoints | ❌ Critical | 25 route groups double-mounted — all handlers run twice |
| Unused Code | ⚠️ Some | 1 orphan controller, 2 orphan middleware, 1 placeholder v2 |

### Top 5 Priorities

1. **Fix duplicate route mounting** — remove `app.use("/api", v1Routes)` (line 441) or the individual mounts (lines 559-585). This is the most impactful fix.
2. **Consolidate authorization** — pick one system (rbac.js) and migrate all route files to it. Remove role.js and auth.js's `allowRoles`/`adminOnly`/`dealerOnly`.
3. **Fix `requireAtLeast` stale hierarchy** — use `ROLE_HIERARCHY` from `config/roles.js` instead of the hardcoded array.
4. **Add Zod validation to dealerRoutes.js and adminRoutes.js** — these two files account for 80% of missing validation.
5. **Delete `escrowAnomalyController.js`, `bulkhead.js`, `distributedLock.js`** — dead code.
