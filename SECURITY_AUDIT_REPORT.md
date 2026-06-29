# KAYAD Backend Security Audit Report

**Date:** 2026-06-29
**Scope:** `backend/` — 67 route files, 53 controllers, 36 middleware, 16 validators, 76 models
**Auditors:** Automated static analysis

---

## Executive Summary

| Category | Status | Risk | Critical | High | Medium | Low |
|---|---|---|---|---|---|---|
| JWT Validation | ⚠️ | **Critical** | 3 | 1 | 3 | 1 |
| Role Enforcement | ⚠️ | **Critical** | 4 | 1 | 5 | 3 |
| Privilege Escalation | ⚠️ | Medium | — | — | 1 | 1 |
| IDOR | ⚠️ | **High** | — | 2 | — | 3 |
| Rate Limiting | ⚠️ | Medium | — | 1 | 4 | 4 |
| File Uploads | ⚠️ | **High** | — | 3 | 4 | 1 |
| XSS | ✅ | Low | — | — | — | 2 |
| CSRF | ❌ | **Critical** | 1 | — | 2 | 1 |
| SSRF | ✅ | Low | — | — | — | — |
| NoSQL Injection | ✅ | Low-Medium | — | — | 1 | 1 |
| **TOTAL** | | | **8** | **8** | **20** | **17** |

---

## 1. JWT Validation

### 1-CRITICAL-1: Algorithm Not Enforced in `jwt.verify()` (CVE-class)

**Files:**
- `backend/utils/generateToken.js:49` — `verifyToken()` utility
- `backend/middleware/auth.js:87` — `protect()` middleware
- `backend/middleware/auth.js:245` — `optionalAuth()` middleware
- `backend/controllers/authController.js:346` — `refreshToken()`

**Issue:** All `jwt.verify()` calls omit the `algorithms` option. `jsonwebtoken` defaults to accepting ANY algorithm the token header claims. An attacker can craft a JWT with `alg: "none"` or switch from `HS256` to `RS256` using a known public key, bypassing signature verification entirely.

**Fix:** Pass `{ algorithms: ["HS256"] }` to every `jwt.verify()` call.

### 1-CRITICAL-2: `.env` with Production Secrets Committed to VCS

**File:** `backend/.env` (lines 9-10, 144)

**Issue:** Production `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and MongoDB credentials (`kayad_admin:108p00164@...`) are hardcoded in `.env` which is committed to Git. Anyone with repo access can forge tokens and access the database.

**Fix:** Rotate all secrets immediately. Add `.env` to `.gitignore`. Use environment variables in production.

### 1-CRITICAL-3: CSRF Middleware Non-Functional

**File:** `backend/middleware/csrf.js:19`

**Issue:** CSRF middleware references `req.session.csrfToken` but `express-session` is not installed or configured. `req.session` is always `undefined`, making the CSRF check always fail. The `Authorization` header bypass (line 16) is the only reason routes don't fail — but this means cookie-based flows have zero CSRF protection.

**Fix:** Install `express-session`, configure it in `server.js`, or remove the broken middleware and rely on `SameSite=Lax` cookies.

### 1-HIGH-1: Refresh Token Reuse Detection Missing

**File:** `backend/controllers/authController.js:100-113`

**Issue:** Refresh token rotation is implemented (old token revoked on each refresh), but there is no reuse detection. If an attacker steals a refresh token and uses it before the legitimate user, both can have valid sessions until the next legitimate refresh.

### 1-MEDIUM-1: 20-Second Stale TokenVersion Window

**File:** `backend/middleware/auth.js:22`

**Issue:** User cache TTL is 20 seconds. A revoked session's `tokenVersion` change is not reflected until the cache expires, giving a 20-second window where revoked tokens remain valid.

### 1-MEDIUM-2: Refresh Token JWT Expiry (7d) Mismatches DB Expiry (30d)

**File:** `backend/controllers/authController.js:98`

**Issue:** The JWT expiry is 7 days, but the database record expiry is 30 days. An expired JWT (past 7 days) might still find a valid DB record, causing confusion.

### 1-MEDIUM-3: No iss/aud/sub Claims in Tokens

**Files:** `backend/utils/generateToken.js:17-42`

**Issue:** Tokens lack issuer (`iss`), audience (`aud`), and subject (`sub`) claims, and verification never checks them. In a multi-service architecture, a token issued for one service could be used against another.

### 1-LOW-1: `REFRESH_TOKEN_SECRET` Falls Back to `JWT_SECRET`

**File:** `backend/utils/generateToken.js:8`

**Issue:** In non-production, the same secret signs both token types. If one secret is compromised, both tokens are forgeable.

---

## 2. Role Enforcement

### 2-CRITICAL-1: Broken Imports in 4 Route Files

| File | Broken Import | Effect |
|---|---|---|
| `backend/routes/ledgerRoutes.js:3` | `adminAuth, auth` (don't exist) | **Crashes at startup** |
| `backend/routes/supportDashboardRoutes.js:5` | `supportOnly` (doesn't exist) | **Crashes at startup** |
| `backend/routes/salesDashboardRoutes.js:5` | `salesOnly` (doesn't exist) | **Crashes at startup** |
| `backend/routes/reliabilityRoutes.js:6` | `authMiddleware.js` (wrong path) | **Crashes at startup** |

**Fix:** Replace with correct exports from `auth.js` (`protect`, `adminOnly`, `allowRoles`).

### 2-CRITICAL-2: `adminOnly` Without `protect` — 7 Route Files

`adminOnly` checks `req.user.role` but never verifies the JWT. Without `protect` first, an attacker can craft a fake `req.user` object and bypass authentication entirely.

| File | Vulnerable Routes | Lines |
|---|---|---|
| `backend/routes/featureFlagRoutes.js` | 14 routes | 45-78 |
| `backend/routes/vehicleAnalyticsRoutes.js` | 2 routes | 75-78 |
| `backend/routes/organizationRoutes.js` | 4 routes | 32-59 |
| `backend/routes/marketplaceHealthRoutes.js` | 4 routes | 41-50 |
| `backend/routes/notificationAnalyticsRoutes.js` | 19 routes | 34-70 |
| `backend/routes/listingQualityRoutes.js` | 5 routes | 56-68 |

**Fix:** Add `protect` middleware before `adminOnly` on every route.

### 2-HIGH-1: `allowRoles()`, `dealerOnly()`, `requireRole()` Missing Webhoist Bypass

**Files:**
- `backend/middleware/auth.js:218-229` — `allowRoles()`
- `backend/middleware/auth.js:204-213` — `dealerOnly()`
- `backend/middleware/rbac.js:105-126` — `requireRole()`

**Issue:** `authorize()` (role.js) and `adminOnly()` (auth.js) both check `effectiveRole === "webhoist"` and bypass. But `allowRoles()`, `dealerOnly()`, and `requireRole()` do not. Platform owners could be denied access to routes using these middleware.

**Fix:** Add webhoist bypass check to all three functions.

### 2-MEDIUM-1: `requireAtLeast()` Incomplete Hierarchy

**File:** `backend/middleware/rbac.js:129-138`

**Issue:** Hierarchy is missing 5 roles: `individual_seller`, `marketing`, `technical_support`, `hr`, `accounts`.

### 2-MEDIUM-2: Duplicate Role Definitions

**Files:**
- `backend/controllers/authController.js:26-37`
- `backend/controllers/announcementController.js:7`

**Issue:** `STAFF_ROLES` and `SELLER_ROLES` are redefined independently from the canonical `config/roles.js`, creating drift risk.

### 2-MEDIUM-3: Ghost Checker Classified as Staff

**File:** `backend/config/roles.js:28-39`

**Issue:** `ghost_checker` is included in `STAFF_ROLES`, meaning they can access any `adminOnly`-protected route (though their actual permissions are limited to inspections).

### 2-LOW-1: Public Route Exposing Emails

**File:** `backend/routes/userRoutes.js:14-47`

**Issue:** `GET /users/search` with no auth exposes `email` field. Used for public user search.

### 2-LOW-2: Public Route Exposing Phone Numbers

**File:** `backend/routes/userRoutes.js:88-100`

**Issue:** `GET /users/:id` with `optionalAuth` exposes `phone` field for any user.

### 2-LOW-3: adminLimiter Only Covers Admin Routes

**File:** `backend/middleware/rateLimiter.js:183-197`

**Issue:** `adminLimiter` is applied to `/api/admin/*` routes but not to other admin-accessible routes.

---

## 3. Privilege Escalation

### 3-MEDIUM-1: Inspector Application Self-Approval

**File:** `backend/controllers/inspectorApplicationController.js:98-111`

**Issue:** No check prevents an admin from approving their own inspector application. An admin can elevate themselves to `ghost_checker` by:
1. Submitting an inspector application (public endpoint)
2. Approving it via the admin endpoint

**Fix:** Add `if (application.user?.toString() === req.user.id)` self-approval guard.

### 3-LOW-1: Dealer Self-Approval via Onboarding

**File:** `backend/controllers/authController.js:526-532`

**Issue:** Setting `onboardingComplete: true` auto-approves the dealer record. Low-risk because admin must assign the role first.

---

## 4. IDOR (Insecure Direct Object Reference)

### 4-HIGH-1: User Profile Enumeration

**File:** `backend/routes/userRoutes.js:88-100`

**Issue:** `GET /users/:id` uses `optionalAuth` (no auth required). Any unauthenticated user can query ANY user's ObjectId to retrieve name, email, phone, role, avatar, businessName, location, dealerRating, bio, createdAt, verifiedBuyer.

**Fix:** Add `protect` + ownership check: `if (req.params.id !== req.user.id && !STAFF_ROLES.includes(req.user.role)) { 403 }`.

### 4-HIGH-2: Escrow State Machine Exposure

**File:** `backend/controllers/escrowController.js:102-115`

**Issue:** `GET /escrow/:id/state` returns status and transition history for ANY escrow without checking if the requester is a party. Only `getEscrowById` has the party check.

**Fix:** Add the same party check from `getEscrowById` (lines 84-88).

### 4-LOW-1: Announcement Cross-Access Between Admins

**File:** `backend/controllers/announcementController.js:244-279`

**Issue:** Any admin can delete/send another admin's announcements. No `sentBy` ownership check.

### 4-LOW-2: Support Ticket Cross-Access Between Staff

**File:** `backend/controllers/supportTicketAdminController.js:56-220`

**Issue:** Support staff can access/modify any ticket regardless of `assignedTo`.

### 4-LOW-3: Payment Status Bypass Inconsistency

**File:** `backend/controllers/paymentController.js:185`

**Issue:** `checkPaymentStatus` uses `req.user.role !== "admin"` as bypass, while `getPaymentById` uses a broader staff list. Superadmins/escrow_officers blocked from payment status check.

---

## 5. Rate Limiting

### 5-HIGH-1: Webhook Inventory Sync — No Route-Level Rate Limiting

**File:** `backend/routes/webhookRoutes.js`

**Issue:** The inventory sync webhook endpoint has no route-level rate limiter. Only the global limiter (500/15min) applies.

### 5-MEDIUM-1: Verification Routes — No Route-Level Rate Limiting

**File:** `backend/routes/verificationRoutes.js:39-76`

**Issue:** Phone OTP requests, phone verification, and admin verification actions have no rate limiting beyond global.

### 5-MEDIUM-2: Dealer Routes — No Route-Level Rate Limiting

**File:** `backend/routes/dealerRoutes.js`

**Issue:** All dealer endpoints (earnings, analytics, subscriptions, settlements) have no route-level rate limiting.

### 5-MEDIUM-3: Favorite Routes — No Route-Level Rate Limiting

**File:** `backend/routes/favoriteRoutes.js:18-20`

**Issue:** POST/DELETE favorites, toggle, and price alerts are un-rate-limited beyond global.

### 5-MEDIUM-4: In-Memory Rate Limiting (No Redis)

**File:** `backend/middleware/rateLimiter.js`

**Issue:** All limiters use in-memory counters. In multi-instance deployments, effective limit scales with instance count. Counters reset on server restart.

### 5-LOW-1: Admin Bypass of Global Limiter

**File:** `backend/middleware/rateLimiter.js:19-23`

**Issue:** The `skipTrusted` function exempts `admin` role from the global limiter. Admins can abuse non-admin routes without rate limits.

### 5-LOW-2: Admin Logo Upload — No Rate Limiter

**File:** `backend/routes/adminRoutes.js:1437-1453`

### 5-LOW-3: Notification Routes — No Rate Limiting

**File:** `backend/routes/notificationRoutes.js:17-20`

### 5-LOW-4: Referral Routes — No Rate Limiting

**File:** `backend/routes/referralRoutes.js:11-60`

---

## 6. File Uploads

### 6-HIGH-1: Evidence Upload — No Magic Byte Validation

**File:** `backend/middleware/evidenceUpload.js:51-57`

**Issue:** The `fileFilter` only checks MIME type header (spoofable). An attacker can set `Content-Type: image/jpeg` while uploading a PHP/EXE/script file. The main `upload.js` has proper magic byte validation but `evidenceUpload.js` does not.

**Fix:** Add magic byte validation in `fileFilter`.

### 6-HIGH-2: Evidence Upload — Allows Dangerous File Types

**File:** `backend/middleware/evidenceUpload.js:17-24`

**Issue:** Allowed types include `application/pdf`, `application/msword`, `application/vnd.ms-excel`, `text/csv`, `application/json` — none of which are inherently executable, but PDF readers have had numerous RCE vulnerabilities.

### 6-HIGH-3: Evidence Upload — Path Traversal via User-Controlled `type` Field

**File:** `backend/middleware/evidenceUpload.js:38-41`

**Issue:** `req.body.type` is used directly to construct the upload subdirectory. An attacker could send `type: "../../etc/config"` to write outside the intended directory.

**Fix:** Validate `type` against an allowlist.

### 6-MEDIUM-1: Upload Directory Served from Webroot

**File:** `backend/server.js:362-375`

**Issue:** `express.static("uploads")` serves uploaded files at `/uploads/*`. While there is an extension whitelist, this still exposes raw files directly.

### 6-MEDIUM-2: Evidence Upload — 100MB Video Files (DOS Surface)

**File:** `backend/middleware/evidenceUpload.js:29`

### 6-MEDIUM-3: Evidence Upload — No Rate Limiting

**File:** `backend/routes/disputeRoutes.js:92`

### 6-MEDIUM-4: No Malware/Virus Scanning

**Files:** `backend/middleware/upload.js`, `backend/middleware/evidenceUpload.js`

### 6-LOW-1: Admin Logo Upload — No Upload Limiter

**File:** `backend/routes/adminRoutes.js:1437`

---

## 7. XSS

**Status: GOOD.** Multi-layer protection in place:

| Layer | Detail |
|---|---|
| Helmet CSP | `script-src: 'self'`, `style-src: 'self'`, `object-src: 'none'` |
| DOMPurify | `xssProtection()` middleware sanitizes all `req.body` strings |
| JSON responses | `res.json()` prevents HTML injection in responses |
| Filename sanitization | Upload filenames stripped to `[a-z0-9.-]` only |

### 7-LOW-1: No nonce-based CSP for inline scripts

**File:** `backend/server.js:198-229`

### 7-LOW-2: XSS Skip Fields Could Render User Content

**File:** `backend/middleware/security.js:38-45`

Fields `token`, `refreshToken`, `checkoutRequestID` skip sanitization. Verify these are never rendered in HTML responses.

---

## 8. CSRF

### 8-CRITICAL-1: CSRF Middleware Non-Functional (No Session Middleware)

**File:** `backend/middleware/csrf.js`

**Issue:** `express-session` is NOT installed. `req.session` is always `undefined`. The CSRF check always fails. Only the `Authorization` header bypass (line 16) prevents all CSRF-protected routes from erroring.

### 8-MEDIUM-1: `XSRF-TOKEN` Cookie `httpOnly: false`

**File:** `backend/middleware/csrf.js:33`

**Issue:** The CSRF token cookie is readable by JavaScript. While intentional for the double-submit cookie pattern, this exposes the token to any XSS vulnerability.

### 8-MEDIUM-2: CSRF Bypass via Authorization Header

**File:** `backend/middleware/csrf.js:16`

**Issue:** Any request with `Authorization: Bearer <token>` bypasses CSRF entirely. This is standard for SPAs but means the refresh token endpoint has no CSRF protection when accessed via cookies.

### 8-LOW-1: `SameSite: "lax"` Instead of `"strict"`

**File:** `backend/controllers/authController.js:68,83`

---

## 9. SSRF

**Status: GOOD.** No user-supplied URLs are fetched server-side.

All outbound HTTP requests use:
- Hardcoded API endpoints (M-Pesa, Africa's Talking, Cloudinary)
- Environment-driven URLs (Slack webhook, SMS gateway)
- No image proxy, URL fetcher, or webhook that accepts URLs from users

---

## 10. NoSQL Injection

**Status: GOOD (with minor note).** Strong multi-layer protection:

| Layer | Detail |
|---|---|
| `mongoSanitize` | Strips `$` and `.` from keys in `req.body`, `req.query`, `req.params` |
| Zod validation | 18 schema files validate all request inputs |
| Regex escaping | Search terms escaped with `.replace()` before `$regex` |
| Hardcoded field names | No user-controlled field names in queries |

### 10-MEDIUM-1: ReDoS Risk in Admin Routes

**File:** `backend/routes/adminRoutes.js:1809-1810`

**Issue:** User-supplied `brand` and `model` query params are used in `$regex` without escaping regex special characters. Limited to admin users, but a compromised admin account could cause ReDoS.

**Fix:** Escape regex special characters before `$regex`, consistent with `carController.js`.

### 10-LOW-1: XSS Protection Doesn't Cover Query Strings

**File:** `backend/middleware/security.js`

**Issue:** `xssProtection` sanitizes `req.body` but not `req.query`. Query string values bypass DOMPurify.

---

## Priority Fix Order

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| 🔴 P0 | Fix broken route imports (2-CRITICAL-1) | 5 min | Runtime crash fix |
| 🔴 P0 | JWT algorithm enforcement (1-CRITICAL-1) | 10 min | Token forgery prevention |
| 🔴 P0 | Rotate `.env` secrets + gitignore (1-CRITICAL-2) | 15 min | Credential leak |
| 🔴 P1 | `protect` before `adminOnly` (2-CRITICAL-2) | 20 min | Auth bypass fix |
| 🔴 P1 | IDOR user profile (4-HIGH-1) | 10 min | Data exposure fix |
| 🔴 P1 | IDOR escrow state (4-HIGH-2) | 5 min | Data exposure fix |
| 🔴 P1 | Evidence upload magic bytes (6-HIGH-1) | 15 min | File spoofing fix |
| 🟡 P2 | CSRF session middleware (8-CRITICAL-1) | 30 min | CSRF protection fix |
| 🟡 P2 | Webhoist bypass in RBAC (2-HIGH-1) | 15 min | Owner access fix |
| 🟡 P2 | Inspector self-approval (3-MEDIUM-1) | 5 min | Privilege escalation fix |
| 🟡 P2 | `requireAtLeast()` hierarchy (2-MEDIUM-1) | 5 min | Role check fix |
| 🟢 P3 | Rate limiting gaps (Section 5) | 20 min | Abuse prevention |
| 🟢 P3 | Evidence upload hardening (6-HIGH-2,3) | 15 min | Upload security |
| 🟢 P3 | ReDoS fix (10-MEDIUM-1) | 5 min | DOS prevention |
| 🟢 P3 | Duplicate role definitions (2-MEDIUM-2) | 10 min | Maintainability |
