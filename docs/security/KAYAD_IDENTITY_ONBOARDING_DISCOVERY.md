# KAYAD Identity, Registration & Onboarding: Discovery

Date: 2026-10-09. Working copy has no `.git`; the last commit known to be pushed before this work is `ec5bced`. Findings below are from reading the code and running it; remote CI evidence could not be obtained (see `KAYAD_CI_FAILURE_REPAIR_REPORT.md`).

## 1. Baseline (before any change in this mission)

| Check | Result |
|---|---|
| Frontend `npm test` | 508 passed, 1 skipped, 0 failed |
| Backend `npm test` | 937 Jest (62 suites) + 16 Vitest + 1 node:test passed (after `npm ci`; the lockfile audit fix had not yet been applied) |
| `tsc --noEmit` | 0 errors |
| `npm run build` | exit 0 |
| Validators (`scripts/validate-*.mjs`) | 164 pass / 10 fail. The 10 are pre-existing and environmental or unrelated: communication-event-convergence, communications-provider-certification, escrow-custody-domain, home-hero-premium, lead-crm-domain-end-to-end, live-runtime, local-supabase, phase6-release (Node 22.22.0 < 22.22.2), production-host-contract, v14-runtime-preflight (same Node check). |
| `npm audit` (root, high) | 1 high (source-map-js) |
| `npm audit --omit=dev` (backend, high) | 4 (1 critical `proxy-addr`) |

## 2. Verified route map (frontend)

Auth pages are rendered by `AuthRouteSurface` in `src/App.tsx` (path switch), outside the tabbed marketplace shell.

| Route | Component | Notes |
|---|---|---|
| `/login`, `/admin/login` | `LoginPage` | single sign-in surface |
| `/register` | `OnboardingFlow` | single registration surface |
| `/forgot-password`, `/reset-password` | `ForgotPasswordPage`, `ResetPasswordPage` | generic, rate-limited responses |
| `/verify-email` | `VerifyEmailPage` | token single-use; does **not** sign in |
| `/force-password-change` | `ForcePasswordChange` | for `mustChangePassword` |
| `/dealer/onboarding` | `DealerOnboarding` | `GET`/`PUT /api/dealer/onboarding`; pending dealers allowed |
| `/?nav=<tab>` | marketplace tabs | `nav=inspections` + `action=apply-provider|manage-business` is the provider/affiliation deep link |

Guards (in `AuthContext.tsx`): `RequireAuth`, `RequireDealer`, `RequireSeller`, `RequireEmailVerified`, `RequireAdmin`, `RequireAdminPage`; plus the in-app `protectedNavs` gate in `App.tsx` and the two `AdminLayout`s.

## 3. Backend contracts relied on

- Cookie-based HttpOnly sessions; CSRF token bootstrapped from `GET /api/v1/auth/csrf`.
- `POST /api/v1/auth/register`: **creates an account, issues no session.** The person must verify email and then sign in. Accepted `role`: `user` (status approved), `individual_seller` (pending), `dealer` (pending; business name and location required). Atomic via `kayad_register_identity_atomic`. Duplicate email → 409. Verification email delivery is non-blocking.
- `POST /api/v1/auth/login`: blocks unverified email (403). `resend-verification` and `forgot/reset-password` are generic and rate-limited.
- `GET|PUT /api/dealer/onboarding`: payment details, government ID, KRA PIN, optional business registration. Approval stays server-controlled.
- `POST /api/inspector-applications/apply` (`optionalAuth`): individual inspector application with no account; duplicate pending application → 400. Admin approval creates a `ghost_checker` account, a provider and a 72-hour set-password link.
- Business provider: authenticated `inspectionApi.registerProvider` + `declareCapability` (declared, not verified); staff affiliations via `/api/inspection/affiliations` and need acceptance by the business.

## 4. Canonical role matrix (as built)

| Public role | Backend role / endpoint | Required fields | Verification | After sign-in | Approval | Authorization boundary |
|---|---|---|---|---|---|---|
| Buyer | `user` via `/auth/register` | name, email, password | email | `/dashboard` or `next` | approved at creation | no seller/dealer powers |
| Private seller | `individual_seller` | + phone | email | `/?nav=seller-platform` | pending until KAYAD approves | cannot list until approved |
| Dealer | `dealer` | + phone, business name, location | email | `/dealer/onboarding` | pending until verification reviewed | dealer tools locked until approved |
| Garage / inspection business | `user`, then provider application | account fields; then business + services | email, then KAYAD review | `/?nav=inspections&action=apply-provider` | declared ≠ verified; public only for verified | no automatic provider access |
| Individual inspector, independent | `POST /inspector-applications/apply` (no account) | name, email, phone, ID, location, years, specialties | KAYAD review | email with set-password link on approval | admin approval | no account until approved |
| Mechanic/inspector employed by a business | `user`, then affiliation request | account fields | email; business must confirm; KAYAD verifies qualifications | `/?nav=inspections&action=manage-business` | business acceptance | entering a business name creates no affiliation |
| Broker / legacy | **not offered** | n/a | n/a | n/a | n/a | not supported end to end; removed from the public matrix and documented |
| Staff (admin, moderator, …) | provisioned by administrators | n/a | n/a | n/a | n/a | rejected by the register schema; `NON_SELF_REGISTRABLE` is asserted in tests |

## 5. Defects found (prioritised)

**P0**
1. Sign-in return destination was lost: `from` carried only `pathname` (dropping query and hash) and `getPostAuthPath` ignored it for buyers and staff, so e.g. `/?nav=inspections&action=…` could never be returned to.
2. `safeRedirectPath` did not reject backslashes or control characters (open-redirect hardening gap).
3. CI audit failures (lockfile advisories, one critical): fixed.
4. Direct `navigate('/login')` calls (auction page ×4, guards, both admin layouts, app shell) with no return path.

**P1**
5. No intent carried between login ⇄ register ⇄ verify; verification in another tab lost where the person was going.
6. Pending dealers were not sent to `/dealer/onboarding`.
7. Dealer completion screen said "Onboarding Complete – your seller profile is all set up" while the account was only under review (misleading).
8. 'Inspector / Mechanic' lumped individuals, employees and the business under one anonymous application.
9. The provider modal and Services tab offered a generic "Sign in / Create account" with no route back.
10. Second, divergent sign-in form in `AuthModal` (called `login` with the wrong signature) and an orphan registration implementation (`pages/register/*`).

**P2**
11. Forgot/Reset/Verify pages were visually unrelated to login/register and did not carry context.
12. Ad-heavy two-panel layout on every auth screen.
13. Two small touch targets and missing field-level accessible errors on registration.

## 6. Accepted trade-offs (documented, not defects)
- Registration 409 reveals that an email is registered. The UX recovery path (sign in, reset password) depends on it, and the endpoint is rate-limited.
- The legacy independent-inspector application is anonymous and account-less until an administrator approves it. Folding it into an account-first flow would change the backend contract and is out of scope; the UI says honestly that it is "not an account yet".
