# KAYAD Identity, Registration & Onboarding Convergence: Report

Date: 2026-10-09. Companion documents: `KAYAD_IDENTITY_ONBOARDING_DISCOVERY.md` (route map, role matrix, contracts, defects) and `KAYAD_CI_FAILURE_REPAIR_REPORT.md`.

## 1. Outcome in one paragraph
KAYAD now has one authentication and onboarding system on the existing backend: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`. Every place that sends a person to sign in or register carries a validated return path and a stated purpose, the registration page offers exactly the roles the backend genuinely supports, and each role's screen says truthfully what happens next (verify email, then sign in, then approval where approval applies). No new auth system, provider registry or parallel onboarding architecture was added, and the backend contract is unchanged.

## 2. What changed

### One canonical surface
- `AuthModal` (a second, divergent sign-in form that called `login` with the wrong signature) is now a redirect shim to `/login`. The legacy `auth/AuthModal` re-export still resolves. Orphan `pages/register/*` removed.
- App shell, route guards (`RequireAuth`, `RequireAdmin`, `RequireAdminPage`, `RequireEmailVerified`), both `AdminLayout`s, the auction page (×4) and the Sell page now go through `loginPathFor(...)` / `buildAuthPath(...)`.

### Return destinations (`src/utils/authIntent.ts`)
- `safeNextPath` accepts only an in-app path. It rejects absolute and protocol-relative URLs, backslashes, control characters, over-long values, percent-encoded tricks, and the auth pages themselves (no loops).
- `next` and `intent` travel in the URL; router `state.from` is read as a fallback; a validated pair is remembered for 24 hours in `localStorage` **only** to survive the email-verification round trip (usually a different tab). It holds a path and an allow-listed intent word, never credentials, tokens, ID numbers or email.
- Query parameters are UX hints only. They never confer a role or access: the role sent to the backend comes from the chosen card, and the backend decides.
- `getPostAuthPath`: forced password change first; then a safe `next`; then by role (inspector → `/inspector`, staff → `/admin`, approved dealer → `/dealer`, pending dealer → `/dealer/onboarding`, other sellers → seller platform, buyer → `/dashboard`, unverified buyer → `/login?verify=required`).

### Role-aware registration (`OnboardingFlow` + `src/components/onboarding/*`)
Five public roles (matrix in the discovery document): buyer, private seller, dealer, garage or inspection business, inspector or mechanic (independent vs employed). Staff and broker are not offered; `NON_SELF_REGISTRABLE` lists them and tests assert none can be chosen or sent.
- Field-level, announced errors; focus moves to the first error; password rules shown live; show/hide control; 44 px targets.
- Outcome screens that match the backend: **account created, verification required** (no session is claimed); **existing account** (sign in, reset password, resend verification); **application received** (independent inspector: "not an account yet"); **pending application already exists**; **unknown outcome** after a timeout or network failure.
- **No blind retry.** After an unknown outcome the account-creation POST is never re-sent automatically. The person chooses "Go back and try again" or "I may already have an account". A single in-flight guard prevents double submit.
- Garage/inspection business: creates a normal account, then sends the person straight to the provider application after sign-in. Declared services stay "declared" until KAYAD verifies them.
- Employed mechanic: account first, then an affiliation request the business must accept. Typing a business name creates no affiliation.

### Provider application discoverability
- `/?nav=inspections&action=apply-provider` and `action=manage-business` are real deep links. Signed-out visitors see "Sign in to apply" and "Create a business account" (which opens `/register?intent=provider` and returns to the application). The Services tab no longer offers a generic "Sign in / Create account".

### Truthful states
- Dealer completion screen: "Submitted for review" (not "Onboarding Complete / all set up"); dealer tools stay described as locked until approval. The `?complete=1` flag only chooses the screen; the approval wording comes from the server-reported `user.status`.
- Login shows the verification banner with resend; verified-now notice; wrong password and rate-limit messages are shown inline.

### Design
- `PremiumAuthShell`: one focused card, optional "what happens next" rail, no advertising panel. Login, register, forgot, reset and verify now share it. Responsive, reduced-motion-safe, visible focus.

## 3. Security
- No open redirects; `next` validated at every entry and again on use.
- No role escalation: `?role=admin`, `?intent=admin` and a hand-edited payload from the UI are ignored (browser test + Jest); the backend `registerSchema` independently rejects every privileged role (new Jest test: 15 cases).
- CSRF/session behaviour unchanged; register still issues no session.
- No passwords, tokens or ID documents in browser storage (browser test inspects `localStorage`/`sessionStorage` after registration).
- Verification and reset tokens are single-use and submitted once (guarded against React strict-mode double effects).
- CI: lockfile bumps close five advisories including a critical `proxy-addr` one that affects `req.ip`-based rate limiting and the M-Pesa callback allow-list.

## 4. Results

| Check | Result |
|---|---|
| Frontend `npm test` | 70 files, **550 passed**, 1 skipped (baseline 508 + 1 skipped); 0 failed |
| Backend `npm test` | exit 0: Jest **952 passed** in 63 suites (baseline 937/62), Vitest 16, node:test 1; 0 failed |
| `tsc --noEmit` | 0 errors |
| `npm run build` | exit 0 |
| Validators | **164 pass / 10 fail**, identical to baseline; the same 10 pre-existing failures (see discovery §1) |
| Root / backend audit at CI thresholds | 0 / 0 vulnerabilities |
| Browser journeys (Playwright + Chromium) | **26/26** — **mocked backend**: UI, routing, validation, redirects are real; responses are a fake. Not a live-backend proof. |

Browser journeys cover: open-redirect `next` ignored; safe `next` honoured after sign-in; login sends only email+password; login↔register carries `next`+`intent`; dealer validation then exactly one POST with role `dealer`; no session after registration; nothing sensitive in storage; unknown `?role=admin` ignored; duplicate email recovery; guarded route → `/login?next=…`; verification banner; six auth pages at 375 px (no horizontal scroll, one `h1`, no control under 40 px high); keyboard-only reachability of the sign-in button; reduced motion; provider deep link → register → return.

The browser pass found two real defects that unit tests missed (the "Not now" and "Change" buttons and "Use a different email" were 16 px high); fixed to 44 px.

### Validators updated (not weakened)
Six source-string gates asserted the old implementation (ad panel, `role === 'buyer' ? 'user' : role`, modal with its own form). They were rewritten to assert the same behaviours against the new code and extended: no ad panel, shell used by forgot/reset/verify, staff/broker never offered, modal is a redirect shim, `loginPathFor` preserves the full path. Files: `validate-explicit-auth-flows`, `-premium-auth-surfaces`, `-registration-onboarding`, `-registration-role-matrix`, `-platform-integration-ux`, `-premium-presentation-pass`.

### Revert → fail → restore → pass
1. `safeNextPath` replaced by an unvalidated passthrough → 19 tests failed; restored → 33/33 pass. (Removing only the `//` prefix check does **not** fail: later layers (decoded check and origin probe) still reject it. That redundancy is intentional defence in depth.)
2. Dealer completion forced to "approved" → 2 tests failed; restored → 3/3 pass.

## 5. Tests added
`authIntent` (26), `roles` (5), `OnboardingFlow` journeys (9), `LoginPage` (+3), `AuthModal` shim (2, replacing the old test of the second form), `dealerOnboardingTruth` (3), backend `registrationPrivilegedRoles` (15). Two existing backend source-contract assertions in `registrationContract.test.js` read the old `OnboardingFlow` text; they now read `roles.ts`/`validation.ts` and assert the same behaviour (dealer fields required, buyer→`user`).

## 6. Not done / limits
- Live backend, real mailbox and Supabase were not exercised (environment); see the remaining plan.
- Remote CI was not observed; the repair is verified locally only (CI report §1).
- Dealer onboarding form body keeps its legacy styling (function and truthfulness fixed; restyle listed).
- Broker remains unsupported and unlisted (decision recorded in the remaining plan).
- An independent inspector still has no account until approval; this is a backend contract.

## 7. Files (high level)
New: `src/utils/authIntent.ts`, `src/components/onboarding/{roles.ts,validation.ts,fields.tsx}`, `src/components/auth/PremiumAuthShell.d.ts`, tests listed above, `evidence/identity/*`.
Rewritten: `PremiumAuthShell.jsx`, `OnboardingFlow.tsx`, `LoginPage.jsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`, `AuthModal.tsx`, `authRoutes.ts` (`getPostAuthPath`, `safeRedirectPath`).
Edited: `App.tsx`, `AuthContext.tsx`, both `AdminLayout.tsx`, `AuctionLivePage.jsx`, `SellPage.tsx`, `InspectionsView.tsx`, `ProviderApplicationModal.tsx`, `DealerOnboarding.jsx`, `index.css`, six validators, lockfiles.
Removed: `src/pages/register/components/*`.
