import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const selling = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const dashboard = read('src/components/DashboardHub.tsx');
const api = read('src/services/vehicleApi.ts');
const backend = read('backend/routes/carRoutes.js');
const checks = [
  ['Personal listing photo manager is embedded', selling.includes('PersonalListingPhotoManager listing={l}')],
  ['Photo upload uses existing addCarImages API', selling.includes('addCarImages(listing.id, valid)')],
  ['Photo deletion uses existing deleteCarImage API', selling.includes('deleteCarImage(listing.id, index)')],
  ['Cover selection uses existing setCoverImage API', selling.includes('setCoverImage(listing.id, index)')],
  ['Photo MIME and file-size validation is applied', selling.includes('LISTING_IMAGE_TYPES.includes(file.type)') && selling.includes('LISTING_IMAGE_MAX_BYTES')],
  ['Listing photo cap is enforced in UI', selling.includes('LISTING_IMAGE_MAX_PER_LISTING') && selling.includes('valid.length > remaining')],
  ['Last photo cannot be removed', selling.includes('images.length <= 1')],
  ['Photo API routes remain mounted', backend.includes('/:id/images/:imageIndex') && backend.includes('/:id/images/cover') && backend.includes('/:id/images')],
  ['Performance reads the owner-scoped first-party analytics API', dashboard.includes('getMyListingPerformance(30)') && api.includes('my-listing-performance') && backend.includes('/my-listing-performance')],
  ['Performance never reports a conversion rate (definitions + honest unavailable state)', read('backend/services/personalSellerInsights.service.js').includes('Not reported: no verified attribution') && !/conversionRate|conversion_rate|enquiry-to-sale/i.test(dashboard)],
  ['Performance is no longer a seller dashboard page', !dashboard.includes("performance: 'listing-quality'")],
  ['Personal selling still refreshes canonical listing data', dashboard.includes('onRefreshListings={refresh}')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
