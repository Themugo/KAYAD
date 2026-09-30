# KAYAD — Explicit Authentication Flow Hardening — 2026-09-30

## Scope

This correction converges public authentication onto two explicit product flows:

- `/register` — account creation and onboarding only.
- `/login` — authentication only.

The compatibility `AuthModal` remains available to legacy/contextual callers, but it is now **sign-in only** and links to the canonical `/register` and `/forgot-password` routes instead of embedding a second registration flow.

## Confirmed issue

The public navbar's guest **Sign In** action previously opened `AuthModal` rather than navigating to the existing standalone `/login` route. This made the authentication surface ambiguous and prevented the explicit login page from being reached from the primary navbar action.

## Duplicate registration behavior

The backend correctly normalizes email addresses and returns HTTP `409` when an account already exists. This constraint is preserved. The registration UI now turns that conflict into an actionable recovery path:

- **Sign In Instead** → `/login`
- **Reset Password** → `/forgot-password`

No uniqueness constraint or account-recovery policy was weakened.

## Flow contract

### Sign Up

`Navbar → /register → role selection → account details → POST /api/v1/auth/register → 201 → verification → /login`

### Sign In

`Navbar → /login → POST /api/v1/auth/login → session cookie → canonical post-auth destination`

### Compatibility modal

`contextual Sign In → AuthModal(sign-in only) → /register or /forgot-password when appropriate`

## Hardening

- Navbar desktop and mobile now expose separate **Sign In** and **Create Account** actions.
- Navbar Sign In no longer opens the mixed authentication modal.
- Navbar Create Account explicitly navigates to `/register`.
- Registration completion provides an explicit **Go to Sign In** action.
- Registration conflict provides sign-in and password-reset recovery actions.
- Login uses the canonical `getPostAuthPath()` routing contract.
- Already-authenticated users visiting `/login` are redirected through the canonical post-auth route after auth state hydration.
- Existing registration uniqueness behavior is unchanged.
- Existing CSRF, session, verification, and backend architecture are unchanged.

## Validation

- Registration/onboarding source gate: **47/47 PASS**
- Explicit auth-flow contract: **16/16 PASS**
- Foundation integrity: **PASS**
- Backend runtime contracts: **14/14 PASS**
- Frontend runtime contracts: **PASS**
- Deployment/runtime drift: **17/17 PASS**
- Canonical architecture: **PASS**
- CSRF static route contract: **PASS**
- Private-upload cache hardening: **PASS**

Full TypeScript/build execution remains blocked in this environment because the repository requires Node `>=22.22.2`, while the available runtime is Node `22.16.0`; dependency installation could not complete under the current runtime.
