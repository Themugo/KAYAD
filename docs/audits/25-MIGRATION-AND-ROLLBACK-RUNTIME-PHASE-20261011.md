# Migration and rollback report: runtime-convergence phase

## 1. New migration in this phase (1)
### `20261011130000_cars_click_counter.sql`
- **What it does.** `ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0`, plus a `cars_clicks_non_negative` CHECK constraint (added only if absent) and a column comment.
- **Why the contract is proven.** The proof comes from deployed code, not an audit list:
  - The frontend calls `trackClick` → `POST /api/cars/:id/click`.
  - The backend increments `cars.clicks` on that call.
  - The dealer dashboard (`/api/cars/dealer/analytics`, `/dealer/my-cars`), the sales dashboard, executive analytics and the intelligence services all read it.
- **Prior state.** No migration created the column, and production does not have it either (read-only catalog). The click endpoint therefore never recorded anything, and 8 dashboard routes answered 500.
- **Safety.**
  - It is additive and idempotent.
  - On PostgreSQL 11+ the constant default is metadata-only, so there is no table rewrite and the `ACCESS EXCLUSIVE` lock is brief.
  - No grant or RLS change: `cars` keeps its existing policies and privileges.
- **Verified.**
  - Chain replay: 176/176, plain and with defaults.
  - Re-application on both databases: OK.
  - Crawl: `/api/cars/dealer/analytics` and `/dealer/my-cars` went from 500 to 200, as did the analytics and intelligence routes that select `clicks`.
- **Known limitation, unchanged.** The click handler uses read-then-write, so concurrent clicks can under-count. The counter is approximate and documented as such in the column comment.
- **Rollback.** `ALTER TABLE public.cars DROP COLUMN IF EXISTS clicks;` This loses only the recorded click counts; the routes revert to their former 500s.

## 2. Function-level changes: none in SQL
No function body was changed. FIN-LEDGER-1 is documented and left for an owner decision (`24-…`).

## 3. Deploy order (cumulative; unchanged principle from `11-…` §6)
1. Build staging as a **schema-only clone of production**.
2. Export and commit the 38 hosted-only migrations (HIST-38).
3. Apply, in version order, the 5 unmatched older repository migrations (after diff review) and every repository migration newer than `20260922060457`. That is now **53** migrations, ending with:
   - `20261011100000` (outbox)
   - `20261011120000` (client least privilege, RLS-1/2/3)
   - `20261011121000` (profiles role sync)
   - `20261011130000` (cars.clicks)
4. Deploy this backend and frontend. The socket-ticket route requires no migration. RT-3 needs the backend and frontend deployed together; deploying either one alone still works:
   - **New frontend, old backend.** The ticket request returns 404, the socket connects anonymously (same as today) and retries with backoff.
   - **Old frontend, new backend.** Cookie and `auth.token` paths are unchanged, so behaviour is the same as today.
5. Run `28-…` on staging, then production in a change window.

## 4. Explicitly not done
- No migration was applied to any hosted project.
- No historical migration was edited.
- No table was created for group A or B routes (`21-…`).
- No column was created for group C routes.
- No change to the `supabase_realtime` publication, default privileges, cookie flags, CORS or Cloudinary.
