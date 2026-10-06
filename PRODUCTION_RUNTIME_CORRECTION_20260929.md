# KAYAD Production Runtime Correction — 29 September 2026

## Foundation
Built from `KAYAD-NEXT-FULLY-UPDATED-TESTED-FOUNDATION-20260929.zip` without rebuilding the product from scratch.

## Corrections made

1. **Canonical Supabase service-role runtime privileges**
   - Reconciles server-side CRUD privileges for existing public tables.
   - Adds default privileges for future tables created by the canonical migration role.
   - Explicitly documents the production-critical `cars`, `bids`, `favorites`, `saved_searches`, auth, and communications tables.
   - Does not add or change browser `anon`/`authenticated` privileges or RLS policies.

2. **Favorites price-alert schema contract**
   - Adds `favorites.notify_on_price_drop` with a safe `false` default.
   - Removes the production mismatch that caused `PriceAlertCron` to fail.

3. **Nested timestamp filter serialization**
   - Normalizes nested Date values used by `$gte`, `$lte`, `$gt`, `$lt`, `$eq`, `$ne`, `$in`, and `$nin` into ISO-8601 strings.
   - Fixes the hosted auction-reminder failure where PostgreSQL received a JavaScript Date.toString() value.

## Deliberately unchanged

- Brevo remains canonical email.
- Africa's Talking and Twilio remain optional and fail-closed when credentials are absent.
- Supabase Storage remains the media provider.
- Backend custom authentication remains authoritative.
- Health readiness continues to use a real `cars` database probe; it is not weakened.
- No production secrets are embedded.
- No Git commit or push is performed by this correction package.

## Required live gate after applying the migration

The corrected foundation is locally testable, but the database migration must be applied to the actual production Supabase project before live readiness can turn green. The live gate is:

- `/health` = 200
- `/health/live` = 200
- `/health/ready` = 200
- registration → Brevo verification → verification → login for buyer/dealer/private seller/inspection workflow
- background crons remain error-free across at least one full cycle

## Local certification performed on the correction foundation

- Changed JavaScript syntax checks: PASS.
- Production runtime correction contract: 9/9 PASS.
- Supabase migration preflight: PASS — 128 files / 128 unique versions.
- Deployment readiness: PASS — 14/14.
- C1-C5 convergence: PASS — 9/9.
- Email-only launch: PASS — 11/11.
- Email reliability: PASS — 8/8.
- Runtime deep V11: PASS — 10/10.
- Backend runtime contracts: PASS — 14/14.
- Production backend: PASS — 12/12.
- Runtime integrity: PASS — 7/7.
- Canonical architecture: PASS.
- V14 production activation: PASS — 16/16.

The container runtime is Node 22.16.0 while KAYAD requires Node >=22.22.2, so the full dependency-backed TypeScript/Vite/Vitest certification must be rerun on the user's Windows Node 22.22.2 environment. The existing foundation had already passed the clean-install, typecheck, production build, and full unit suite on that Windows environment before this correction pass.

The actual production Supabase migration still has to be applied to the live project; no production database write was performed from this environment.
