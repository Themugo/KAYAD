# PHASE 7 — PAYMENT LOOSE ENDS + REAL VEHICLE DATA WIRING

**Status: COMPLETE.** See `PHASE_7_COMPLETE.md` for the implementation and verification summary.

KAYAD - Phase 7: Payment Loose Ends + Real Vehicle Data Wiring

Two workstreams this phase: (1) Phase 6's payment loose ends, (2) wiring the tested-but-unused vehicleApi.ts client into the actual UI.

---

## 0. Headline Finding: Escrow/Bid "Transactions" Provide No Real Atomicity

While implementing payment_attempts tracking, controllers/escrowVaultController.js's adminRefund() (and 3 other controllers: bidController.js, reviewController.js, favoriteController.js) were found to rely on utils/supabaseSession.js for transaction safety - a Mongoose-style startSession()/.startTransaction()/.commitTransaction()/.abortTransaction() API used throughout these controllers with .save({ session })-style calls.

Read the actual implementation rather than assuming it works because it looks correct: supabaseSession.js's startTransaction(), commitTransaction(), and abortTransaction() each do nothing but flip a local in-memory boolean flag. No real Postgres transaction is opened, committed, or rolled back. Every write inside a withTransaction(...) block is independently and immediately committed to the database the moment it executes - there is no atomicity whatsoever.

Concrete consequence: in adminRefund(), if vault.save({session}) succeeds but the subsequent Car.findByIdAndUpdate(...) throws, the escrow vault is left marked "refunded" while the car is never reset to "available" - a genuine, inconsistent, financially-relevant data state, with the catch block's abortTransaction() call doing nothing to undo the already-committed vault write.

This directly answers, in the worst possible direction, the open question docs/DATABASE_SOURCE_OF_TRUTH.md (Phase 1) flagged as unresolved and high-severity: "transaction boundaries (DB-level atomicity)... not confirmed either way." It is now confirmed: they do not exist, despite code that reads as if they do - arguably worse than having no transaction code at all, since it creates false confidence for anyone reading bidController.js or escrowVaultController.js and trusting the withTransaction wrapper.

Not fixed this phase. Building real Postgres transaction semantics through Supabase's JS client is a non-trivial undertaking (Supabase's standard client does not support ad-hoc multi-statement client-side transactions the way Mongoose does - this typically requires a Postgres function/RPC approach, restructuring each of the 4 affected controllers' call patterns) and doing so blind, with no live database to verify a rewrite against, is exactly the kind of large, unverifiable, high-risk change to financial code this program has consistently declined to make speculatively. This is named here as the single most important finding of Phase 7 and the clear top candidate for a dedicated, careful future phase - not attempted as a rushed addition to this one.

---

## 1. Payment Loose Ends (Continuing Phase 6)

### payment_attempts - now populated
services/paymentService.js's initiatePayment() (the real, live STK-push initiation path - confirmed by checking paymentController.js's import) now writes a payment_attempts row alongside the existing payments row on every initiation. services/paymentCallback.service.js's handleMpesaCallback() (the real, live callback path) now updates that attempt's status to success/failed on resolution, looked up by checkoutRequestId since paymentId isn't known at the point the attempt row is created. Both additions are fire-and-forget, matching this file's own established convention (attempt-tracking failures must never affect whether a real payment succeeds or fails).

### A second, real finding: confirmPayment()/failPayment() are dead code
While reading paymentService.js to add attempt-tracking, found it also exports confirmPayment() and failPayment() - functions that duplicate much of what paymentCallback.service.js's handleMpesaCallback() already does (status updates, escrow handling, notifications). Checked directly whether either is called from anywhere else in the backend: zero real call sites (two apparent matches, confirmPaymentSchema in middleware/validate.js/validation/inspection.schema.js, are a different identifier - a validation schema, not this function). Not deleted this phase - flagged as a genuine duplicate-code finding for a future consolidation pass, following this program's established 9-step verification practice before any deletion, not yet run in full here.

### Refund processing - not built this phase, and now understood why that's the right call
Given the fake-transaction finding above, and that adminRefund() is one of the 4 controllers relying on it, wiring the new refunds table into real refund processing logic was deliberately not attempted this phase - doing so on top of a controller with no real transaction safety would mean building new financial code on the same unsound foundation, compounding rather than fixing the underlying issue. This is a direct, reasoned consequence of the headline finding, not a separate gap.

### Reconciliation tooling, sandbox/provider-config wiring
Not attempted this phase - services/reconciliationService.js (1,630 lines) was not read or modified. Named as still-open, same as Phase 6 left them.

---

## 2. Real Vehicle Data Wired Into the UI

### What changed
App.tsx's central vehicles state (previously useState<Vehicle[]>(INITIAL_VEHICLES), the single source every component in the app reads from as props) now attempts a real GET /api/cars call on mount. On success with at least one real vehicle, vehicles is replaced with the mapped real data and a new vehicleDataSource state flips from 'demo' to 'live'. On any failure - the expected, common case given no backend is reachable anywhere in this program's environment - the existing mock data is left in place unchanged, and the failure is logged via console.warn, not hidden.

This was possible as a small, low-risk change specifically because vehicles state was already centralized in one place in App.tsx - confirmed before starting, since if it had been duplicated/re-derived across many components, this would have been a much larger undertaking.

### The mapping function had to be fixed to actually work
Checking mapBackendCarToVehicle()'s return type against the real, full Vehicle interface (src/types/index.ts) before wiring it up found it was missing several fields the interface requires (engine, horsepower, exteriorColor, interiorColor, listingType, sellerRating, savedCount, status, createdAt) - this had never been caught because nothing had called this function from real UI code until this phase. Fixed:
- engine: a genuine oversight - the real column existed and was simply never mapped by the Phase 4/5/6 version of this function.
- listingType: inferred from the real has_auction field ('auction' vs 'fixed') - a real, if imperfect, signal, not fabricated from nothing.
- horsepower, interiorColor, sellerRating, savedCount: honest defaults (0 / empty string), clearly commented as such - no equivalent data exists on the cars row or via any join performed by getCars, and none was invented.
- status: backend's real status values (available/sold/pending/reserved/hidden/draft) don't exactly match the frontend's union (active/sold/pending/draft) - mapped with available (and anything unrecognized) falling to active rather than crashing.

A real, named risk, not silently assumed safe: condition, bodyStyle, transmission, fuelType are cast directly from the backend's free-text columns to the frontend's stricter union types. These columns have no CHECK constraint on the backend restricting their values (confirmed - unlike cars.status, which does have one), so a real-world value outside the expected union would render as an unrecognized value at runtime rather than throw. Documented in the function's own comments rather than left as a silent assumption.

### Test coverage
App.test.jsx extended with a new test confirming App genuinely calls GET /api/cars on mount (not just "doesn't crash") - verified the real fetch call is made, with the console log confirming graceful fallback when it fails, exactly as designed.

---

## 3. Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation (node --check, all files) | 0 errors |
| Backend unit test suite (npm test, Jest) | 216/216 passing - confirms no regression |
| Frontend TypeScript | 0 errors |
| Frontend test suite | 181/181 passing (180 pre-existing + 1 new) |
| Lint | Clean |
| Production build | Succeeds |
| Live verification of any change | Not possible - standing constraint across this entire program |

---

## 4. What This Phase Deliberately Did Not Do

- Fix the fake-transaction layer - the headline finding (section 0). Deliberately not attempted given the scale and risk of building real transaction semantics blind.
- Delete confirmPayment()/failPayment() - flagged as dead code, not removed; the full 9-step verification this program uses before any deletion was not completed this phase.
- Build refund processing logic, reconciliation tooling, or sandbox wiring - Phase 6's remaining items, still open, with section 0's finding now explaining why refund logic specifically shouldn't be built yet.
- Add a visible UI indicator for vehicleDataSource - the state exists and is honestly tracked, but no component currently surfaces "you're viewing demo data" to the user. A natural next step, not built this phase.
- Wire real data into any component other than the top-level vehicle list - auctions, bids, escrow, inspections all remain on mock data, unchanged.

---

## 5. Recommended Phase 8 Starting Point

The fake-transaction finding (section 0) is the clearest, highest-severity candidate: it affects real financial code (bidController.js, escrowVaultController.js) that this program has repeatedly identified as the highest-risk category in the entire project. A dedicated phase should investigate the right real-transaction approach for Supabase (most likely a Postgres RPC function wrapping the multi-step operations atomically) before any further refund, escrow, or bid-settlement logic is added on top of the current unsound foundation.
