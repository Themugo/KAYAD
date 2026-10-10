# KAYAD — Explicit Authentication Flow Convergence Fix

## Scope

The previous auth hardening separated `/login` and `/register`, but the application shell still rendered the legacy sign-in modal for unauthenticated actions from several marketplace surfaces.

## Correction

All `onOpenAuth` callbacks supplied by `AppInner` now route to the canonical `/login` page. The current pathname is passed as the login return context. The legacy `AuthModal` remains available only as a compatibility component for isolated consumers/tests; it is no longer rendered by the main application shell.

## Contract

- Sign In: `/login`
- Create Account: `/register`
- Forgot password: `/forgot-password`
- Reset password: `/reset-password`
- Email verification: `/verify-email`
- Unauthenticated protected-action prompt: `/login`

No authentication backend, session, CSRF, registration, role, or database architecture was changed.
