# KAYAD — Health-route fix & production migration readiness (2026-10-13)

Status: LOCAL FIX PARTIALLY VERIFIED — BLOCKERS REMAIN. Production unchanged. No SQL executed.

## Health-route fix
- Root cause: `registerHealthRoutes(app)` (server.js ~304) registers `app.get("/health")` which answers without `next()`, so the later `app.use("/health", healthRoutes)` (~882) router root is unreachable for `GET /health`.
- Fix: communications readiness is exposed on the admin-protected `/health/deep` (+ `/api/health/deep`) via `utils/healthCheck.js`. `schema_ready` -> ok; `schema_mismatch`/`unknown`/throw -> degraded (503). `schema`, `providerConfig`, `providerAcceptance`, `mailboxDelivery` remain distinct. Public `/health` unchanged. Router root handler untouched.
- `services/communicationReadiness.service.js`: read-only, 60s cache, 4s timeout, fresh result per run, no secrets.
- Test: `backend/tests/regression/healthRouteComposition.test.js` (Vitest, real server.js app, real protect/adminOnly; 16 tests). Routed to Vitest because Jest on Node 22 cannot load server.js (isomorphic-dompurify -> jsdom needs require(ESM), Node 24.9+).
- Run: `cd backend && npx vitest run --config vitest.config.js tests/regression/healthRouteComposition.test.js`

## Production dependency matrix (baseline: newest applied 20260922060457; not executed anywhere)
| Migration | Class | Needed by | Key risk |
|---|---|---|---|
| 20260928123600 comm controls | data-transforming (config rows) | isCommunicationEnabled (fail-closed) | changes which events are enabled |
| 20260929100000 service_role grants | additive | all backend DB access | broad grant |
| 20260930110000 refresh-token hardening | DESTRUCTIVE | models/RefreshToken.js rotate RPC | DROP COLUMN token; irreversible; prod has 0 rows (recheck) |
| 20260930111500 idempotency | additive | gateway deliver() | none material (0 rows) |
| 20260930112000 unique lower(btrim(email)) | additive, fails on collisions | register/sign-in | recheck duplicates (0 at audit) |
| 20260930113000 dead_letter CHECK | constraint swap | gateway state machine | after 111500 |
| 20261001090000 registration integrity | additive + backfill | authController RPC | backfills dealers rows; other NOT NULL cols unverified |
| 20261001220000 contract alignment | additive | registration | errors if RPC absent: needs 090000 first |
| 20261002120000 boundary hardening | security hardening | financial/ownership tables | not on registration path |
| 20261011090000 users security cols | additive | middleware/auth.js protect() | prod lacks columns |
| 20261011121000 profiles role sync | data-transforming | role sync | UPDATE scope not measured |
| 20261012140000 R12 | additive | PUT /api/dealer/onboarding | NEEDS EXPLICIT AUTHORIZATION |
| 20261012140100 R14 | constraint swap | dealer suspend | NEEDS EXPLICIT AUTHORIZATION |

Proposed staged order (staging required; none exists): 111500, 113000, 112000, 090000, 220000, 110000, 20261011090000, 20261011121000, 20260928123600, 20260929100000, 20261002120000. Backup + row/duplicate recheck first. The other ~48 intervening migrations were not read line-by-line: UNVERIFIED.

## Blockers (ranked)
1 Registration RPC missing in prod. 2 Refresh/sign-in (token_hash + rotate RPC). 3 users security columns. 4 communication_deliveries idempotency/dead_letter. 5 normalized-email uniqueness. 6 rollout controls fail-closed. 7 existing users need verification resend. 8 Brevo end-to-end unproven. 9 adminOnly admits all staff roles (AA-A1).

## Controlled Gmail certification (prepare only; jimmythemugo@gmail.com)
After staging passes + sender auth verified, one fresh identity, no retries. Capture separately: registration API result; users/dealers rows; token stored hashed/redacted; Brevo acceptance + message id; webhook status; inbox/spam receipt; verification link; sign-in; refresh rotation (old rejected); resend + reset; redacted logs. HTTP 2xx is not certification.
