# Phase 10 — Security Certification Report

Date: 2026-08-24
Scope: Full security audit of the KAYAD platform (Express/Supabase backend, React frontend, Socket.IO, M-Pesa integration). Follow-up to Phase 9 (escrow & payment safety). Audit + fixes only; no new features.

## Verification method

Surface mapping of all route files (~80), controllers (~50), and middleware, followed by targeted review of authentication, authorization, exposure, input handling, and infrastructure. Findings confirmed by reading code paths end-to-end. All fixes are regression-tested by a new 56-case security test suite (`backend/tests/security/securityCertification.test.js`) exercising the auth/authz middleware as anonymous, buyer, seller, dealer, ghost_checker, staff roles, admin, superadmin, and webhoist, plus forged/expired/revoked-token scenarios.

## Attacks tested and result

| Vector | Tests performed | Result |
| --- | --- | --- |
| Anonymous request | No token → 401 on all protected endpoints | PASS |
| Forged token | Wrong secret, alg=none, garbage string → 401 | PASS |
| Expired/revoked session | Expired JWT, tokenVersion mismatch (post-logout/password-change) → 401 | PASS |
| Banned/deactivated accounts | 403 (owner emails exempt for recovery) | PASS |
| Role claim forgery | JWT claiming `role=admin` while DB says `user` → effective role from DB, admin access denied | PASS |
| Privileged-role registration | `role=admin/superadmin` in register → falls back to `user` | PASS |
| Dealer self-approval | `onboardingComplete` in `updateProfile` no longer touches `Dealer.approved` | PASS after fix |
| Lateral staff access | `authorize("admin","superadmin")` rejects non-admin staff roles | PASS |
| CSRF | Cookie-authenticated POST without/with mismatched token → 403; Bearer requests exempt | PASS |
| Error leakage | Production 5xx → generic message, no stack, no DB error text | PASS after fix |
| Webhook mass assignment | Inventory webhook strips `featured`, `status`, `auctionStatus`, `isDemo`, `escrowEnabled`, `dealer`, `_id` | PASS after fix |
| API-key timing attack | Constant-time comparison | PASS after fix |
| Token theft via DB leak | Reset/email-verify tokens stored as SHA-256 hashes only | PASS after fix |

**Test suite: 15/15 backend suites, 311/311 tests pass (255 pre-existing + 56 new). Frontend tsc unaffected (backend-only changes).**

## Already-strong controls (verified, no fix needed)

- HS256 pinned algorithm, JWT_SECRET length validated at startup (min 32 chars), required in production
- bcrypt(12) password hashing; password policy (length + upper/lower/digit/special) enforced at register, and now also at reset
- Rotating refresh tokens with family revocation and tokenVersion invalidation on logout/password change
- Login enum-protection ("Invalid credentials") + account lockout (5 attempts / 15 min) with IP-based secondary lockout
- Admin routes behind `protect + adminOnly`; webhoist owner bypass restricted to listed owner emails
- `protectAccount` prevents hostile takeover of owner accounts
- mongoSanitize, HPP, DOMPurify-based XSS sanitisation applied globally
- Upload pipeline validates magic bytes (jpeg/png/webp/pdf), extension allowlist on `/uploads` static serve with nosniff
- CSRF enforced on cookie-based flows; Authorization-header (JWT) requests exempt
- CORS whitelist with credentials; custom origins blocked unless approved
- helmet CSP/HSTS, cross-origin embedder/resource policies; `trust proxy` set to 1 hop
- Idempotency middleware on bids/escrow/escrow-vault; escrow-vault bank webhook authenticated with timing-safe shared secret (fail-closed 503 when secret missing)
- Prometheus metrics endpoint admin-only; `/api-docs` admin-only; queue dashboard authenticated when `QUEUE_ADMIN_TOKEN` set
- Socket.IO authenticated, room names UUID-validated, per-event rate limiting
- M-Pesa callbacks: IP allowlist, atomic claim (no double-processing), amount verified (Phase 9)
- RBAC hierarchy declared in `config/roles.js` (user < … < admin < superadmin)
- No plaintext secrets in `.env.example`; reseed endpoint disabled in production
- Pagination capped (max 100/page) preventing full-dump via `limit=99999`

## Vulnerabilities found and FIXED

1. **HIGH — Dealer self-verification (role escalation).** `updateProfile` auto-set `Dealer.approved=true` whenever `onboardingComplete` was passed, bypassing the admin verification workflow. Any pending dealer could self-approve and, combined with `requireDealerVerification`'s legacy `Dealer.approved` grandfather clause, gain full seller capabilities. Fix: auto-approval block removed; approval now only possible via `/api/verification` admin workflow. Test: `dealer self-approval prevention`.

2. **HIGH — Public metrics endpoints.** `GET /api/metrics`, `/http`, `/alerts`, `/database`, `/cache`, `/replica-set` were unauthenticated, leaking memory/CPU/DB/cache internals (only `POST /reset` was protected). Fix: `router.use(protect, adminOnly)`.

3. **MED — Reliability endpoints public.** `/api/reliability/slis`, `/slos`, `/health` public. Fix: `protect, adminOnly` per route.

4. **MED — Health internals public.** `/health/detailed`, `/health/cache` and the deep health route leaked memory usage, cache stats, and raw infra error messages. Fix: admin-only on all three (shallow `/health`, `/live`, `/ready` remain public for probes).

5. **MED — Demo login reachable in production.** Passwordless one-click demo login active in any environment. Fix: disabled in production unless `ENABLE_DEMO_LOGIN=true`; demo roles restricted to buyer/seller/dealer; demo accounts now actually flagged `isDemo=true` by the seed (pregating fix, otherwise the feature was silently broken).

6. **MED — Password reset/verify tokens stored in plaintext.** DB leak exposed usable tokens. Fix: both stored as SHA-256 hash; lookups hash the presented token. Also registration now issues `emailVerified=false` + an email-verify token (login remains ungated unless EMAIL_HOST/REQUIRE_EMAIL_VERIFICATION enforce verification).

7. **MED — 5xx error leakage.** `errorHandler` returned `err.message` for internal errors in production (e.g. Mongoose/Redis error text). Fix: production 5xx responses return "Internal server error"; 4xx client messages still pass through.

8. **MED — Inventory webhook mass assignment.** `/api/webhooks/inventory` spread the whole item into `Car.create/$set`, letting a dealer (or a leaked API key) set `featured`, `status`, `auctionStatus`, `isDemo`, `escrowEnabled`, `dealer`, `_id`. Fix: explicit field whitelist + timing-safe API-key comparison + 500-item cap.

9. **LOW — Staff role update unvalidated.** `PUT /api/admin/staff/:id` accepted any role string (including `superadmin`). Fix: whitelist of staff roles, `superadmin` rejected (superadmin elevation only via webhoist owner path).

10. **LOW — CSRF/timing robustness.** `req.body._csrf` crashed when body undefined → hardened with optional chaining; `req.query?.ref` in register hardened likewise. Both bugs were caught by the new test suite.

11. **LOW — v1 parity.** `/api/v1` mounts for bids/escrow/favorites/reviews/users/saved-searches lacked CSRF/idempotency middleware that the unversioned mounts have. Fix: middleware parity added.

## Residual hardening recommendations (non-blocking)

- `/api/metadata/schema`, `/api/metadata/entities` list table/entity names publicly (admin config has `metadataSchemaPublic` if ops chooses to lock it). Consider protecting by default.
- `NodeCache.getStats()` used for the cache-health endpoint has a long-standing no-op stub — harmless, cleanup opportunity.
- Upload pipeline: Cloudinary delivery uses public URLs; signed URLs are only needed for KYC/verification evidence (already handled via `kyc` flag). Intentional.
- Lockout/lockout-redis: falls back to in-process Map when Redis is absent — fine for single instance, document Redis as prod requirement.
- Email verification gate remains opt-in (`REQUIRE_EMAIL_VERIFICATION` / `EMAIL_HOST`); set one of them in production config to enforce.
- Long `maxFileSize` (50 MB) on evidence upload combines with magic-byte validation; consider lowering for non-evidence routes.

## Certification summary

All tested attacks anonymous/buyer/seller/dealer/staff/admin scenarios now behave correctly. High-severity escalation and information-disclosure vectors closed. **Certified against the vectors in the table above as of commit on `main`.**
