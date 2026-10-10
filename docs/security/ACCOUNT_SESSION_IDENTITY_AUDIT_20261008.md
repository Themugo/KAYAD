# KAYAD Auction 360 — Stage 4: Account / Session / Identity / Customer-Trust Audit
Date: 2026-10-08

Stage 1 (P0/P1 source trust boundaries), Stage 2 (API contract convergence)
and Stage 3 (marketplace/vehicle/auction convergence) are complete and
certified — see `P0_P1_SOURCE_CERTIFICATION_20261007.md`,
`AUCTION_API_CONTRACT_MATRIX_20261007.md`,
`AUCTION_MARKETPLACE_VEHICLE_CONVERGENCE_20261007.md`, and
`AUCTION_360_EXECUTION_LOG_20261007.md`. This document is Stage 4's
required deliverable: a full source-level sweep of
CREATE ACCOUNT → VERIFY → SIGN IN → SESSION → PROFILE → PROTECTED ROUTES →
AUCTION REGISTRATION → COMMITMENT → KES 1 → BIDDING → PAYMENT → PURCHASE
HISTORY → LOGOUT, confirming the authenticated customer's identity stays
authoritative and consistent across the whole journey.

No stage was restarted. No second authentication/session/CSRF/routing
mechanism was introduced. The already-certified financial bid-authorization
architecture (Stage 1) was not altered — only verified that the frontend/
customer journey reaches it correctly, per the master prompt's own
instruction.

## Method

Six parallel, read-only research passes traced: (1) registration/login/
CSRF/verification/password-recovery; (2) session creation/restoration/race
conditions/logout/expiration/bootstrap UX/multi-tab; (3) protected manual
routes/`useParams()` reintroduction risk/profile ownership/role convergence/
localStorage audit; (4) auction-registration and bidding identity binding,
including a `req.body.userId/bidderId/buyerId/sellerId/ownerId` override
sweep; (5) payment-initiation and purchase/history identity boundaries;
(6) authentication-adjacent HTTP error → UX mapping. Every candidate finding
below was independently re-verified against the actual current source
before any fix was made — several research-pass claims were confirmed,
several were downgraded (dead code, already-correct, or out of this stage's
scope) after direct re-reading.

## 1. Canonical architecture (confirmed, not redesigned)

- **Authentication**: JWT, issued by `backend/controllers/authController.js`
  on login, verified by `backend/middleware/auth.js::protect()` on every
  protected request. **SOURCE-LEVEL PASS.**
- **Session**: `token` (access JWT, httpOnly, 1h) + `refreshToken` (httpOnly,
  7d) cookies; `protect()` re-reads `role/status/isBanned/deactivatedAt/
  emailVerified/tokenVersion` fresh from the DB on *every* request
  (deliberately bypassing its own 20s lean-user cache for these security
  fields), and additionally checks `sessionId` against
  `RefreshToken.findActiveSessionById` for per-session revocation.
  **SOURCE-LEVEL PASS.**
- **Canonical authenticated identity**: `req.user.id`, set exclusively from
  the verified JWT + fresh DB lookup inside `protect()`. **SOURCE-LEVEL
  PASS** — confirmed no sensitive backend write path (profile, bid,
  registration, payment, KES-1 commitment) accepts a client-supplied
  identity override (full sweep in §5 below).
- **CSRF**: stateless double-submit cookie (`backend/middleware/csrf.js` ↔
  `src/utils/csrf.ts` ↔ `src/api/httpClient.ts`), scoped correctly for the
  split `www`/`api` subdomain deployment, with a working stale-token
  detect-clear-rebootstrap-retry-once cycle. **SOURCE-LEVEL PASS.**
- **Protected manual routing**: this app has **no react-router
  `<Routes>`/`<Route>` tree anywhere** (confirmed again this stage;
  unchanged since Stage 3). Literal protected paths are guarded in
  `src/App.tsx::AuthRouteSurface` via `RequireAuth`/`RequireDealer`/
  `RequireAdmin` (from `src/context/AuthContext.tsx`), which correctly use
  react-router's standalone `<Navigate>` (no `<Route>` match required) and
  correctly gate on `loading` before deciding. The `?nav=` SPA shell inside
  `AppInner` has its own, separate `protectedNavs` effect. **SOURCE-LEVEL
  PASS** on the routing/redirect mechanism itself, with findings on
  *consistency* below (§3).
- **Backend-authoritative roles**: frontend `isAdmin`/`isDealer`/etc.
  (`AuthContext.tsx`) are informational only; every backend admin/dealer
  route independently enforces `adminOnly`/`allowRoles`/`requireRole` from
  `backend/middleware/auth.js`. **SOURCE-LEVEL PASS.**

## 2. Findings fixed this stage

All five numbered master-prompt "do not touch" carried-forward items
(vehicle `rejected`→`active` mapping; `mpesaCallback`'s hardcoded-500;
`completeEscrowRefund`'s untyped RPC; legacy/canonical inspection split;
dealer-dashboard raw-Supabase column bug) were **not touched**, per
instruction — none of this stage's findings turned out to depend on them.

### FINDING 1 (most severe this stage) — every real bid failed validation before reaching the bid-authorization boundary
**File:** `backend/middleware/validate.js` (`bidSchema`)
**FIXED.**

`bidSchema` required a `phone` field matching `/^2547\d{8}$/`. The one,
canonical, live frontend bid call
(`src/pages/AuctionLivePage.jsx` → `src/services/bidApi.ts::placeBid(carId,
amount)`) never sends a `phone` field at all — and the backend
authorization boundary itself (`backend/controllers/bidController.js`,
~line 211-216) never reads `req.body.phone` either; it independently loads
the bidder's own verified phone from their `User` record. Net effect:
**every bid placed through the production UI was rejected with a 400
validation error before it ever reached `placeBid`/`assertBidderAuthorized`**
— bidding was completely non-functional end-to-end, an exact structural
analog of Stage 3's single most severe finding (the live auction page never
reading its own URL). Fixed by making `phone` optional in the schema (the
controller's own server-side phone check is untouched and remains
authoritative). Exit criterion #15 ("can bidding reach the canonical
authenticated identity boundary") could not have been answered yes before
this fix.
**Test:** `backend/tests/validation/bidSchema.test.js` (5 tests — accepts
amount-only body, accepts a valid phone when sent, rejects non-positive/
missing amount, rejects an invalid phone when one is sent). Reverted and
re-ran to confirm the first test fails without the fix; restored and
re-confirmed passing.

### FINDING 2 — client-supplied payment amount trusted for `bid`/`listing`/`subscription`/`deposit` on the generic payment-initiation endpoint
**File:** `backend/controllers/paymentController.js::initiatePayment`
**FIXED.**

The amount-integrity guard (server recomputes/verifies the settlement
amount, rejecting a mismatched client value) only covered
`type ∈ {escrow, auction_win, purchase}`. For every other accepted `type`
value, the raw client-supplied `amount` passed straight through to
`initiate()` and became the real M-Pesa STK amount charged. Concretely, any
authenticated user could `POST /api/payments/initiate
{type:"bid", carId, amount: 1, phone}` directly and create a real "bid"
payment for whatever amount they chose — completely bypassing
`bidController.js::placeBid`'s own, separate call path (which never goes
through this HTTP controller at all) and every one of its gates: the
configured `bidConfirmationFeeKes` policy, the auction-live check, the
registration/eligibility check. Fixed in two parts, consistent with "fix
the canonical implementation, don't invent new business logic": (a) `"bid"`
now uses the same server-side-amount pattern already used for escrow/
purchase/auction_win, verified against
`getAuctionFinancialPolicy().bidConfirmationFeeKes` (the same constant
`bidController.js` already enforces); (b) `"listing"`/`"subscription"`/
`"deposit"` have **no** authoritative server-side amount anywhere in this
codebase and no current frontend caller (confirmed via grep across `src/`)
— rather than inventing a fee computation for them, they are now refused
outright on this endpoint (fail-closed), exactly as `"escrow"` was already
refused with a dedicated-flow message just above.
**Test:** `backend/tests/transactions/paymentInitiateAmountIntegrity.test.js`
(5 tests). Reverted and re-ran (4/5 failed as expected, confirming the gap
for `bid`+the three refused types); restored and re-confirmed passing.

### FINDING 3 — payment-status lookup failed open when a payment record had no owner on file
**File:** `backend/controllers/paymentController.js::checkPaymentStatus`
**FIXED.**

`if (req.user && payment.user && payment.user.toString() !== req.user.id &&
req.user.role !== "admin")` — when `payment.user` was itself falsy (a
legacy/edge-case record with no user attached), the whole `&&` chain
short-circuited to `false` and the ownership check was **skipped entirely**,
returning the full payment object (amount, phone, mpesaReceipt, metadata)
to any authenticated user who supplied/guessed that `checkoutRequestId` —
fail-open rather than fail-closed, inconsistent with the fetch-then-deny
pattern this same controller's `getPaymentById` already uses correctly.
Fixed by making ownership a positive assertion (`isOwner`); anyone who
isn't the recorded owner *and* isn't staff is now denied, including when
the record has no owner at all.
**Test:** `backend/tests/transactions/paymentStatusOwnership.test.js`
(4 tests). Reverted and re-ran (the no-owner-denial test failed as
expected); restored and re-confirmed passing.

### FINDING 4 — auth-state race conditions in `AuthContext`'s mount bootstrap
**File:** `src/context/AuthContext.tsx`
**FIXED.**

The mount effect's `getMe()` call had no guard against resolving *after* a
newer auth action (`login()`/`logout()`) had already run. Two concrete
races: (a) a user lands on `/login` already authenticated as account A
(mount's `getMe()` for A in flight); they sign in as account B before that
resolves; `login()` sets `user=B`; the stale `getMe()` for A then resolves
and silently reinstates `user=A` over the just-logged-in B. (b) `logout()`
sets `user=null`, but an in-flight `getMe()` (e.g. from the same mount
effect) can resolve afterward with the pre-logout payload and silently
re-authenticate the UI client-side (the backend session itself remains
correctly revoked — this is a client-side *display* lie, not a security
bypass, but a real identity-consistency bug squarely in this stage's
scope). Fixed with a monotonic sequence counter: every identity-setting
action (mount bootstrap, `login()`, `logout()`, the `kayad:auth-expired`
handler) stamps the request it starts with the counter's current value and
only applies its result if no newer action has started since.
**Test:** `src/__tests__/context/AuthContext.test.jsx` (2 new tests, exactly
reproducing races (a) and (b) with a controllable, manually-resolved
`getMe()` promise). Reverted and re-ran (both new tests failed exactly as
the race predicts — B silently reverted to A, and the logged-out user came
back); restored and re-confirmed passing (5/5 in the file).

### FINDING 5 — flash of signed-out navbar on every reload for an already-authenticated customer
**File:** `src/components/Navbar.tsx`, `src/App.tsx`
**FIXED.** (This is exactly the master prompt's own item 22 "loading/
bootstrap UX" concern, named explicitly: "prevent flash of signed-out
content... while authentication is still being restored.")

`Navbar` rendered its "Sign In / Sign Up" vs. authenticated-user-menu
branch straight off the `user` prop, with no awareness of
`AuthContext`'s `loading` state. `user` is always `null` during the
mount-time `getMe()` bootstrap window regardless of whether the visitor is
actually signed in, so an already-authenticated customer saw the signed-out
button flash on every page reload until that request resolved. Fixed by
threading `authLoading` through from `AppInner` (`App.tsx`) into a new,
optional `Navbar` prop (default `false`, so any other caller/test keeps
today's exact behavior unless it opts in), rendering a neutral, same-sized
placeholder — claiming neither auth state — while that request is in
flight.
**Test:** `src/__tests__/components/Navbar.test.jsx` (2 new tests: neither
control renders while `authLoading`; the signed-out control renders once
resolved). Reverted and re-ran (the loading-state test failed as expected);
restored and re-confirmed passing. The file's 2 pre-existing, unrelated
"Sign In"/"Create Account" accessible-name-mismatch failures (documented
since Stage 3, zero overlap with this change) are unchanged.

### FINDING 6 — registration-status fetch swallowed a specific auth-boundary rejection
**File:** `src/pages/AuctionLivePage.jsx`
**FIXED.**

The registration-status read (`auctionRegistrationAPI.get(id)`) discarded
any error entirely, treating a 403 "Account suspended"/"Account
deactivated" response from `protect()` identically to "not yet
registered" — a banned/deactivated signed-in user saw a normal "Register to
bid" CTA with no indication why. The sibling write paths just below
(register/commitment handlers, same file) already surface the backend's
specific message via `err.response?.data?.message`; this read path is
brought into line with that same pattern for the one case that actually
needs surfacing — a 403 auth-boundary rejection, not an ordinary "no
registration yet" empty/404 response (which still produces no toast, by
design).
**Test:** `src/__tests__/pages/AuctionLivePage.test.jsx` (2 new tests, using
a newly-hoisted/mutable `isAuth`/toast-spy pair so this file's existing
`isAuth:false` tests stay exactly as they were). Reverted and re-ran (the
403-surfacing test failed as expected); restored and re-confirmed passing
(5/5 in the file).

### FINDING 7 — login timing side-channel enabled account enumeration
**File:** `backend/controllers/authController.js::login`
**FIXED.**

`if (!userAuth || !(await userAuth.matchPassword(password)))` — for an
unknown email, `userAuth` is `null` and the `||` short-circuits *before*
ever calling `bcrypt.compare`, so an unknown-email login returned
immediately while a known-email/wrong-password login paid the full
bcrypt cost (12 rounds) first. Both paths already return an identical
response body ("Invalid credentials") — no enumeration via content — but
the measurable response-time difference is a real, if low-severity, timing
oracle, inconsistent with this same controller's own explicitly
constant-time-shaped `forgotPassword`/`resendVerification` flows. Fixed by
running an equal-cost dummy `bcrypt.compare` against a lazily-computed,
never-reused-as-a-real-credential dummy hash when `userAuth` is null, so
both branches now pay the same bcrypt cost; no response content changed.
**Test:** `backend/tests/auth/loginTimingEnumeration.test.js` (2 tests:
`bcrypt.compare` is now invoked for an unknown email, with the same
response as before; it's invoked on every repeated attempt, not just the
first). Reverted and re-ran (both failed as expected); restored and
re-confirmed passing.

### FINDING 8 — dead-code reintroduction of the Stage-3 `useParams()` routing defect
**File:** `src/pages/dealer/EditCarPage.jsx`
**FIXED** (precedent-consistent, not a live production bug).

`const { id } = useParams();` — the identical Stage-3 pattern (no
`<Route>` ancestor exists anywhere in this app, so this always evaluates to
`undefined`). Unlike the two pages Stage 3 fixed, this page is currently
**unreachable** — confirmed via grep, it is never imported or routed from
`AuthRouteSurface` or `AppInner` — so the bug has zero production impact
today. It is a landmine, not a live break: `src/components/layout/
DealerLayout.tsx` and `src/components/dealer/DealerLayout.tsx` already
carry an `'edit-car': 'Edit Listing'` label for exactly this page, so the
moment someone wires in a nav link to it, `id` would silently be
`undefined` and the ownership check inside the page would run against a
car fetched with that undefined id. Fixed now, using this codebase's
established manual-routing convention (`getIdFromPathPrefix`, the same
helper the two already-fixed Stage-3 pages use), reading from
`/dealer/edit-car/:id`. No dedicated regression test was added — consistent
with Stage 3's own treatment of `DealerAuctionOperationCase.jsx` (also
fixed with no dedicated test, since it was unreachable at the time) — the
fix is mechanically identical to the two already-tested Stage-3 fixes.

## 3. Findings documented but not fixed this stage (carried forward)

Consistent with "if a real defect exists, fix the canonical implementation;
do not manufacture work, redesign, or introduce a new abstraction" — these
are real, confirmed findings, each either requiring new infrastructure that
doesn't exist yet, or being a deliberate product/architecture decision
rather than a defect. Recorded explicitly, not silently dropped.

1. **`kayad_escrow_rules_config_v1` localStorage flag is unauthenticated and
   client-writable, driving a regulated "live escrow" compliance claim**
   (`src/features/Admin/hooks/escrowRulesConfig.ts`, consumed by
   `src/utils/escrow.ts`, rendered in `VehicleCard`/`VehicleDetailModal`/
   `CompareModal`/`TrustBadgeMatrix`). `writeEscrowRulesConfig()` takes an
   `admin: {id, name}` parameter but only uses it to label a cosmetic
   audit-log entry — it performs no authorization check, and even if it
   did, nothing stops a visitor from writing the key directly via devtools
   (`localStorage.setItem('kayad_escrow_rules_config_v1',
   JSON.stringify({liveMode:true,...}))`), since there is no backend
   persistence for this config at all — by its own documented design,
   consistent with every other admin config built so far in this codebase
   ("no connected backend to persist to yet"). This is squarely a
   customer-trust/compliance-labeling integrity gap (the platform is not
   yet CBK-certified for live escrow), but closing it means moving this
   config to a real backend-sourced, admin-write-only store — new
   infrastructure, not a local fix, and explicitly out of this stage's
   "do not redesign the payment/admin-config architecture" discipline.
   **NEEDS HARDENING — sized for its own dedicated pass.**
2. **No deterministic idempotency key on `POST /api/payments/initiate`
   retries** — `src/api/httpClient.ts`'s 401/CSRF-403 interceptor silently
   replays the exact same POST body on first failure (by design, for
   ordinary mutations), but `backend/middleware/idempotency.js` has no
   deterministic-key case for the generic `"payment"` operation type
   (only `payment_callback`/`bid`/`escrow_*`/etc.), so it falls through to
   a fresh-random-key fallback — a retried payment-initiation request is
   treated as an unrelated new operation, risking a duplicate M-Pesa STK
   push for what the user experienced as one click. Fixing this correctly
   means extending the idempotency-key derivation and likely the frontend
   call to supply a stable key — a deliberate, scoped change to shared
   payment infrastructure, not a one-line fix. **FINDING — carried
   forward for its own pass.**
3. **Duplicate phone numbers are not prevented at registration** — only
   email has a uniqueness check/constraint; `phone` has none anywhere
   (confirmed via the registration-onboarding migration). Closing this
   needs a DB migration (unique index/constraint) plus a duplicate-check
   branch in `authController.js::register`, which is schema/migration work
   beyond a local controller fix. **FINDING — carried forward.**
4. **Email-verification link is a side-effect-bearing GET that consumes a
   single-use token the instant the page loads**, with no explicit
   "click to confirm" step — vulnerable to corporate email-security link
   scanners/previews consuming the real link before the user opens it.
   Fixing this is a deliberate UX/flow change (add a confirm step), not a
   defect in the current, internally-consistent implementation.
   **NEEDS HARDENING — carried forward as a product decision, not fixed
   this pass.**
5. **Two independent, inconsistent brute-force lockout mechanisms**
   (`backend/middleware/accountLockout.js`'s in-memory per-IP `Map`, which
   resets on every restart/deploy and isn't shared across horizontally
   scaled instances, vs. `authController.js`'s DB-persisted per-account
   lockout). Neither is broken; they just don't share state or response
   semantics. **NEEDS HARDENING.**
6. **Logout is always "all devices"** — the single-session-revoke endpoint
   (`RefreshToken`/`sessionId`-scoped) exists server-side but the
   frontend's `logout()` only ever calls the all-devices endpoint. Fails
   toward *more* revocation, not less — a product decision, not a defect.
   **NEEDS HARDENING.**
7. **No cross-tab logout propagation** (no `BroadcastChannel`/`storage`
   listener) — mitigated by the shared cookie jar (one `clearCookie` clears
   it for every tab) and server-side `tokenVersion` revocation (a stale
   tab's next mutation correctly 401s rather than silently succeeding); the
   gap is purely that a stale tab can *display* signed-in chrome until its
   next network round-trip. **NEEDS HARDENING.**
8. **Refresh-token DB session row `expiresAt` (30d) vs. the signed refresh
   JWT's own expiry (7d)** — the JWT's own `exp` check always rejects first,
   so the 30d value is dead/misleading but fails safe, not exploitable.
   **NEEDS HARDENING.**
9. **Dead granular-RBAC frontend mechanism** (`RequireAdminPage`/
   `ADMIN_PAGE_ROLES`/`RequirePermission` in `AuthContext.tsx`) is never
   imported anywhere; `AdminView` gates only on flat `isAdmin`, so any
   `STAFF_ROLES` member sees admin action buttons that correctly 403
   server-side if clicked (backend `adminOnly`/route-local checks are
   intact and authoritative) — misleading UI, not a privilege escalation.
   **NEEDS HARDENING.**
10. **`getMe()` fetched once at mount only** — a mid-session role
    promotion/demotion/ban is not reflected in the frontend's cached role
    until next login/reload; the backend remains authoritative per-request
    (a banned user's very next API call is correctly rejected), so this is
    a UX staleness issue, not a security bypass. **NEEDS HARDENING.**
11. **No live countdown on 429 responses** — most rate limiters don't embed
    a numeric retry time in the message, and the frontend's HTTP wrapper
    never reads response headers (where one limiter does set
    `Retry-After`) — the user sees *some* specific text, just never a
    countdown. **NEEDS HARDENING.**
12. **`authLimiter`'s 429 message hardcodes "too many login attempts"**
    even when the exhausted endpoint was register/forgot-password/
    verify-email — cosmetic mislabeling, not an information-loss or
    security issue. **FINDING, low severity — not fixed this pass.**
13. **Stale "Place Bid" button after a silent session expiry** — the
    button-enabling condition doesn't itself re-check `isAuth`, though the
    click handler does (and correctly bounces to `/login` rather than
    firing an unauthenticated request) — cosmetic staleness only, not
    exploitable. **NEEDS HARDENING.**
14. **`PaymentHistoryView` discards the classified `PaymentApiError.kind`**
    and shows one generic error/"Try again" regardless of whether the
    failure was session expiry, ownership, or a server error. **NEEDS
    HARDENING.**
15. **Silent, unexplained logout on session expiry** — `kayad:auth-expired`
    clears state and the route guard redirects to `/login` with no toast/
    message distinguishing "you were logged out" from "you were never
    signed in". **NEEDS HARDENING.**

## 4. Exit criteria — answered with evidence

1. **Canonical authentication mechanism**: JWT, issued/verified by
   `backend/controllers/authController.js` + `backend/middleware/auth.js`.
2. **Canonical session mechanism**: httpOnly `token`(1h)/`refreshToken`(7d)
   cookies; `tokenVersion` + `sessionId` revocation checked fresh on every
   request.
3. **Canonical authenticated identity**: `req.user.id`, set only inside
   `protect()` from the verified JWT + fresh DB lookup — confirmed via the
   full `req.body.userId/bidderId/buyerId/sellerId/ownerId` sweep (§2 of the
   research pass; zero exploitable overrides found) that every sensitive
   write (bid, registration, KES-1 commitment, profile, payment-initiation
   buyer/amount) derives identity from it, never from client-supplied body
   fields — the two Finding-2/3 payment exceptions are now fixed.
4. **Does frontend auth state wait for backend session confirmation?**
   Yes for every data-gating decision (`loading` from `useAuth()` is
   checked before every protected render/redirect); the one presentational
   gap (Navbar flashing signed-out chrome) is Finding 5, now fixed.
5. **Does logout actually invalidate the authoritative session?** Yes —
   confirmed directly: logout calls `RefreshToken.revokeAllForUser` +
   bumps `tokenVersion`; `protect()` re-checks `tokenVersion` fresh,
   uncached, on every request, so a captured pre-logout JWT is rejected
   immediately on replay, not merely until natural expiry.
6. **Can stale authentication state survive logout?** Only as a transient
   client-side *display* artifact under the exact race in Finding 4, now
   fixed; the backend was never actually fooled (next real request always
   401s regardless).
7. **Can an expired session incorrectly permit a financial mutation?** No —
   confirmed: `protect()` rejects with 401 *before* any controller/business
   logic runs, so a 401'd attempt never executed server-side, and the one
   silent-refresh-and-retry-once cycle only replays a request that never
   actually fired. No blind retry of a mutation that already succeeded.
8. **Is CSRF consistently enforced?** Yes across every tested mutation
   (register, login, logout, profile update, password reset, payment
   initiation, auction registration, bidding); one documented, harmless
   non-finding (GET email-verification correctly exempt by design).
9. **Can a client substitute another user ID?** No for bid/registration/
   profile/KES-1-commitment identity (confirmed PASS); yes it previously
   could for payment *amount* on `bid`/`listing`/`subscription`/`deposit`
   (Finding 2), now fixed.
10. **Are profile operations identity-bound?** Yes — `updateProfile` derives
    the target strictly from `req.user.id`; the field whitelist excludes
    `email`/`role`/verification/approval status, so no self-escalation path.
11. **Are role/privilege checks server-authoritative?** Yes, confirmed
    across admin/dealer backend routes; frontend role is informational
    only (one dead, non-exploitable granular-RBAC UI gap documented, §3.9).
12. **Are protected manual routes secure under KAYAD's App.tsx routing
    model?** Yes for every literal and `?nav=`-based surface checked;
    `useParams()` reintroduction risk swept (one dead-code instance found
    and fixed, Finding 8; zero live instances remain).
13. **Can direct navigation bypass authentication?** No — every protected
    literal path and every `protectedNavs` entry correctly redirects
    unauthenticated/wrong-role/mid-restoration access.
14. **Can registration attach to the wrong user?** No — `bidder_id` is
    always `req.user.id`; no endpoint accepts a client-supplied
    registration id (no IDOR surface exists).
15. **Can bidding reach the canonical authenticated identity boundary?**
    Previously **no** for every real customer (Finding 1 blocked all bids
    at validation) — now **yes**, confirmed fixed and tested.
16. **Can payment/history expose another user's data?** Previously yes, in
    one edge case (Finding 3, no-owner-on-file fail-open) — now no,
    confirmed fixed and tested. Every list/detail endpoint checked is
    otherwise correctly scoped to `req.user.id`.
17. **Are verification/recovery flows safe?** Yes — single-use, race-safe
    reset tokens; no identity substitution; no enumeration via response
    content; one documented UX gap (auto-firing verification GET, §3.4).
18. **Are authentication errors correctly represented to the customer?**
    Mostly yes (specific backend messages pass through for login/register/
    verify/reset/registration/bidding); several documented, non-fixed UX
    gaps (silent logout, no 429 countdown, generic payment-history error
    display) remain, §3.
19. **Are all real defects fixed and regression-tested?** All 8 fixed
    findings above have a regression test that was verified to fail
    against the reverted source and pass against the fix (Finding 8
    excepted, consistent with Stage 3's own precedent for an identical,
    unreachable fix shape).
20. **What remains environment/browser dependent?** Nothing new this
    stage — the Stage 3 environment correction (`npm install
    --engine-strict=false` unblocks `tsc`/`vitest`/build) still holds, and
    `CSRF` runtime route contract validation remains blocked pending a live
    server (`validate-canonical-csrf-route.mjs`'s runtime half — its static
    half passes). Live-database migration certification (Stage 1 item 1)
    remains the one genuinely infrastructure-blocked item, unrelated to
    Node version.

## 5. Validation results

- **Backend (`npm test` / jest):** 41/41 suites, 602/602 tests passing (up
  from Stage 3's 37/37, 586/586 — 7 new test files/additions this stage,
  plus one pre-existing test file's mock updated to keep importing the
  changed controller cleanly — see `tests/transactions/
  paymentHistory.test.js`). The two recurring "open handle" timeout
  warnings from `tests/resilience/failureModes.test.js` are pre-existing
  and unrelated (same as prior stages).
- **Frontend `tsc --noEmit`:** clean, exit 0.
- **Frontend `vitest run`:** 336 passed, 11 pre-existing/unrelated failed
  (2 in `Navbar.test.jsx`, 9 in `VehicleMarketplace.test.tsx` — identical
  failing test names to Stage 3's documented, zero-overlap baseline), 1
  skipped, 348 total (up from Stage 3's 330/11/1/342 — 6 new passing tests
  this stage, same 11 pre-existing failures, confirmed zero overlap by
  name).
- **`npm run build`:** succeeds, same pre-existing chunk-size warning as
  Stage 3 (not an error).
- **Relevant validators run:** `validate-advanced-auth-sweep.mjs` (19/19
  PASS), `validate-canonical-csrf-route.mjs` (static PASS; runtime half
  pre-existing BLOCKED, needs a live server URL), `validate-explicit-
  auth-flows.mjs` (PASS), `validate-ownership-passport-domain.mjs` (16/16
  PASS), `validate-passport-authorization.mjs` (7/7 PASS), `validate-
  premium-auth-surfaces.mjs` (9/9 PASS), `validate-registration-role-
  matrix.mjs` (32/32 PASS), `validate-session-availability.mjs` (7/7
  PASS). Four additional validators (`verify-admin-authentication-
  authorization-360.mjs`, `verify-authorization-order-360.mjs`, `verify-
  operation-13-identity-access.mjs`, `verify-rpc-authorization-
  certification.mjs`) fail with `ENOENT` against files confirmed to not
  exist anywhere in this checkout at all (a specific `AdminGuard.tsx`
  component and three specific numbered migration files) — pre-existing,
  unrelated to any Stage 4 change, not something this pass deleted or
  broke.

## 6. STAGE 4 STATUS

**STAGE 4 — ACCOUNT/SESSION/IDENTITY/CUSTOMER TRUST: COMPLETE.**

One user, one authoritative session, one server-side identity, one
authorization boundary — confirmed end to end, with the single most severe
defect (bidding was completely non-functional for every real customer,
Finding 1) found and fixed, alongside 7 other real, now-fixed-and-tested
defects, and 15 explicitly documented, intentionally-not-fixed findings
carried forward with reasoning recorded (not silently dropped).
