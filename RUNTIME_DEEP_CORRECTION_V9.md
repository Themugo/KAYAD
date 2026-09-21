# KAYAD V9 Runtime Deep Correction

Baseline: KAYAD-FULL-DEEP-CORRECTED-20260921-V8.zip

## Runtime defects addressed

1. **Development startup without Supabase was misleading**
   - The backend previously logged `Database connected` even when `initSupabase()` had not created a client.
   - `connectDB()` now returns a real boolean and startup reports database availability truthfully.
   - Production behavior remains strict because `validateEnv()` requires the production Supabase contract.

2. **Database-dependent background services ran in degraded mode**
   - Communication retry, dealer health-score, market-trend, marketplace-health, reliability/SLI, and reconciliation schedulers now skip cleanly when Supabase is unavailable.
   - Existing auction/escrow/dispute/deadline/integrity guards remain intact.
   - This prevents recurring `Supabase not initialized`, SLI, error-budget, burn-rate, and communication-retry failures during local development without database credentials.

3. **Communication retry had no database availability guard**
   - `runCommunicationRetries()` now exits immediately when Supabase is unavailable.

4. **SLI scheduler had no database availability guard**
   - The scheduler now refuses to start without Supabase and reports a controlled skip.
   - Alert-policy evaluation also returns an empty result when the database is unavailable.

5. **Public marketplace API behavior in database-degraded development was opaque**
   - `GET /api/cars` now returns HTTP 503 with a stable `DATABASE_UNAVAILABLE` code when the database is not configured instead of entering the data layer blindly.

6. **Health/liveness responses were strengthened**
   - `/health` and `/health/live` explicitly disable caching.
   - Readiness continues to return 503 when the database is unavailable, which is the correct distinction between liveness and readiness.

7. **Runtime certification coverage added**
   - `scripts/validate-local-runtime.mjs` verifies no-DB startup, liveness, health, readiness, degraded marketplace API behavior, and absence of the specific background-service errors observed during certification.
   - `scripts/validate-live-runtime.mjs` provides a read-only live-Supabase runtime certification using the developer's configured backend environment. It performs no data mutation.

## Verification performed in this environment

- JavaScript/MJS/CJS syntax: **800/800 PASS**.
- Production backend validation: **12/12 PASS**.
- Startup convergence: **PASS**.
- Runtime integrity: **7/7 PASS**.
- Backend runtime contracts: **14/14 PASS**.
- Wave 3 convergence: **1113/1113 PASS**.
- Deployment readiness: **PASS**.
- Dependency security validator: **PASS**.
- Transaction integrity: **14/14 PASS**.
- Inspection marketplace: **21/21 PASS**.
- Wave 2 invariants: **PASS**.
- Socket contract: **PASS**.
- Subscription domain: **16/16 PASS**.

## Required Windows certification before V9 is declared release-complete

The container cannot reproduce the user's Windows Node 22.22.2 environment or access the user's backend secrets. Therefore the final live runtime and full npm test/build gate must be executed on Windows with the configured environment:

```cmd
nvm use 22.22.2
npm ci
cd /d "C:\Users\hp\Desktop\KAYAD-main\backend"
npm ci
cd /d "C:\Users\hp\Desktop\KAYAD-main"
npm run lint
npm test
npm run build
npm run validate:release
npm run validate:local-runtime
npm run validate:live-runtime
cd /d "C:\Users\hp\Desktop\KAYAD-main\backend"
npm test
```

The V8 baseline remains untouched as the rollback reference.
