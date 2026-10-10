# KAYAD Marketplace — 360 Audit & Hardening Report
**Date:** 7 October 2026
**Foundation:** `KAYAD-MOBILE-MENU-HERO-FIX-20261007(1).zip`

## 1. Scope
This audit covers the canonical public marketplace surface, its navigation/tabs, public vehicle data contract, saved vehicles, hero/admin configuration, seller/dealer entry points, finance entry point, escrow hand-off, marketplace payment/fulfilment boundaries, public trust wording, and the backend contracts that support these surfaces.

The auction, inspection domain, escrow/ledger internals and the remaining platform domains are deliberately not treated as completed by this pass; they are the next dedicated audits.

## 2. Critical findings discovered

| Area | Status before this pass | Finding |
|---|---|---|
| `/api/cars` → frontend mapper | GAP | Live backend responses are camelCase after the backend field mapper, while the frontend mapper primarily consumed older snake_case names. Auction, dealer identity, verification, promoted/featured state and timestamps could therefore disappear. |
| Vehicle deep links | GAP | Canonical cards/share paths use `/cars/:id`, but the shell did not resolve that path into the existing vehicle-detail state. |
| Saved Vehicles | GAP | The Saved Cars tab reused the marketplace component but the component always re-queried the complete marketplace, so saved IDs were not actually the authoritative result set. |
| Hero vehicle identity | GAP | Legacy marketing showcase vehicles remained capable of becoming the public hero source. |
| Hero admin surface | DUPLICATE / GAP | Marketing showcase-car editing remained visible even though the approved architecture requires real featured inventory as the public hero identity. |
| Navigation semantics | PARTIAL | Saved Searches duplicated Saved Cars; Account Settings routed to Dashboard; Dealer Inventory/Analytics routed to generic/public surfaces; a bank-officer menu exposed an unsupported portal. |
| Finance surface | DUPLICATE | `financing` and `finance` mounted two different implementations. |
| Escrow CTA wording | PARTIAL | Marketplace copy implied a live secure escrow purchase even though the current escrow surface explicitly says a standalone escrow cannot be created from that screen. |
| Inspection status in marketplace data | GAP | Basic inspection status existed in the backend but was not exposed by the public car projection or mapped into the marketplace vehicle model. |
| Fixed-price purchase journey | GAP | Backend purchase/payment/fulfilment contracts exist, but the canonical marketplace detail surface does not expose a complete buyer purchase initiation/status journey. |
| Private seller listing journey | GAP | The private-seller wizard contains the step shell, but the source still lacks real per-step listing inputs; its draft can therefore reach the real create endpoint without a complete listing payload. |
| Saved Searches | PARTIAL | Backend saved-search capability exists, but there is no canonical public management surface in the current navigation. The misleading duplicate Saved Searches menu item was removed rather than pointing it at the wrong Saved Cars page. |

## 3. Hardening completed in this pass

### Marketplace data contract
- Updated the canonical vehicle mapper to understand the live camelCase `/api/cars` contract while retaining legacy snake_case compatibility.
- Restored real seller/dealer identity from the populated `dealer` object.
- Restored real auction status/current bid/bid count/auction end data.
- Restored verified-dealer and promoted/featured signals.
- Added basic inspection-status mapping and exposed it from the public car projection.
- Added regression coverage for the canonical live response shape.

### Deep links
- `/cars/:id` now resolves into the existing query-based marketplace vehicle-detail mechanism instead of silently falling through to the homepage.

### Saved Vehicles
- Saved IDs outside the current inventory page are resolved through the canonical single-vehicle endpoint.
- The Saved Cars surface now runs the canonical marketplace grid in `savedOnly` mode rather than querying the entire marketplace.
- Saved mode has its own truthful heading/count and does not render the public homepage hero/marketing blocks.

### Hero convergence
- Public hero identity now comes only from real promoted/featured inventory.
- Legacy showcase configuration is retained only for backward-compatible config reads; it can no longer become a public vehicle identity.
- The active admin surface no longer exposes the obsolete Marketing Showcase Cars editor.
- Existing featured-vehicle selection remains the configuration authority.

### Navigation convergence
- Removed the duplicate Saved Searches item that routed to Saved Cars.
- Account Settings now opens Profile.
- Dealer Inventory and Dealer Analytics now enter the canonical Dealer Dashboard workspace.
- Mobile Dealer Inventory now uses the same canonical Dealer Dashboard route.
- Removed the unsupported bank-officer underwriting/applications menu claims.
- `finance` and `financing` now converge on the same canonical Finance Marketplace surface.

### Marketplace trust wording
- Marketplace hero copy now describes clear transaction workflows rather than asserting generic protected transactions.
- Marketplace vehicle detail escrow actions now say `Review Escrow Workflow` while live escrow mode is disabled, and preserve the live purchase wording only when the live escrow gate is actually enabled.
- Footer wording now avoids representing M-Pesa escrow protection as an already-certified universal marketplace guarantee.
- Dealer profile wording no longer says vehicle titles are “guaranteed”.

### Escrow hand-off
- A marketplace escrow CTA now opens the existing Escrow Flow information tab rather than pretending the Escrow page can create a standalone deal.
- Normal navigation to Escrow still opens the normal journey view.

## 4. Validation results after the hardening pass

The following source-level/runtime-contract validators pass after the changes:

- Marketplace convergence: **17/17 PASS**
- Marketplace UI convergence: **7/7 PASS**
- Marketplace core initiative: **12/12 PASS**
- Marketplace service boundary: **5/5 PASS**
- Marketplace + Auction + Escrow DB integration: **29 PASS / 0 FAIL**
- Finance domain end-to-end: **8/8 PASS**
- Hero admin-control contract: **PASS**
- Hero mobile asset contract: **PASS**
- Homepage convergence: **PASS**
- Explicit auth-flow contract: **19/19 PASS**
- UI surface convergence: **9/9 PASS**
- Canonical architecture: **PASS**
- Deployment readiness: **PASS**
- PWA/mobile contract: **13/13 PASS**
- Modified TS/TSX sources successfully parse through the installed TypeScript transpiler.
- Modified backend JS and validation scripts pass `node --check`.

## 5. Certification limitation
A full `npm ci` / Vite/Vitest production build was **not certified in this environment**. The uploaded foundation requires Node `>=22.22.2`, while the available runtime is Node `22.16.0`. The attempted dependency installation terminated with npm's `Exit handler never called` error after reporting the engine mismatch, leaving no usable Vite/Vitest binaries.

Therefore this pass is a **source/contract hardening pass**, not a replacement for the required Node 22.22.2 production certification on the Windows foundation.

## 6. Marketplace business-model status

### A. Buyer marketplace — fixed-price inventory
**PARTIAL / next hardening phase.**
- Discovery, filtering, pagination, vehicle detail and saved vehicles are connected to the real marketplace read contract.
- Backend purchase outcome, payment settlement, escrow creation and ownership/fulfilment contracts already exist and pass the marketplace convergence validators.
- The missing boundary is the buyer-facing canonical purchase initiation/status UI.

### B. Private seller marketplace
**GAP / next hardening phase.**
- Seller entry point exists.
- Real `POST /api/cars` creation contract exists.
- The current 12-step seller wizard is still mostly a presentation shell and does not collect the full listing payload through real inputs.
- This must be completed without bypassing server validation, image/media recovery, ownership checks or dealer/seller entitlement rules.

### C. Verified dealer marketplace
**PARTIAL.**
- Dealer Dashboard has a real inventory section and server listing read path.
- Public dealer filtering and verified-dealer signals now map correctly from the canonical vehicle response.
- Dealer listing creation/entitlements, promotions and operational inventory should receive a dedicated hardening pass before being called production-complete.

### D. Auction marketplace
**DEFERRED TO NEXT AUDIT.**
The marketplace read boundary is connected to the canonical auction APIs and DB contracts, but the entire auction journey is intentionally not certified by this marketplace pass.

### E. Pre-Purchase Inspection
**DEFERRED TO NEXT AUDIT.**
Basic inspection status is now visible to the marketplace mapper. The full booking → payment → inspection → report → marketplace badge/report lifecycle remains the dedicated inspection audit.

### F. Escrow / protected transaction model
**PARTIAL / DEFERRED.**
The backend purchase/escrow lifecycle is structurally present and validated. The current UI correctly avoids pretending that a standalone escrow can be created from the Escrow screen. Live custody/regulated claims remain outside this pass.

### G. Vehicle financing
**CANONICAL SURFACE / PARTIAL BUSINESS JOURNEY.**
The duplicate public finance surfaces have been converged. The finance domain validator passes, but lender/application/underwriting operations require their own end-to-end certification.

### H. Advertising / sponsored marketplace inventory
**PARTIAL.**
Marketplace ad slots use the real ad service rather than the old static sponsor-card path. Admin ad management exists. Campaign billing, entitlement accounting, impression/click integrity and operational reporting still require a dedicated commercial audit.

### I. Saved Vehicles / Compare / Price Alerts
**PARTIAL → HARDENED.**
Saved vehicle pagination/deep-resolution was fixed in this pass. Compare is already centralized. Saved-search management remains a missing canonical navigation/surface boundary and should be addressed only if it is part of the approved marketplace information architecture.

## 7. Exact next phases — no redesign / no second marketplace

### Marketplace Phase M2 — Purchase & Seller Boundary
1. Buyer fixed-price purchase initiation using the existing canonical payment API.
2. M-Pesa/STK state handling and payment polling.
3. Purchase outcome status surface.
4. Escrow creation/reconciliation after successful purchase settlement.
5. Collection → ownership-transfer visibility.
6. Private seller listing wizard: real inputs, validation, image upload, draft state, publish, edit and failure recovery.
7. Dealer listing creation/entitlement boundary and promotion rules.
8. Regression gate across existing marketplace/auction/escrow validators.

### Marketplace Phase M3 — Commercial & Discovery Boundary
1. Saved-search management only if approved in the existing IA.
2. Finance listing eligibility and buyer application linkage.
3. Dealer subscription/listing entitlements.
4. Advertising inventory, sponsored placement and accounting.
5. Marketplace search/facet completeness at scale.
6. Trust-claim sweep across every canonical marketplace-visible word.

### Then dedicated domain audits
**Auction → Inspection → Escrow/Payments/Ledger → Ownership → Uploads/Documents → Admin/RLS → Communications/Webhooks → Concurrency/Idempotency → Production runtime/deployment.**

## 8. Non-negotiable build rule
No new marketplace architecture, duplicate API, mock inventory, parallel payment engine, second escrow engine, alternate seller marketplace or visual redesign should be introduced. Every next phase must extend the existing canonical contracts and finish incomplete boundaries before adding anything new.
