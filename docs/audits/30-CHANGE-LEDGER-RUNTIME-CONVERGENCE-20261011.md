# Change ledger: runtime convergence, route-schema repair and Supabase certification phase

**Foundation:** `KAYAD-SUPABASE-SCHEMA-SECURITY-CERTIFICATION-20261011.zip`, SHA-256 `fd4464da1f18724f95995152e95a42e31c1b7707a64ee81c8e65cd84d9573a15`. It was checksum-verified before use, kept untouched (read-only copy), and every change below was diffed against its extraction.

**No commit, push, deploy, hosted migration or production setting change was made.** Production was read only, through catalog queries: column existence and ledger function bodies.

**Untouched:**
- homepage, navigation structure and Auction 360 UI;
- the Messages authentication fix;
- the outbox service and migration;
- attachment security;
- cookie flags, CORS and Cloudinary;
- package manifests and lockfiles.

## Added (16)
| File | Purpose |
|---|---|
| `backend/services/socketAuth.service.js` | RT-3/D-RT-2 socket tickets: handshake resolution, `protect`-equivalent security re-check, revalidation |
| `backend/routes/realtimeRoutes.js` | `POST /api/realtime/socket-ticket` (`protect` + CSRF + per-user limiter, `no-store`) |
| `supabase/migrations/20261011130000_cars_click_counter.sql` | `cars.clicks` (contract proven by frontend `trackClick` and dashboards) |
| `backend/tests/regression/routeSchemaTriageFixes.test.js` | 8 Jest tests: fieldMap corrections, 400/404 classification, FIN-3 |
| `src/__tests__/context/SocketContext.ticket.test.tsx` | 3 Vitest tests (**mocked**): ticket via POST in `auth`, never in a URL; anonymous fallback with retry |
| harness `tests/m14-realtime-socket-ticket.test.mjs` | 13 real tests covering the 10 required realtime scenarios plus the endpoint contract |
| harness `tests/m15-financial-operational-integrity.test.mjs` | 9 real tests: ledger idempotency, balance, immutability, reversal, RPC privileges, **FIN-LEDGER-1 (expected FAIL)**, config/ledger report authorization |
| harness `tools/classify-route-crawl.py` | deterministic root-cause classification of crawl 500s |
| `docs/audits/20`–`30` (this phase) and `docs/audits/evidence/runtime-convergence-20261011/` | reports and evidence |

## Modified (42)
| File | Change |
|---|---|
| `backend/server.js` | async `io.use` through `authenticateHandshake`; `authState` event; periodic and on-join session revalidation (`ensureSession`) for `joinChat`/`joinInspection`/`joinAdmin`/`joinControlPlane`; expiry timer uses the shared `downgrade`; mounts `/api/realtime`; unused `jwt` import removed |
| `src/context/SocketContext.tsx` | signed-in tabs pass an `auth` callback that fetches a ticket before every (re)connect; anonymous fallback with backoff on `authState` |
| `backend/middleware/rateLimiter.js` | `socketTicketLimiter` |
| `backend/middleware/errorHandler.js` | 22P02 → 400, PGRST116 → 404 when no status was set (missing schema stays 500) |
| `backend/middleware/idempotency.js` | FIN-3: GET/HEAD/OPTIONS and keyless requests pass through (no null-key audit row, no shared `idempotency:undefined` lock) |
| `backend/models/_base.js` | `$or` builder: range operators, `$in`, `$ilike`, AND within a branch, quoting of reserved characters |
| `backend/utils/fieldMap.js` | `user_preferences.user` identity (was the wrong `user_id`); `bids.car → car_id` |
| `backend/ownership/services/ownershipService.js` | dashboard TDZ bug |
| `backend/controllers/cmsController.js` | calendar date window and validation; media sort by `createdAt` |
| `backend/controllers/reconciliationController.js`, `backend/services/reconciliationService.js` | `generateReportId` exported and used; `generatedBy` is the requesting user (uuid) |
| `backend/services/escrowAuditService.js` | missing `aggregate` import |
| `backend/services/ledgerService.js` | removed filter on the non-existent `is_active` column |
| `backend/routes/dealerRoutes.js` | `/milestones` and `/bids`: real column names, errors surfaced, explicit lookups instead of embeds, optional production-only health score tolerated |
| `backend/routes/carRoutes.js` | admin fraud check: 404 for a missing car |
| `backend/services/dealerSubscription.service.js`, `backend/services/leadService.js`, `backend/services/leadTimelineService.js` | not-found errors carry 404 |
| `backend/inspection/routes/inspectionRoutes.js` | `GET /:id` validates the UUID (400) |
| `backend/infrastructure/queues/deadLetterQueue.js`, `backend/controllers/queueController.js` | dead-letter queue unavailable → 503 `DEPENDENCY_UNAVAILABLE` |
| `backend/routes/prometheusMetrics.js` | key parsing (JSON tags contain `:`), label escaping, histogram summaries exported as Prometheus summaries |
| `backend/config/redis.js`, `backend/config/sentry.js`, `backend/middleware/bulkhead.js`, `backend/mediaEventEngine/services/failoverService.js`, `backend/services/email.service.js`, `backend/services/mpesaAuth.service.js`, `backend/services/mpesaService.js`, `backend/socket/socket.js`, `backend/utils/retry.js`, `backend/utils/sms.js` | 33 `incrementCounter(name, tags)` calls → `incrementCounter(name, 1, tags)` |
| `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` | a11y: grid-column control `role="group"`; mobile filter drawer `role="dialog" aria-modal aria-labelledby` |
| `e2e/tests/dealer-onboarding/dealer-onboarding.spec.ts`, `e2e/tests/marketplace-controls/marketplace-controls.spec.ts`, `e2e/tests/workflow-certification/workflow-certification.spec.ts` | stale selectors and flows updated to the shipping UI; admin fixture; API-abort predicate; new 5-column cap test (`22-…`) |
| harness `browser/realtime-host-probe.mjs` | records `authState`, ticket calls and ticket-in-URL; waits for an authenticated socket before subscribing |
| harness `tools/route-schema-crawl.mjs` | response message, redacted server log lines, `CRAWL_ONLY` |
| `docs/audits/14-PRODUCTION-READINESS-BLOCKERS-20261011.md` | one-line note: superseded by `27-…` for current status |
| `vite.config.ts` | dev-only: `server.watch.ignored` for docs, evidence and test output (E2E-ENV-1) |
| `scripts/validate-frontend-runtime-contracts.mjs`, `scripts/validate-deployment-readiness.mjs` | these source-text validators also read `backend/services/socketAuth.service.js`, where the handshake cookie path moved (RT-3). Before the update they failed in the battery (`validators-battery-before-validator-path-fix/`). The behaviour they protect (cookie handshake, auction/chat/showroom rooms) is tested for real by `m7` and `m14`. The validators were not loosened: they still require the same strings, read from both files |

## Not done on purpose
- No table or column was created for crawl groups A, B or C.
- No function body was changed (FIN-LEDGER-1 is an owner decision).
- No disposable Supabase project was created, because authorisation was not received.
- The escrow cron stays dormant (FIN-1).
- No cookie domain, CORS or Realtime publication change.
- No OpenAPI edits: stale documented routes such as `/inspections/my-tasks` are still crawled.
