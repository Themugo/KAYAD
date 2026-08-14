# 05 — Authentication Map
**KAYAD Fusion Audit — Document 5 of 12**

---

## 1. Two Completely Independent Authentication Systems

### 1.1 Frontend (`src/components/AuthModal.tsx`) — Passwordless Demo Role-Picker
Established in prior sessions' work, restated here for this document's completeness:
- 4 hardcoded roles: `buyer`, `dealer`, `mechanic`, `admin`
- Demo emails end in `@kayad.co.ke` (e.g., `admin@kayad.co.ke`)
- Zero password verification, zero API call — clicking a role button directly sets React state
- No `localStorage`/`sessionStorage` persistence — session is pure in-memory React state, correctly lost on refresh

### 1.2 Backend (`backend/controllers/authController.js` + `routes/authRoutes.js`) — Real, Substantial Auth System
This is not a stub. Confirmed present and real:
- Full registration/login/logout flow with `email` + `password`
- **A separate, real `demoLogin` endpoint** (`POST /api/v1/auth/demo-login` — exact path not yet confirmed against `v1.js`, but the controller function is real)
- JWT access tokens + rotating refresh tokens (cookie-first, `Authorization: Bearer` header fallback)
- Session management: `getSessions`, `revokeSession`, `revokeAllSessions`
- Password reset flow: `forgotPassword`, `resetPassword`, `changePassword`
- Email verification: `verifyEmail`, `resendVerification`
- **Phone OTP verification**: `sendPhoneOTP`, `verifyPhoneOTP`, `checkPhoneVerification` — a whole second verification channel the frontend has no equivalent of at all
- Account lockout middleware (`accountLockout.js`) and dedicated rate limiting (`authLimiter`) — real brute-force protection
- `JWT_SECRET` and `SESSION_SECRET` are placeholder values in `.env.example` (`"<generate-32-char-random-string>"`) — consistent with `01`'s finding that no live environment is actually configured yet

### 1.3 The Demo Accounts Don't Even Agree With Each Other
Direct comparison, not inferred:

| | Frontend (`AuthModal.tsx`) | Backend (`DEMO_ACCOUNTS` in `authController.js`) |
|---|---|---|
| Roles | `buyer`, `dealer`, `mechanic`, `admin` (4) | `dealer`, `seller` (role: `individual_seller`), `buyer` (3) |
| Email domain | `@kayad.co.ke` | `@kayad.space` |
| Example | `admin@kayad.co.ke` | `dealer@kayad.space` |

**These weren't just never connected — they were designed independently, by processes that didn't coordinate on even the basic shape of "what is a demo account."** No `mechanic`/`admin`-equivalent role exists in the backend's demo set; no `individual_seller` role exists in the frontend's. This is stronger evidence for the "two parallel systems" framing than a simple absence of API calls would be on its own — the *concepts* diverged, not just the wiring.

---

## 2. Database Layer Under Auth — A Real, Deliberate Migration Artifact, Not a Rule Violation

While reading `authController.js`, code was found that initially looked like it might violate the fusion project's Rule #8 ("do not reintroduce MongoDB as a runtime database"): `User.findOne({ email })`, `.select("+password +tokenVersion")`, `User.updateOne({ _id: dealerId }, [{ $set: { ... $max: [...] } }])` — all classic Mongoose/MongoDB API shapes, including MongoDB's own aggregation-pipeline update syntax.

**Checked directly rather than assumed either way**: `mongoose` and `mongodb` are **not dependencies in `package.json` at all**. `models/User.js` — like all 185 models, confirmed via `grep -l "createModel" models/*.js | wc -l` returning 185 (zero exceptions) — uses the same `createModel()` factory that queries Supabase/Postgres under the hood.

**Conclusion**: `_base.js`'s model factory deliberately implements a Mongoose-*compatible API surface* (same method names, same call shapes, including the aggregation-pipeline update syntax) while actually executing Postgres queries against Supabase. This is a clear, intentional migration-compatibility shim — almost certainly evidence that this backend **used to run on MongoDB** and was migrated to Supabase/Postgres with the model layer rewritten to preserve the exact same calling convention, so the (presumably large number of) call sites across 75 controllers didn't all need to be rewritten by hand. This is good news for Rule #8 compliance (no live MongoDB dependency exists) and useful context for why parts of the codebase read like Mongoose at first glance — worth stating plainly rather than either raising a false alarm or silently ignoring the resemblance.

---

## 3. Public vs. Authenticated Route Split (Backend)

`authRoutes.js` explicitly comments its own structure:
```
// 🔓 PUBLIC ROUTES
```
followed by register/login/demo-login/forgot-password etc., with `protect` (real JWT-verification middleware, confirmed imported from `middleware/auth.js`) and `optionalAuth` used elsewhere in the same file for routes that behave differently based on auth state without strictly requiring it. This is a conventional, reasonable public/protected split — not investigated line-by-line for every one of the 92 route files in this pass, but the pattern in the most security-critical file (`authRoutes.js`) is sound.

---

## 4. What This Means for Fusion

- **The backend auth system is comprehensive enough to actually replace the frontend's demo-only login**, if connected — it already has a `demoLogin` concept, it's just shaped differently (3 roles vs. 4, different domain).
- Reconciling this is a **design decision, not a technical blocker**: either the backend's `DEMO_ACCOUNTS` gets extended to include `mechanic`/`admin`-equivalent roles matching the frontend's, or the frontend's role set gets adjusted to match the backend's real, more-restrictive set, or a mapping layer translates between them. This document doesn't recommend which — that's `12-fusion-roadmap.md`'s job — it just establishes that the mismatch is real, specific, and resolvable.
- Per Rule #12 ("backend authorization must remain authoritative") and Rule #11 ("do not use frontend state as the source of truth for authentication..."), the fusion direction is clear in principle: the frontend's passwordless role-picker is exactly the kind of frontend-state-as-authority pattern these rules exist to eliminate, once real connection work begins. Not touched in this audit-only phase, per the project's own explicit rule not to modify production code yet.

---

## 5. Open Question Carried Forward

Does `protect`/`optionalAuth` middleware actually get applied consistently across all 92 route files, or only in `authRoutes.js` itself? Not checked in this pass — flagged for a dedicated middleware-coverage check, likely as part of `10-integration-map.md` or a security-focused pass within `11-risk-register.md`.
