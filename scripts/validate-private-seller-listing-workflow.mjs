import fs from 'node:fs';
import assert from 'node:assert/strict';

const platform = fs.readFileSync('src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx', 'utf8');
const api = fs.readFileSync('src/services/vehicleApi.ts', 'utf8');
const routes = fs.readFileSync('backend/routes/carRoutes.js', 'utf8');
const controller = fs.readFileSync('backend/controllers/carController.js', 'utf8');
const schema = fs.readFileSync('backend/validation/car.schema.js', 'utf8');

const expectedSteps = ['Start', 'Vehicle', 'Photos', 'Details', 'Ownership', 'Condition', 'Issues', 'Service', 'Inspection', 'Pricing', 'Preview', 'Publish'];
for (const step of expectedSteps) assert.ok(platform.includes(`label: '${step}'`), `Missing workflow step: ${step}`);
for (const field of ['make', 'model', 'year', 'registration', 'vin', 'bodyType', 'mileage', 'fuelType', 'transmission', 'city', 'description', 'ownerConfirmed', 'knownIssues', 'serviceHistory', 'askingPrice']) {
  assert.ok(platform.includes(field), `Missing seller input/data field: ${field}`);
}
assert.match(platform, /type="file"[^>]*accept="image\/jpeg,image\/png,image\/webp"/);
assert.match(platform, /5\s*\*\s*1024\s*\*\s*1024/);
assert.match(platform, /form\.photos\.length\s*===\s*0/);
assert.match(platform, /createCar\(\{/);
assert.match(platform, /images:\s*form\.photos/);
assert.match(platform, /setPublishedCarId\(result\.data\.id\)/);
assert.match(platform, /onPublished\(\)/);
assert.match(platform, /getMyListings\(\)/);
assert.match(api, /formData\.append\('images', file\)/);
assert.match(api, /request<CreateCarResponse>\('\/api\/cars'/);
assert.match(routes, /router\.post\([\s\S]*?sellerListingAccess\(\{ write: true \}\)[\s\S]*?requireDealerVerification[\s\S]*?upload\.array\("images", 10\)[\s\S]*?validateCar[\s\S]*?asyncHandler\(createCar\)/);
assert.match(controller, /At least one image is required/);
assert.match(schema, /title:[\s\S]*?brand:[\s\S]*?model:[\s\S]*?year:[\s\S]*?price:/);
assert.match(platform, /kayad\.privateSeller\.listingDraft\.v1/);
console.log(`PASS: ${expectedSteps.length} workflow stages, required form fields, photo validation, canonical API wiring, seller permission gate, listing refresh and draft persistence.`);
