# KAYAD — Architecture Map (Final)

Reflects the real, canonical system after the full hardening program (Phases 0-13 plus this final cleanup). "Canonical" means confirmed live/reachable by direct tracing (imports, route mounts, or - where possible - real-database execution), not assumed from file naming.

---

## Frontend

- **Entry**: `src/main.tsx` renders `<App/>` only - no `<Routes>`/react-router. Navigation is state-driven (`App.tsx`'s `activeNav`).
- **Canonical domain views** (one implementation each, resolved via `App.tsx`'s imports):
  - `src/features/VehicleMarketplace/` (promoted to canonical this program - see the cutover completion doc)
  - `src/features/AuctionsView/` (promoted to canonical this program, same cutover)
  - `src/features/EscrowView.tsx`, `InspectionsView.tsx`, `DealersView.tsx`, `DashboardView.tsx`, `PrivateSellerDashboardView.tsx`, `ChatView.tsx`, `AdminView.tsx`, `SupportView.tsx`, `FinancingView.tsx` - each a flat file with its nested-folder duplicate previously removed
  - `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx` - real listing-creation wizard UI; **its "Publish" step does not yet call the real backend** (found, documented, not fixed - see Phase 6 report)
- **Auth**: `src/context/AuthContext.tsx` (the one, real, HttpOnly-cookie-based provider) + `src/components/AuthModal.tsx` (rewritten this program to call the real backend, replacing a prior hardcoded-demo-account implementation)
- **API clients**: `src/services/*.ts` (real, per-domain clients) + the older `src/api/api.ts`/`api.exports.ts` (legacy, still used by ~20 real components; fixed this program to carry real credentials via `withCredentials: true`)

## Backend

- **Entry**: `backend/server.js` - mounts ~80 route files, starts the auction engine/timer, escrow/reconciliation crons, and background workers.
- **Data access**: two parallel layers, both real -
  - `backend/models/_base.js` - a Mongoose-compatibility layer translating `.find()`/`.findOneAndUpdate()`/etc. to real Supabase/Postgres queries (fixed this program: `findOneAndUpdate` atomicity, Date-comparison ISO normalization)
  - `backend/db/index.js` - a more direct functional API (`findOne`/`update`/`updateMany`), used by newer code (e.g. the M-Pesa callback's atomic claim)
- **Canonical domains** (one real implementation each, confirmed by tracing actual mounts/imports, not naming):
  - Vehicles: `routes/carRoutes.js` + `controllers/carController.js`
  - Bidding: `routes/bidRoutes.js` + `controllers/bidController.js` (the `backend/routes/auctionRoutes.js` file is confirmed orphaned, never mounted)
  - Inspections: `routes/inspectionRoutes.js` + `models/InspectionOrder.js` → real table `vehicle_inspections` (fixed this program: was pointing at a non-existent `inspection_orders` table)
  - Payments: `controllers/paymentController.js` + `services/paymentCallback.service.js` (fixed this program: missing `payments.processed`/`paid_at` columns blocked every real M-Pesa callback)
  - Escrow: `controllers/escrowVaultController.js` + the escrow state machine (Phase 9 work)
  - Auth: `controllers/authController.js`

## Database

Real Supabase/Postgres, schema in `supabase/migrations/*.sql` (additive-only pattern - already-applied migrations are never edited; corrections are new, later migrations). Confirmed real via a full migration replay against a local Postgres instance across this program's work.

## Known, real, undeployed subsystems (not dead, not wired - a genuine product decision, not a bug)

- `backend/inspection/` - a complete, separate "inspection marketplace" system (providers, bookings, reports, settlements, 13 tables) - real and mounted at `/api/inspection-marketplace`, but the canonical frontend never calls it.

## Confirmed dead and removed this program (56 items across 4 cleanup passes)

See `AUDIT_CLEANUP_REPORT.md` (31 items) and `FINAL_CLEANUP_REPORT.md` (12 + 4 items) for the full, evidenced list.

## Known, real, remaining gaps (not fixed this program - documented, not silently left out)

- Several canonical frontend views (auction bidding, seller listing publish, inspection request) do not yet call their now-confirmed-working backends - pure local/mock state. Named directly in the Phase 6/7/8 reports as the clear next integration work.
- The live production deployment (`kayad.space`/`api.kayad.space`) is down as of the last verified check (Phase 13) - see `PRODUCTION_DEPLOYMENT_CERTIFICATION.md` for evidence and required owner actions.
