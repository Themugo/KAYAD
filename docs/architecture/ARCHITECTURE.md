# KAYAD — ARCHITECTURE

Reflects the real system as of the production freeze (Final Integration Phase 9). Describes what is actually true, confirmed by direct tracing and, where possible, real execution against a real database - not assumed from file naming or intent.

## Frontend

- **Entry**: `src/main.tsx` renders `<App/>` (wrapped in `BrowserRouter`, but the real app is entirely state-driven - `App.tsx`'s `activeNav` switch, not `<Routes>`/`<Route>`). `BrowserRouter`'s only real purpose is providing router context to the handful of real components that use router hooks internally.
- **A large, orphaned `src/pages/` subtree existed from an earlier, abandoned routing architecture** - confirmed via full static + dynamic import tracing from both the real entry point and every real test file. 230 genuinely unreachable files were removed this phase; 15 remain, each kept specifically because a real, passing test still exercises it directly (not because the live app reaches it).
- **Canonical domain views**, each a single, real implementation (flat file or promoted nested folder, prior duplicates removed): `VehicleMarketplace`, `AuctionsView`, `EscrowView`, `InspectionsView`, `DealersView`, `PrivateSellerPlatform`, `ChatView`/`UnifiedCommunicationHub`, `AdminView`.
- **Auth**: `src/context/AuthContext.tsx` - the one, real, HttpOnly-cookie-based provider, wrapping the entire app via `App()`. `src/components/AuthModal.tsx` calls the real backend.
- **API clients**: `src/services/*.ts` - one thin client per domain (`vehicleApi.ts`, `favoriteApi.ts`, `bidApi.ts`, `inspectionApi.ts`, etc.), each wrapping `fetch` with `credentials: 'include'`. The older `src/api/api.ts`/`api.exports.ts` (Bearer/localStorage-based) is still real and actively used by ~20 real components - confirmed, not legacy dead code, kept as-is.

## Backend

- **Entry**: `backend/server.js` - mounts real route files, starts the auction-closing timer, escrow/reconciliation crons.
- **Data access**: `backend/models/_base.js` - a Mongoose-compatibility layer translating `.find()`/`.save()`/etc. to real Supabase/Postgres queries. This is the single most load-bearing file in the backend - nearly every model-layer defect found this program (missing instance methods, `id` not guaranteed on custom selects, a Postgres GENERATED column being written directly, an unsupported field-exclusion syntax) lived here, because every real controller depends on it.
- **Canonical domains**, one real implementation each: Vehicles (`carRoutes.js`/`carController.js`), Bidding (`bidRoutes.js`/`bidController.js` - the separate `auctionRoutes.js` file is confirmed orphaned, never mounted), Inspections (`inspectionRoutes.js`, real table `vehicle_inspections`), Payments (`paymentController.js`/`paymentService.js`), Escrow (`escrowController.js`), Auth (`authController.js`).

## Database

Real Supabase/Postgres. `supabase/migrations/*.sql` is authoritative; corrections are additive, later migrations, never edits to an already-applied one. Two genuine schema quirks, confirmed and worked around correctly rather than "fixed" by altering data: `cars.has_auction` and `cars.isPaid` are real Postgres GENERATED/exception columns; `escrows`' multi-word columns are camelCase, unlike every other table.

## Known, real, deliberately undeployed subsystem

`backend/inspection/` - a complete, separate "inspection marketplace" (providers, bookings, settlements), real and mounted, but the canonical frontend never calls it. Not a bug; a product decision, documented, not resolved.

## Real, connected end-to-end workflows (this program's own scope)

Register/Login/Session, Marketplace browse, Seller listing publish, Inspection request, Auction bid placement - each has a real frontend client calling a real backend endpoint, verified against a real, persisted database record. See `WORKFLOW_CERTIFICATION.md` for the evidence.
