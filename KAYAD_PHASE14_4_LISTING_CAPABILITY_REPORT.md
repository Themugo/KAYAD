# Phase 14.4 — Dealer Listing Capability Report

## Audit result (source-read; no code changed during the audit)
| Capability | Backend contract | Guards | Frontend before 14.4 | After 14.4 |
|---|---|---|---|---|
| Create | `POST /api/cars` multipart, `upload.array("images",10)`, ≥1 image | `protect`, `sellerListingAccess({write:true})` (dealers → `dealerOnly`), `requireDealerVerification`, `validateCar` (`createCarSchema`), entitlement `assertDealerCanCreateListing`; `dealer = req.user.id` set server-side | `createCar()` existed but no dealer UI; **sent JSON, not multipart (defect, fixed)** | Inventory → **Add vehicle** form |
| Edit | `PUT /api/cars/:id` partial JSON (`updateCarSchema`) | owner-or-staff (`car.dealer === req.user.id`, else 403); staff-only fields blocked; auction fields locked once auction leaves draft | no `updateCar()` | `updateCar()` + per-row **Edit** |
| Delete / image add-delete | `DELETE /api/cars/:id`, image routes | owner/staff | none | **Not implemented** (out of scope; documented) |

## What was built
* `src/pages/dealer/dashboard/DealerListingForm.tsx` — create/edit form. URL-backed through the Inventory section (`?section=inventory&mode=new` / `&mode=edit&id=`), so Back/Forward/refresh work and no new App route (and no new route-guard surface) was needed.
* Fields (all exist in `createCarSchema`): title*, brand*, model, year, price, mileage, fuel, transmission, colour, condition, city, description, photos (create: 1–10).
* Client validation mirrors the schema for fast feedback only; the server stays authoritative.
* States: idle, validation errors (focus first invalid field, `aria-invalid`/`aria-describedby`), submitting (all inputs and buttons disabled, `aria-busy`, ref-based duplicate-submit guard), server failure (alert, entries kept, retry), success (inventory refetched, success status message, URL returns to inventory), unsaved-changes protection (`beforeunload` + confirm on Cancel/Back).
* Edit only opens for an id present in the dealer's own `getMyListings()` result (caller-scoped on the server); an unknown id shows "not found in your inventory". The backend `PUT` independently returns 403 to non-owners.
* Edit does not manage photos (separate image routes; documented limitation shown in the form).

## Defect found and fixed during 14.4
`createCar()` called the shared axios client without a multipart header. The client default is `Content-Type: application/json`, under which axios serialises `FormData` to JSON, so images were dropped and the server would have answered "At least one image is required." Proven in a real browser (request body `{"title":…,"images":{}}`) and fixed by declaring `multipart/form-data` (the browser then sets the boundary), matching the other FormData call sites in `api.exports.ts`. Unit test added; browser re-run confirms multipart.

## Not claimed
* No live listing was created against a real backend (BLOCKED, see live-session report).
* Server-side ownership / unauthorized / cross-organization enforcement is covered by existing backend suites (re-run, results in the matrix) and **mocked** frontend tests for the 403 display; not live-verified.
