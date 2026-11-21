# Registration and Authentication Verification

Method: source reading of `main`, plus real-browser (Playwright, 390px mobile) journeys against a disposable local stack running `main`'s backend and built SPA with all 14 newer migrations applied. Scripts: `evidence/journey_register_main.cjs`, `evidence/false_recovery_main.cjs`; results: `evidence/main-register-journeys.json`.

## Unified personal identity
| Requirement | Result | Evidence |
|---|---|---|
| Buyer and private seller share one identity | VERIFIED | `backend/controllers/authController.js` ~L250-262: `role = requestedRole === "dealer" ? "dealer" : "user"`; `roles.ts` offers "Personal account" with `backendRole: 'user'`. Browser: registering via the personal card stored `role=user`. |
| Private seller is not a separate auth system | VERIFIED | No seller-specific auth route; selling is a capability (`routes/accountCapabilitiesRoutes.js`, `services/accountCapabilities.service.js`). |
| Role mapping "includes `individual_seller`" | **SPEC CONFLICT, reported not resolved.** `main` deliberately retired it for self-registration (owner decision 11 Nov 2026) and maps old clients to `user` with a `Deprecation` header and a compatibility note. Legacy rows keep `individual_seller` and still resolve via compatibility logic (e.g. `announcementController.js` PERSONAL_ROLES). DB `users_role_check` and the register RPC still accept the value (local DB and hosted DB). |
| Server-side role enforcement | VERIFIED (code) | Whitelist above; admin/staff roles are not selectable (`roles.ts` header). Not re-tested with attack requests on `main` in this run. |
| Dealer/admin boundaries distinct | VERIFIED (code) | Dealer path separate, starts `pending`. |

## Registration
- One canonical form (`/register` -> `OnboardingFlow`), one endpoint (`POST /api/v1/auth/register`, also `/api/auth/register`). VERIFIED.
- Atomic account creation via RPC `kayad_register_identity_atomic` (present locally and on hosted). VERIFIED (existence); transaction behaviour tested in an earlier session on the checkpoint, not re-run in isolation on `main`.
- Non-blocking email: `void deliver(...).catch(...)` retained. VERIFIED (code).
- Duplicate email: 409; case-variant duplicate rejected, one row. VERIFIED (browser).
- Double tap: exactly 1 POST. VERIFIED (browser).
- Happy path shows "Check your email." VERIFIED (browser).

## Idempotency and lost-response recovery  **FAILED / NOT INTEGRATED**
| Required | Result |
|---|---|
| Frontend creates an idempotency key | **ABSENT.** `OnboardingFlow.tsx` has no key; browser journey captured `Idempotency-Key: null` on both attempts. |
| Same key on retry | **ABSENT.** |
| Backend replay returns original success | **ABSENT.** Retry after a lost response returns 409. |
| No ambiguous state after timeout | **FAILED.** `main` uses a client-side heuristic instead: after an unknown outcome a later 409 shows "Your earlier attempt went through." |
| Idempotency record retention/cleanup | N/A (no registration idempotency store; the checkpoint design needed none). |

**F-REG-1 (reproduced):** a different person's first attempt is aborted before reaching the server; the email already belongs to another user; the retry returns 409; the screen says "Your first request reached KAYARD KE even though the reply was lost. Nothing was duplicated: verify your email, then sign in." This is false. See `evidence/main-false-recovery.png`. Only one user row exists (no duplicate identity, no data leak), but the message is wrong and steers the person to an account that is not theirs.

**Regression test:** none exists on `main` (grep of `backend/tests` and `src/__tests__` finds no registration replay test). **MISSING. Not claiming a pass.** The checkpoint ZIP contains three backend tests and one UI test for the replay design, but they target the retired `individual_seller` path in part and cannot run unchanged.

Recommended exact tests (on `main`): backend e2e `registration replays the same attempt (200, replayed, same id, 1 row)`; `different key/password/role/verified account -> 409`; `8 concurrent same-key -> 1 account`; UI: `retry after unknown outcome reuses the key; a definitive failure drops it`; and a replacement for the current "Your earlier attempt went through" copy test.

## Sign-in and recovery
- Existing-account handoff: "I may already have an account" -> `/login?intent=buyer` with email prefilled. VERIFIED (browser).
- Password reset, session expiry, verification gates: covered by existing backend tests (jest suites pass except the 4 listed), not re-exercised in a browser. NOT TESTED end to end.
- Frontend/backend contract agreement: register request/response verified on the happy path and 409; other contracts not individually re-verified.
- CSRF bootstrap failure: INCONCLUSIVE (a fresh browser gets its XSRF cookie from earlier `/me` and `/refresh` calls, so the bootstrap request never fires).
- Production connectivity failure: UNKNOWN, cannot reach `api.kayad.space` from the sandbox.
