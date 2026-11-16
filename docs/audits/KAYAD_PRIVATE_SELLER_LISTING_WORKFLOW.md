# Private seller listing workflow repair

## What was repaired

- Replaced the former 12-step progress-only wizard with 12 functional stages: start, vehicle, photos, details, ownership declaration, condition, known issues, service history, inspection guidance, pricing, preview and submission.
- Added responsive, width-constrained form layouts and a horizontally scrollable step rail so the form remains within narrow phone viewports.
- Added required-field checks for vehicle make/model/year, at least one photo, location/description, seller ownership declaration and asking price.
- Added image checks matching the existing upload contract: JPEG/PNG/WebP, maximum 5 MB per image and up to 10 files per submission.
- Connected submission to the existing `createCar` API and `/api/cars` route; the server remains authoritative for free private-seller access, dealer verification, schema validation, upload and listing moderation. Under the launch default, private selling requires no package or seller approval; explicit suspension/revocation and email verification remain enforced.
- Added device-local draft persistence for text fields. Browsers cannot restore selected `File` objects after reload, so the seller must reselect photos when resuming a saved draft.
- Refreshes the signed-in seller dashboard from `getMyListings()` after the server confirms a created listing. Confirmation is not shown optimistically.
- Added `npm run validate:private-seller-listing-workflow` as a source-contract regression check.

## Data contract and important boundaries

The listing payload uses fields already accepted by `backend/validation/car.schema.js`: title, brand, model, year, price, fuel, transmission, mileage, bodyType, color, condition, VIN, registrationNumber, description, city and uploaded images.

The ownership checkbox is a client-side declaration gate only. The current canonical car-create schema does not persist the checkbox or logbook availability, and the current listing-create endpoint does not upload ownership documents. The form therefore does not claim that those details/documents have been stored or verified. Actual ownership/logbook verification remains with the existing Trust Center/admin process.

The condition, issue and service-history notes are included in the listing description because the current canonical create schema has no dedicated structured columns for those subsections. No new database columns or migrations were introduced.

## Validation limits

- The source-contract validator can run without installing project dependencies.
- Full TypeScript, Vite build, Vitest, backend integration tests and real browser/device journeys were not run in this environment because `node_modules` is absent and the available Node runtime is v22.16.0 while the project declares `>=22.22.2`.
- Live listing submission additionally depends on the configured upload provider, authenticated account and verified email. The free launch policy does not require an approved private-seller capability record; this cannot be certified against production until the missing capability migration and policy reconciliation are completed.
