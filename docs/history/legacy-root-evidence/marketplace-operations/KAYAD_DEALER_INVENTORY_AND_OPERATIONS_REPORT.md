# KAYAD Dealer Inventory Lifecycle & Dashboard Operations (Phases 6–7)

## Phase 6 — Inventory & listing lifecycle

Traced `POST /api/dealer-platform/inventory` → `createListing` → the shared, canonical `createCar` (`backend/controllers/carController.js:325`, used by both dealers and individual sellers — confirmed single implementation, not a dealer-specific duplicate).

Confirmed guarantees (direct code read):
- **Ownership binding is immutable and server-side**: `dealer: req.user.id` is set in the request body object *after* spreading `req.body`, so a client-supplied `dealer` field in the payload is always overwritten, never trusted.
- **Publish/availability state is server-computed**: `status: seller.status === "approved" ? "available" : "pending"` and `isVerifiedDealer: seller.status === "approved"` — both derived from the authoritative `seller.status`, never a client flag.
- **Escrow eligibility is server-computed**, explicitly hardened against a previously-real "client submits escrowEnabled=true" risk (in-code comment confirms this was deliberately fixed in an earlier stage of this engagement, not left as a residual gap).
- **Quota/entitlement enforcement re-derives from the database on every call**: `assertDealerCanCreateListing(dealerId)` (`dealerSubscription.service.js:174`) always re-fetches the dealer's entitlement fresh — no cached/client-supplied listing count is trusted, and layered checks (no subscription → locked → expired → over limit) all throw before any car row is created. A direct call to the endpoint cannot bypass this, since the check runs inside the same controller invocation, not a separate client-side gate.
- **Bulk status updates verify ownership of every ID before any write**: `bulkUpdateListings` (`dealerPlatformController.js:220-240`) fetches the dealer-owned subset first and 403s if any requested ID isn't found in it (`owned.length !== ids.length`), rather than silently updating only the owned subset or trusting the request.

Not independently re-traced this phase (time-boxed, lower risk given the pattern already confirmed elsewhere in this same controller): media/image upload handling, duplicate-listing detection, and taxonomy normalization. These are carried forward rather than asserted either way.

## Phase 7 — Dashboard operations (cross-reference, not re-audited)

Phase 1's `KAYAD_DEALER_CAPABILITY_WIRING_MATRIX.md` already covers every dashboard section named in the brief's Phase 7 (Overview, Inventory, Leads/CRM, Pipeline, Customers, Escrow, Marketing, Auctions, Finance, Inspections, Team, Analytics, Settings) with per-section WIRED-VERIFIED/PERSISTED-NOT-CONSUMED/UI-ONLY classifications and controller-level evidence. Rather than duplicate that matrix here, this entry cross-references it as satisfying Phase 7's section-by-section requirement, with the three concrete gaps already identified there (Finance/Team/Reputation wiring — all mechanical "bind to an existing safe endpoint" fixes) carried into Phase 12.

One Phase 7 item not covered in Phase 1 (which focused on the dashboard's own UI): **financial-invariant preservation on sold/archived/auction-linked listings.** `bulkUpdateListings`'s allowed-status set (`available, active, draft, pending, reserved, sold, archived`) lets a dealer directly set `status: "sold"` on their own listing via the bulk endpoint with no check for an in-progress escrow/auction on that car. Whether this is safe depends on whether `Car.status` is purely informational once an escrow exists (with the escrow's own state machine being authoritative) or whether setting `status:"sold"` here could short-circuit a real in-progress transaction — **not resolved in this phase**; flagged for Phase 12 as a question to answer by reading the escrow/auction state machines' own car-status dependencies before treating it as settled either way.
