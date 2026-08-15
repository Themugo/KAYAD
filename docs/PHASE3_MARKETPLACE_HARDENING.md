# PHASE3_MARKETPLACE_HARDENING.md
**KAYAD - Phase 3: Marketplace Core Hardening**

Audits the 19 named marketplace operations against the real, authoritative backend (backend/controllers/carController.js and related routes), focused specifically on this phase's stated non-negotiable properties: no visibility of non-existent/unapproved vehicles, no cross-user listing modification, no accidental public exposure of deactivated listings.

---

## 0. Headline: A Real, Confirmed Vulnerability Found and Fixed

While auditing listing ownership/editing (priorities #17-18), found that updateCar's field-whitelist includes "status" with no restriction on who can set it to what. createCar deliberately computes status AFTER spreading req.body specifically so a client-supplied value can never override the server's own approval decision (confirmed by reading that code directly) - updateCar had no equivalent protection. This meant any listing owner, including one whose account was never approved, could PUT their own car with status: "available" and bypass the approval gate entirely, since approval was otherwise only checked at creation time.

This directly contradicts this phase's own explicit requirement: "a deactivated/unapproved vehicle must not accidentally remain publicly discoverable."

Fixed, narrowly and mirroring createCar's own real logic rather than inventing new rules: the fix only triggers when a request explicitly includes status in its body, and only blocks the specific "moving to available while not approved" transition (forced back to pending). Staff/admin, already-approved owners, and an owner voluntarily hiding their own listing (status: "hidden"/"draft") are all unaffected - this is not a broader status-editing restriction, only the specific approval-bypass path. Verified via full backend syntax validation and the real Jest suite (216/216 passing, unchanged) after the fix.

---

## 1-5. Retrieval, Search, Filtering, Sorting, Pagination

All confirmed real and working, backed by GET /api/cars (carController.js's getCars, extensively audited across Fusion Phases 4-7 and this session):
- Retrieval: real, paginated, default-filtered to status: "available" only.
- Search: keyword param triggers $text search (translated to a real ilike OR-query by the compatibility shim, confirmed in Fusion Phase 4); VIN search is properly regex-escaped against injection.
- Filtering: brand/model/city/price/year/body/fuel/transmission/color/condition/mileage/category all real query params, confirmed against the actual controller code.
- Sorting: not independently re-verified this session - carried forward as unconfirmed rather than assumed working.
- Pagination: real page/limit params with a real pagination object in the response, confirmed in vehicleApi.ts's own type definitions and tests.

Frontend connection status: per docs/PHASE2_MOCK_ELIMINATION.md, the frontend's top-level list attempts this real endpoint with honest fallback to mock data (Fusion Phase 7) - PARTIAL, not fully CONNECTED, since most UI surfaces still read INITIAL_VEHICLES directly rather than this real, paginated/filtered endpoint.

---

## 6-7. Vehicle Detail Pages, Vehicle Images

- Detail retrieval: getCar (single-vehicle) confirmed to enforce the same visibility rule as the list endpoint (see section 0/11) - a non-owner, non-admin requester gets a generic 404 for any non-available/non-sold car, not a 403 or any other signal that would reveal the listing exists but is hidden. This is deliberate, good security design (no information leakage about unapproved/hidden listings), confirmed by direct code read.
- Images: real JSONB array of {url, thumb, public_id} objects via Cloudinary (confirmed in Fusion Phase 5), correctly mapped by mapBackendCarToVehicle().
- Frontend connection: the detail view now falls back to a real getCarById() fetch for IDs outside the initially-loaded list (this session's prior continuation) - confirmed this fallback correctly treats a real backend 404 (including a hidden/unapproved car, since getCar returns exactly that for non-owners) as "invalid", not as a security bypass. This is the correct behavior verified against the real backend logic just audited in this phase, not assumed.

---

## 8-10. VIN/Chassis, Seller Information, Dealer Information

- VIN/chassis: publicly included in responses - correct for this domain (vehicle identification numbers are normally public in a marketplace listing, unlike personal contact details).
- Seller/dealer information: getCar applies real, per-dealer visibility preferences (showPhone/showEmail/showLocation/chatEnabled) before returning the response - confirmed genuine privacy-respecting logic, not a placeholder. Frontend gap, not a backend one: mapBackendCarToVehicle() still maps sellerName to a hardcoded 'Unknown Seller' placeholder despite the backend already providing real, privacy-filtered dealer data via .populate("dealer", ...) - a known, already-documented gap (docs/fusion/phase-06-field-alias-fix.md section 3), not newly found, not fixed this phase.

---

## 11. Verification Status

Confirmed thoroughly this phase (section 0): both the list endpoint (status: "available" default filter) and the detail endpoint (explicit non-owner/non-admin visibility check) correctly gate on verification/approval status. The one real gap found (updateCar's bypass) is fixed. No further gap found in this audit.

---

## 12. Favorites/Saved Vehicles

Already connected and tested (docs/PHASE2_MOCK_ELIMINATION.md section 1) - real backend, auth-required, confirmed scoped to req.user.id in getFavorites (Favorite.find({ user: req.user.id })), so one user cannot see another's saved list. Not re-audited in depth this phase beyond confirming this scoping is real, since it was already verified with dedicated tests in the prior phase.

---

## 13. Vehicle Comparison

Confirmed in Phase 1: entirely client-side/local state (comparedVehicles in useVehicleCollections.ts) - no backend "compared vehicles" concept exists anywhere in the 92 real route files this program has audited. Not a connection gap; there is no existing API to connect to for this specific feature, consistent with this phase's own instruction not to invent new backend capabilities.

---

## 14. Buyer Inquiries

Maps to the Chat domain, already investigated this session's prior continuation (docs/PHASE2_MOCK_ELIMINATION.md section 1b): real backend exists, frontend's own ChatMessage data model is structurally incompatible with it (no conversation/participant concept). Not re-investigated further this phase - status unchanged (MOCK, with a specific, understood reason).

---

## 15-16. Listing Status, Listing Visibility

Covered fully in sections 0 and 11 above - this was the phase's central finding.

---

## 17-19. Listing Ownership, Editing, Removal/Deactivation

Confirmed genuinely solid, both updateCar and deleteCar:
- Real ownership check (car.dealer?.toString() === req.user.id) in both, with sensible, narrow exceptions for demo-car management by staff/dealers.
- deleteCar uses Car.softDelete() (not a hard delete), decrements the owner's listing count correctly, invalidates the relevant cache pattern, and writes to two separate audit-log mechanisms (logActionFromReq, logVehicleDeleted).
- A user cannot modify or delete another user's listing - confirmed by direct code read of the authorization branch in both functions, not assumed from the presence of a protect middleware alone.

The one gap found and fixed in this whole ownership/editing/status area was the status-bypass in section 0 - everything else audited here was already correct.

---

## Certification: Buyer Marketplace Workflow, Search to Inquiry

| Step | Status |
|---|---|
| Search/browse listings | Real backend confirmed solid; frontend PARTIAL (list endpoint attempted with fallback, not all UI surfaces connected) |
| View listing detail | Real backend confirmed solid, including a just-audited visibility guarantee; frontend fallback-fetch confirmed compatible with that guarantee |
| Save/favorite a listing | CONNECTED, tested, real |
| Compare listings | Correctly local-only, no backend gap |
| Contact seller / inquire | MOCK - real backend exists, frontend data model incompatible, documented reason, not fixed this phase |

This phase cannot certify the full search-to-inquiry workflow as complete - the backend's own listing/search/detail/visibility logic is confirmed sound (and one real gap in it was found and fixed), but the workflow as a whole is not fully connected end to end on the frontend, and the final step (inquiry/chat) remains genuinely blocked on a frontend data-model issue outside this phase's "do not redesign screens" scope. What this phase does certify: the backend data a buyer would see, from search through detail view, correctly reflects only authoritative, approved, existing vehicles, with no ownership-bypass path remaining that this audit found.

---

## Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation (node --check, all files) | 0 errors |
| Backend unit test suite (npm test, Jest) | 216/216 passing - confirms the status-bypass fix introduced no regression |
| Frontend | Not modified this phase |

---

## What This Phase Did Not Audit (Explicit)

Sorting behavior was not independently re-verified (carried forward as unconfirmed, not assumed working). Refresh persistence, deep-link behavior beyond the vehicle-detail case already covered in the prior phase, and browser-refresh state restoration for filters/pagination were not independently tested this phase - named as open scope, not silently assumed complete.
