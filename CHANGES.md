# KAYAD — Audit Fix Log
*Audited and fixed by Claude, May 2026*

> **Round 2 Complete** — All 6 remaining items from the original audit have been verified/fixed. See ✅ table below.
> **Round 3 Complete** — All 14 email templates are now programmatically bound to database state changes. See 📧 section below.

## 🔴 Critical Security Fixes

### 1. Socket bid spoofing (server.js)
**Before:** `placeBid` socket event accepted a client-supplied `userId` parameter, allowing any connected user to bid on behalf of any other user.
**After:** `userId` parameter removed from event signature. Always uses `socket.user?.id` (JWT-verified server-side identity). Unauthenticated sockets are rejected.

### 2. Hardcoded owner email in source code (auth.js, rbac.js, authRoutes.js, seed.js)
**Before:** Personal email `jimmythemugo@gmail.com` hardcoded in 5 files, granting permanent bypass of auth/ban checks and auto-assigning superadmin role.
**After:** All instances replaced with `process.env.WEBHOIST_EMAIL`. Empty string disables the bypass entirely.

### 3. tokenVersion missing from User schema (models/User.js)
**Before:** `authController.js` read and compared `user.tokenVersion` for token rotation, but the field was never declared in the Mongoose schema. Logout-invalidation silently did nothing.
**After:** `tokenVersion` added to schema with `select: false`. `.select("+tokenVersion")` added to the `refreshToken` query that performs the version check.

### 4. MONGO_URI vs MONGODB_URI mismatch (backend/.env.example)
**Before:** `.env.example` documented the variable as `MONGODB_URI` but `server.js` checks for `MONGO_URI` and throws on startup if missing.
**After:** Corrected to `MONGO_URI` in `.env.example`.

### 5. Payment amount accepts negative values (controllers/paymentController.js)
**Before:** `Number(amount)` with no bounds check — negative amounts passed validation.
**After:** `parsedAmount > 0` guard added. `parsedAmount` used consistently for both M-Pesa initiation and escrow creation.

## 🔴 Build-Breaking Fixes

### 6. pdfkit + sharp in frontend package.json
**Before:** Two Node.js-only native packages listed as frontend dependencies — Vite build fails trying to bundle them.
**After:** Both removed from `package.json`.

### 7. Docker frontend build context wrong (docker-compose.yml)
**Before:** `context: ./frontend` — all source files (`src/`, `index.html`, `package.json`) live at root, so `npm ci` found an empty 4-line stub lock file and failed.
**After:** Context changed to `.` (root), dockerfile path set to `frontend/Dockerfile`.

### 8. frontend/Dockerfile copied non-existent nginx.conf
**Before:** `COPY nginx.conf /etc/nginx/conf.d/default.conf` — the file is at root level, not inside `frontend/`. Build failed.
**After:** `COPY` line removed. `nginx.conf` is already mounted as a volume in `docker-compose.yml`.

### 9. Empty frontend/package-lock.json stub
**Before:** 4-line empty lock file caused `npm ci` to fail inside Docker.
**After:** File deleted. Root-level lock file is used by Docker (correct context now).

### 10. userRoutes not mounted in server.js
**Before:** `backend/routes/userRoutes.js` existed with user management endpoints but was never imported or registered. All `/api/users/*` returned 404.
**After:** Imported and mounted at `/api/users`.

## 🟡 Security Hardening

### 11. Password minimum length raised to 8 (authController.js, validate.js, User.js)
Minimum raised from 6 → 8 characters across all three enforcement points. 6 chars is inadequate for a financial platform with M-Pesa and escrow.

### 12. MongoDB Docker service had no authentication (docker-compose.yml)
**Before:** No `MONGO_INITDB_ROOT_USERNAME/PASSWORD` — anyone reaching port 27017 had unrestricted access.
**After:** Env-driven credentials added with a required variable guard.

### 13. Backend Docker container ran as root (backend/Dockerfile)
**After:** Non-root user `nodeuser` (UID 1001) created and set before `EXPOSE`.

### 14. Static uploads route served any file type (server.js)
**After:** Extension whitelist added (jpg/jpeg/png/webp only). `X-Content-Type-Options: nosniff` and `Content-Disposition: inline` headers added to prevent script execution.

### 15. Magic byte validation for file uploads (middleware/upload.js)
**After:** MIME type is now validated against actual file magic bytes, preventing MIME-type spoofing attacks where a `.php` is renamed to `.jpg`.

### 16. Socket rate limiting not applied to placeBid (server.js)
**Before:** `socketRateLimit()` was defined in rateLimiter.js but never called.
**After:** Applied to `placeBid` event. Unauthenticated bidders rejected before rate check.

### 17. bidLimiter not applied to HTTP bid route (routes/bidRoutes.js)
**After:** `bidLimiter` (10 bids/min) applied to `POST /:id/bid`.

### 18. paymentLimiter not applied to payment routes (routes/paymentRoutes.js)
**After:** `paymentLimiter` (5 attempts/min) applied to `POST /payments/initiate`.

### 19. Content-Security-Policy missing from nginx.conf
**After:** Strict CSP added permitting only `self`, Cloudinary images, Sentry, and WebSocket to domain.

### 20. HSTS missing preload flag (nginx.conf)
**After:** `preload` added to `Strict-Transport-Security` header.

## 🟡 Functionality Fixes

### 21. M-Pesa API timeout too short (src/api/api.js)
**Before:** 4-second global timeout. M-Pesa STK push takes 10–30 seconds.
**After:** Global timeout 15s. Payment `initiate` has a 45s override.

### 22. Email verification not implemented (authController.js, models/User.js, email.service.js)
**After:** 
- `emailVerified`, `emailVerifyToken`, `emailVerifyExpire` fields added to User schema
- `verifyEmail` and `resendVerification` handlers added to authController
- `sendVerificationEmail` and `sendVerificationReminderEmail` added to email.service.js
- Token generated and email sent (non-blocking) during `register()`
- Routes wired: `GET /api/auth/verify-email/:token` and `POST /api/auth/resend-verification`

### 23. RequireAdmin silently redirected to / (src/context/AuthContext.jsx)
**Before:** Logged-in non-admins hitting admin routes got a silent redirect to homepage.
**After:** Distinguishes unauthenticated (→ `/login`) vs unauthorized (→ explicit 403 message).

### 24. ErrorBoundary not reporting to Sentry (src/components/ErrorBoundary.jsx)
**After:** `reportError()` called in `componentDidCatch`. ARIA `role="alert"` added.

### 25. moment.js replaced with native Date (services/mpesaService.js, backend/package.json)
M-Pesa timestamp generation replaced with an 8-line native formatter. Removes deprecated 230KB library.

## 🟡 Infrastructure Fixes

### 26. ecosystem.config.cjs had wrong app name and no env separation
**Before:** App named `gari-backend`, no `--max-old-space-size`, no `env_production` block, no crash recovery settings.
**After:** Corrected name, `node_args: "--max-old-space-size=450"`, `env_production` block, `max_restarts: 10`, `min_uptime: 10s`, `merge_logs: true`.

### 27. render.yaml used npm install instead of npm ci, missing env vars
**After:** `npm ci --omit=dev`, missing vars added (`WEBHOIST_EMAIL`, `SENTRY_DSN`, `REDIS_URL`, `AT_API_KEY`, `SENDGRID_API_KEY`, `EMAIL_FROM`). `MPESA_SECRET` corrected to `MPESA_CONSUMER_SECRET`.

### 28. .dockerignore files missing
**After:** Root `.dockerignore` and `backend/.dockerignore` created, excluding `node_modules`, `.env`, logs, and uploads.

### 29. Old branding throughout docs
**Before:** `gari-motors`, `garimotors.co.ke`, `gari-backend` throughout DEPLOY.md, MONITORING.md, INTEGRATION.md.
**After:** All replaced with `kayad`, `kayad.space`, `kayad-backend`.

## 📧 Round 3 — Email Pipeline Complete

All 14 transactional email templates are now programmatically bound to their respective database state changes.

| # | Template | Binding Location | Status |
|---|----------|-----------------|--------|
| 1 | `sendWelcomeEmail` | `authController.js` — sent after user registration | ✅ Bound |
| 2 | `sendVerificationEmail` | `authController.js` — sent after registration (was already bound) | ✅ Bound |
| 3 | `sendVerificationReminderEmail` | `authController.js` — `resendVerification` (was already bound) | ✅ Bound |
| 4 | `sendDealerApprovedEmail` | `adminRoutes.js` — dealer approval endpoint | ✅ Bound |
| 5 | `sendBidConfirmationEmail` | `bidController.js` — `placeBid()` (mock mode) + `confirmBidPayment()` (M-Pesa) | ✅ Bound |
| 6 | `sendOutbidEmail` | `bidController.js` — sent to previous highest bidder on new bid | ✅ Bound |
| 7 | `sendAuctionWonEmail` | `realtime/auctionEngine.js` — `endAuction()` | ✅ Bound |
| 8 | `sendPaymentConfirmedEmail` | `paymentService.js` — `confirmPayment()` | ✅ Bound |
| 9 | `sendEscrowReleasedEmail` | `escrowController.js` — `releaseEscrow()` via `notifyEscrowReleased` hook | ✅ Bound |
| 10 | `sendEscrowRefundedEmail` | `escrowController.js` — `refundEscrow()` via `notifyEscrowRefunded` hook | ✅ Bound |
| 11 | `sendPasswordResetEmail` | `authController.js` — `forgotPassword` (was already bound) | ✅ Bound |
| 12 | `sendNewMessageEmail` | `chatController.js` + `realtime/handlers/chatHandler.js` | ✅ Bound |
| 13 | `sendAuctionEndingSoonEmail` | `services/auctionReminderCron.js` — runs every 5min via `server.js` | ✅ Bound |
| 14 | `sendTeamInviteEmail` | `dealerRoutes.js` — team invite endpoint (was already bound) | ✅ Bound |

### New files created:
- `backend/services/auctionReminderCron.js` — checks auctions ending in 5/15/30/60 min and sends reminders to active bidders

### Files modified:
- `backend/controllers/authController.js` — added `sendWelcomeEmail` call
- `backend/controllers/bidController.js` — added `sendBidConfirmationEmail` + `sendOutbidEmail` in `placeBid()` and `confirmBidPayment()`
- `backend/controllers/escrowController.js` — moved `notifyEscrowReleased`/`notifyEscrowRefunded` above `releaseEscrow`/`refundEscrow` and added call sites
- `backend/controllers/chatController.js` — added `sendNewMessageEmail` to other participant
- `backend/controllers/paymentController.js` — no change needed (delegates to `paymentService.js`)
- `backend/services/paymentService.js` — added `sendPaymentConfirmedEmail` after confirmation
- `backend/realtime/auctionEngine.js` — added `sendAuctionWonEmail` to winner
- `backend/realtime/handlers/chatHandler.js` — added `sendNewMessageEmail` to other participant
- `backend/routes/adminRoutes.js` — added `sendDealerApprovedEmail` on approval
- `backend/server.js` — registered `startAuctionReminderCron`

## ✅ Completed Work — Round 2

| # | Priority | Item | Status |
|---|----------|------|--------|
| 1 | 🟡 Medium | Write integration tests — `jest.config.js` exists but zero test files are present | **Done** — 7 test files created (`auth.test.js`, `cars.test.js`, `escrow.test.js`, `payment.test.js`, `security.test.js`, `utils.test.js`, `health.test.js`) |
| 2 | 🟡 Medium | Add `VITE_WEBHOST_EMAIL` to all `src/` references if demo-bypass-by-email is still desired | **Done** — `import.meta.env.VITE_WEBHOST_EMAIL` referenced in `src/api/api.js:137` |
| 3 | 🟡 Medium | Implement password reset flow (token fields exist on User, handler not fully wired) | **Done** — `forgotPassword` and `resetPassword` handlers in `authController.js`, routes wired at `authRoutes.js:113-114`, `sendPasswordResetEmail` in `email.service.js`, frontend `ForgotPasswordPage.jsx` and `ResetPasswordPage.jsx` fully implemented |
| 4 | 🟢 Low | Add `aria-label` attributes to notification bell, user dropdown, and search buttons in Navbar | **Done** — `aria-label="Notifications"` on bell, `aria-label="User menu"` on user dropdown, `aria-label="Dealer packages"` on For Dealers button, `aria-label="Toggle menu"` on hamburger, `aria-label="Kayad home"` on logo |
| 5 | 🟢 Low | Add `<meta name="description">` tags per-route for SEO | **Done** — `src/hooks/usePageMeta.js` hook created and applied to `HomePage`, `Showroom`, `CarDetailPage`, `AuctionLivePage`, `AuctionCalendar`, `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `NotFoundPage` |
| 6 | 🟢 Low | Implement `robots.txt` and `sitemap.xml` for SEO | **Done** — Both files present in `public/` |
