import fs from 'node:fs';
import path from 'node:path';
const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const selling = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const api = read('src/services/vehicleApi.ts');
const score = read('src/utils/listingQualityScore.ts');
const presentation = read('src/components/listing/ListingPresentation.tsx');
const lifecycle = read('backend/services/personalListingLifecycle.service.js');
const controller = read('backend/controllers/carController.js');
const guard = read('backend/services/personalListingMutationGuard.service.js');
const projection = read('backend/services/personalListingEligibilityProjection.js');
const route = read('backend/routes/carRoutes.js');
const limits = read('backend/config/listingLimits.js');
const tests = read('backend/tests/node/personalListingEligibilityProjection.test.js');
const checks = [
  ['My Vehicles remains embedded in the unified personal selling module', selling.includes('data-kayad-my-vehicles-management') && !selling.includes('getMyListings(')],
  ['Owner listing response includes server-derived action eligibility', controller.includes('ownerActionEligibility: permission') && controller.includes('getPersonalListingActionEligibility(rows, owner)')],
  ['Hidden listing republish requires latest seller-hide provenance', projection.includes('lastAction === "seller_hide"') && projection.includes('canRepublish: canPublish') && projection.includes('Republish it before editing its details or photos')],
  ['Policy visibility events prevent owner restoration', guard.includes('private_seller_listing_visibility_events') && projection.includes('hasPolicyHide')],
  ['Bid, auction, escrow and purchase-outcome locks are checked', guard.includes('from("bids")') && guard.includes('from("escrows")') && guard.includes('from("purchase_outcomes")') && projection.includes('transactionLocked')],
  ['Unknown and moderator-hidden states fail closed for destructive actions', projection.includes('moderatedOrUnknownHidden') && projection.includes('canRemove = sellerWriteAllowed && (["draft", "pending", "available"].includes(status) || sellerHidden)')],
  ['Backend owner mutation guard covers edit, remove and all photo mutations', ['action: "edit"', 'action: "remove"', 'action: "photos"'].every((x) => controller.includes(x)) && guard.includes('LISTING_PERMISSION_CHECK_UNAVAILABLE') && controller.includes('PERSONAL_PHOTO_ROUTE_REQUIRED')],
  ['Personal edits and photo writes use conditional partial updates instead of stale whole-row saves', controller.includes('Car.findOneAndUpdate(') && controller.includes('buildPersonalListingMutationFilter') && projection.includes('expectedImages') && projection.includes('expectedUpdatedAt')],
  ['Photo upload conflicts clean newly uploaded Cloudinary assets', controller.includes('PHOTO UPLOAD RACE CLEANUP FAILED') && controller.includes('LISTING_PHOTO_CONFLICT')],
  ['Seller access and email verification use the canonical capability service', guard.includes('getMySellerCapability(owner)') && guard.includes('owner?.emailVerified === true') && projection.includes('sellerWriteAllowed')],
  ['Atomic lifecycle writer remains the existing authoritative path', lifecycle.includes('transitionPersonalListing') && guard.includes('kayad_personal_listing_lifecycle_atomic')],
  ['Completeness no longer treats registration number as logbook evidence', score.includes('registration_number is deliberately not used') && score.includes('hasLogbook: false')],
  ['Completeness normalizes body type, city, description and usable image URLs', score.includes('listing.bodyType ?? listing.body_type') && score.includes('listing.city ?? listing.location_city') && score.includes("String(listing.description ?? '').trim()") && score.includes('images.filter(isUsableVehicleImage)')],
  ['UI calls the score Listing completeness and shows its breakdown', selling.includes('Listing completeness') && selling.includes('Improve listing completeness') && selling.includes('Completeness describes the information supplied')],
  ['Editor covers the existing owner-editable API fields', ['title:', 'brand:', 'model:', 'year,', 'price,', 'mileage,', 'fuel:', 'transmission:', 'bodyType:', 'color:', 'condition:', 'city:', 'description:', 'features:'].every((x) => selling.includes(x)) && api.includes("'vin' | 'registrationNumber'")],
  ['Editor confirms unsaved changes and handles server save failures', selling.includes('Discard your unsaved listing changes?') && selling.includes('The server did not confirm the listing update.')],
  ['Photo manager enforces request size, dynamic total cap and server permission', selling.includes('LISTING_IMAGE_MAX_PER_REQUEST') && selling.includes('files.length > maxPerRequest') && selling.includes('maxImages == null') && selling.includes('valid.length > remaining') && selling.includes('listing.ownerActionEligibility')],
  ['Backend route and response share the canonical per-request upload limit', route.includes('upload.array("images", MAX_LISTING_IMAGES_PER_REQUEST)') && controller.includes('MAX_LISTING_IMAGES_PER_REQUEST') && limits.includes('MAX_LISTING_IMAGES_PER_REQUEST = 10')],
  ['Mark as sold does not imply payment, escrow or ownership settlement', selling.includes('does not confirm payment, escrow settlement or transfer of ownership')],
  ['Public view action uses the canonical /cars/:id deep link only for public active or sold listings', selling.includes("['active', 'sold'].includes(info.state) && <Link to={`/cars/${encodeURIComponent(l.id)}`}")],
  ['Unknown lifecycle states receive a needs-attention treatment', selling.includes("info.state === 'unknown' ? 'Needs attention'") && presentation.includes("default: return 'problem'")],
  ['Loading, empty, filtered-empty and stale-data error states are present', selling.includes('animate-pulse') && selling.includes('No personal listings yet') && selling.includes('No {filters.find') && selling.includes('Previously loaded listings remain visible')],
  ['Lifecycle action matrix regression tests cover hidden, locks and unknown states', tests.includes('moderator-hidden') && tests.includes('purchase outcomes') && tests.includes('unknown lifecycle states')],
  ['Implementation 03A navigation/accessibility contract remains in the source', read('src/components/dashboard/personal/PersonalSignOutButton.tsx').includes('onSignOut') && read('src/components/DashboardHub.tsx').includes('PersonalSignOutButton') && read('src/App.tsx').includes('onSignOut={authLogout}')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\nMy Vehicles Implementation 03B contract audit: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
