# KAYAD Audit Fix Log

All fixes applied during the June 2026 security & architecture audit.
Each fix references the file modified and the exact issue resolved.

---

## 🔴 Critical Fixes

### FIX-01 — Registration auto-login bypass (authController.js)
Registration now returns HTTP 201 + JSON message asking for email verification instead of
immediately issuing tokens. Falls back to immediate login only when SMTP is unconfigured.

### FIX-02 — Phone number silently stored invalid (authController.js)
Registration now returns HTTP 400 if a phone is provided but formatPhone() returns falsy.
Invalid Kenyan phone numbers are rejected instead of stored raw.

### FIX-03 — requireAtLeast() used incomplete local hierarchy (rbac.js)
Deleted the local role-hierarchy array inside requireAtLeast(). Now imports ROLE_HIERARCHY
from config/roles.js. Previously individual_seller, marketing, hr, accounts,
technical_support, and ghost_checker were all blocked at any requireAtLeast() gate.

### FIX-04 — Brokers have no admin approval path (adminRoutes.js)
verify-dealer endpoint now handles dealer, broker, and individual_seller (preserves role).
New query filters added: ?pendingBroker=true, ?pendingIndividual=true, ?verificationStatus.

### FIX-05 — Dealer model (Dealer.js) unused (Dealer.js)
Dealer.js marked @deprecated with migration instructions. All live code uses User model.

### FIX-06 — Team member listing bypassed parent dealer approval (carController.js)
createCar now queries DealerTeam to detect team members and checks: membership status,
canListCars permission, and parent dealer approved/banned/listingsLocked state.

---

## 🟠 Warning Fixes

### FIX-07 — Staff accounts skipped email verification (adminRoutes.js)
Staff creation now sets emailVerified:true, approved:true, mustChangePassword:true.

### FIX-08 — Staff creation accepted 1-character passwords (adminRoutes.js)
Minimum 8-character password now enforced before User.create().

### FIX-09 — adminOnly middleware missing webhoist bypass (auth.js)
adminOnly now short-circuits for effectiveRole === "webhoist".

### FIX-10 — approved schema default was true (User.js)
Default changed to false. register controller explicitly sets approved:true for non-sellers.

### FIX-11 — Duplicate payment fields on User model (User.js)
Top-level bank fields marked @deprecated. All new writes should use paymentDetails only.

### FIX-12 — Listing duplication bypassed package quota (dealerRoutes.js)
Duplicate endpoint now runs full quota check and increments listingCount on success.

### FIX-13 — Access token cookie maxAge matched refresh token (authController.js)
Access token cookie maxAge now defaults to 1h (matches JWT expiry). Override via ACCESS_COOKIE_MS.

---

## 🔵 Duplication Fixes

### FIX-14 — Duplicate approve-dealer / verify-dealer endpoints (adminRoutes.js)
verify-dealer is now the canonical endpoint (approve+reject, audit log, email, notification).
approve-dealer kept as backwards-compat shim.

### FIX-15 — Double rate-limiting on auth routes (v1.js)
authLimiter removed from v1.js — applied per-route inside authRoutes.js only.

### FIX-16 — Owner email detection duplicated (authController.js)
Local OWNER_EMAILS and isOwnerEmail removed from authController.js; imported from config/owners.js.

---

## Files Modified
- backend/controllers/authController.js (FIX-01, 02, 13, 16)
- backend/controllers/carController.js (FIX-06)
- backend/middleware/rbac.js (FIX-03)
- backend/middleware/auth.js (FIX-09)
- backend/models/User.js (FIX-10, 11)
- backend/routes/adminRoutes.js (FIX-04, 07, 08, 14)
- backend/routes/dealerRoutes.js (FIX-12)
- backend/routes/v1.js (FIX-15)
- backend/models/Dealer.js (FIX-05, documentation only)
