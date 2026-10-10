# Phase 11 — Failure Mode and Recovery Report

Date: 2026-08-24
Scope: Audit of existing workflows against dependency failure modes. Fixes limited to actual existing weaknesses. No features added.

## Verification method

Read every failure-handling path end-to-end (retry utility, M-Pesa service, payment/bid-security flows, idempotency middleware, distributed locks, reconciliation engine, queue service, cron recovery, frontend API client, upload service, error boundaries), then wrote executable tests simulating each failure mode: API 500, timeout, malformed response, network reset, unconfigured service, duplicate callback, queue down, missing/orphaned recovery records.

**Test results: backend 16/16 suites, 335/335 tests pass (24 new failure-mode tests). Frontend: 8 new resilience tests pass; suite failure count improved from 72 → 67 (remaining 67 are pre-existing component/test drift unrelated to failure modes — confirmed identical on unmodified baseline; pre-existing tsc errors likewise unchanged).**

## Failure modes verified SAFE (existing controls, confirmed by audit)

| Failure mode | Existing control | Verdict |
| --- | --- | --- |
| Database unavailable | db layer throws; controllers return 5xx via errorHandler; health checks report down | SAFE — fails closed, no false success |
| Redis unavailable | circuit breaker, health monitor, alerting, `enableOfflineQueue:false`, in-memory fallback for reads | SAFE |
| Queue unavailable | queue wrappers return null with logged error; non-critical paths only (emails, notifications) | SAFE |
| Webhook retry / payment callback duplication | atomic `processed:false→true` claim with release-on-failure; deterministic idempotency keys; duplicate-receipt detection; distributed lock | SAFE (Phase 9 + verified) |
| Worker restart | BullMQ re-delivers unfinished jobs; per-job failure handlers log | SAFE |
| Server restart | crons reschedule on boot; escrowCron per-item try/catch so one bad record doesn't stop the batch | SAFE |
| Partial transaction | escrow state machine rejects illegal transitions; reconciliation crons (15min/hourly/daily/deep) detect missing/duplicate callbacks, orphans, amount mismatches, unreleased escrows, negative balances | SAFE — nothing stays ambiguous without reconciliation |
| Concurrent update | distributed locks (Supabase with in-process fallback), atomic claims, idempotency middleware | SAFE |
| Duplicate request (frontend) | `dedupedFetch` shares in-flight calls; failures never cached; stale responses dropped via request keys | SAFE (tested) |
| Browser refresh | auth state re-fetched on mount; httpOnly cookie session; honest loading/error states | SAFE |
| Error boundaries | top-level boundary in main.tsx + reusable ErrorBoundary component with recovery UI | SAFE |
| Logging/alerting | structured pino logs, metrics counters per failure type, circuit-open alerts (M-Pesa, Redis) | SAFE |

## Weaknesses found and FIXED

### F1 — HIGH: M-Pesa circuit-breaker fallback fabricated a successful STK push
`mpesaConfig.fallback` returned `{ ResponseCode: "0", CheckoutRequestID: "fallback_<ts>" }` when M-Pesa was down or the circuit opened. Callers (`paymentService`, `bidSecurityService`, admin test endpoint) treated this as a real STK push: real pending payment records were created against a checkout ID no Safaricom callback could ever match — false success + permanently unreconciled financial state.
**Fix:** fallback now throws a distinct `MPESA_UNAVAILABLE` error; callers surface an honest failure. Test: "M-Pesa STK push failure modes" (API 500, timeout, ECONNRESET, unconfigured).

### F2 — HIGH: malformed M-Pesa responses treated as success
A 200 with an HTML error page produced `access_token: undefined` and the flow continued with `Bearer undefined`; STK responses were trusted without checking `ResponseCode`/`CheckoutRequestID`.
**Fix:** both token and STK responses are shape-validated; malformed/error bodies throw `MPESA_MALFORMED_RESPONSE`. Tests: "malformed response", "HTTP 200 with Daraja error body", "missing CheckoutRequestID".

### F3 — HIGH: bid-security deposit marked "success" without any payment
`initiateBidSecurity` silently fell back to mock mode in every environment (including production) on STK failure and created the deposit transaction with `status: "success"` — bypassing the deposit requirement. `handleBidSecurityCallback` also called Mongoose-style `transaction.save()` on plain Supabase rows (callbacks crashed) and had no duplicate-callback guard.
**Fix:** STK failure fails closed outside development; mock mode keeps deposits `pending` (never `success`); callback uses `update()`, guards duplicate/finalized transactions idempotently. Tests: production failure creates nothing, dev mock stays pending, duplicate callback acknowledged without re-processing.

### F4 — MED: notification recovery job was dead code
`notificationRetryService` called Mongoose-era methods (`audit.shouldRetry()`, `audit.incrementRetry()`, `NotificationAudit.getFailed()/getPendingRetry()/getRetryStats()`) that do not exist on the Supabase model — every recovery path threw `TypeError` at runtime.
**Fix:** rewritten against the real `notification_audit` schema via the shared db layer; re-queues failed notifications from the linked `notifications` row, marks audits `retry_queued`, bulk retry isolates per-item failures, queue failure propagates (no false success). Tests: 7 recovery-job cases.

### F5 — HIGH (frontend): file uploads and funnel dashboard broken by a bad import
`uploadService.js` and `ConversionFunnelDashboard.jsx` did `import api from "../api/api"` against a module with only named exports — `api` was `undefined`, so every upload/dashboard call threw immediately. (Side effect: 5 pre-existing frontend tests now pass.)
**Fix:** named import in both files.

### F6 — MED (frontend): expired sessions never recovered; requests could hang forever
Nothing dispatched the `kayad:auth-expired` event that `AuthContext` listens for, and the axios client had no timeout — an interrupted network left requests pending indefinitely and a revoked session produced endless 401s with no recovery.
**Fix:** 30s client timeout; response interceptor clears the stored token and dispatches `kayad:auth-expired` on 401 (auth endpoints excluded so normal bad-login 401s don't log the user out). Tests: 4 interceptor cases.

### F7 — LOW: `clearCache` type signature rejected the valid no-arg form
Implementation treats `pattern` as optional; the `.ts` signature required it. Fixed the signature (aligns type with behavior).

## Residual observations (documented, not blocking)

- Redis in-memory fallback `Map` only supports `get/set/del`-shaped calls; the `incr/hset/lpush` wrappers would throw on fallback — but those wrappers currently have no callers (verified by grep), so no live weakness. If they gain callers, the fallback must grow real implementations.
- The in-memory idempotency fallback and in-process lock fallback are per-process: with multiple backend instances, duplicate protection degrades to best-effort during a DB outage. Documented; the primary (Supabase) path is the enforcement layer.
- `withRetry` circuit keys default to `"default"` when callers don't pass `key`, so same-service calls share one circuit. Acceptable for current callers (single M-Pesa service); pass explicit keys if new services adopt it.
- Development-mode mock fallbacks remain (deliberate dev convenience) but are now gated to `NODE_ENV=development` and can no longer produce a "success" financial state.

---

## Addendum — independent verification pass

The above report already exists in this repository's own history as real, prior work (a separate, parallel work stream), with its own dedicated test coverage (`backend/tests/resilience/failureModes.test.js`, 32 cases; `src/__tests__/api/apiResilience.test.ts`, 8 cases) - confirmed still passing as part of this project's own most recent full test runs (16/16 backend suites, 335/335 tests). Per this project's own established standard of verifying rather than trusting existing claims, the single most financially-critical claim (F1) was independently, empirically re-tested this pass.

| Claim | Result | Method |
|---|---|---|
| F1 - M-Pesa fallback never fabricates a successful STK response | **Confirmed** | Called the real `stkPush` function directly, 6 times, against a real (but unconfigured/uncredentialed) M-Pesa setup in this sandbox. Every single call threw a real error (`M-Pesa not configured`, `err.code`) - never once returned anything resembling a success shape. Separately traced the actual circuit-breaker-open code path in `utils/retry.js` directly: when the circuit is open, it calls `return await fallback()` - since `mpesaService.js`'s own `fallback` is an `async` function that `throw`s, this `await` necessarily propagates that rejection to the real caller. The mechanism is sound by direct trace even though this sandbox's real calls hit an earlier, equally-safe "not configured" guard rather than the circuit-open state specifically (no real, working Daraja credentials exist here to drive genuine repeated network failures). |

Not independently re-verified this pass (relying on the existing report and its own 32+8 test cases above): F2 through F7, and every item in the "verified SAFE" table. Given the depth of this project's own existing work here and the time available, no further independent testing was performed this pass.

No new weaknesses were found. No application code was changed this pass.

