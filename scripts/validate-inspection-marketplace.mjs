import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const pass = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const server = read('backend/server.js');
const routes = read('backend/inspection/routes/inspectionRoutes.js');
const controller = read('backend/inspection/controllers/providerController.js');
const booking = read('backend/inspection/services/bookingService.js');
const provider = read('backend/inspection/services/providerService.js');
const discovery = read('backend/inspection/services/providerDiscoveryService.js');
const report = read('backend/inspection/services/reportService.js');
const settlement = read('backend/inspection/services/settlementService.js');
const adapter = read('backend/inspection/services/dbAdapter.js');
const api = read('src/features/InspectionMarketplace/services/api.ts');
const page = read('src/features/InspectionMarketplace/pages/InspectionMarketplacePage.tsx');
const card = read('src/features/InspectionMarketplace/components/ProviderCard.tsx');
const inspectionsView = read('src/features/InspectionsView.tsx');
const app = read('src/App.tsx');
const migration = read('supabase/migrations/20260907070000_inspection_marketplace_integrity.sql');

pass('inspection services use the real DB adapter',
  [provider, booking, report, settlement].every((s) => s.includes("from './dbAdapter.js'")));
pass('canonical singular inspection API is mounted', server.includes('app.use("/api/inspection", inspectionRoutes);'));
pass('plural inspection API remains backward compatible', server.includes('app.use("/api/inspections", inspectionRoutes);'));
pass('provider routes enforce ownership',
  (routes.match(/requireProviderOwnership/g) || []).length >= 14);
pass('private report lookup requires authentication', routes.includes("router.get('/reports/:reportId', requireAuth, controller.getReport);"));
pass('customer booking lookup is access checked', controller.includes("getBookingDetails(booking.id, 'customer', req.user.id)"));
pass('customer cancellation passes the correct argument order',
  controller.includes("bookingService.cancelBooking(\n    req.params.bookingId,\n    reason,\n    req.user.id"));
pass('provider booking mutations verify provider ownership',
  booking.includes("Booking does not belong to this provider"));
pass('report mutations verify provider/customer/admin access',
  report.includes('You do not have access to this report'));
pass('booking slots are provider-aware', booking.includes('provider_id: provider.id'));
pass('booking race is backed by a DB unique active-slot index', migration.includes('idx_inspection_bookings_active_slot'));
pass('payment double-processing is backed by a DB unique index', migration.includes('idx_inspection_one_completed_payment'));
pass('settlement writes have matching payment columns', migration.includes('ADD COLUMN IF NOT EXISTS payment_method'));
pass('inspection API unwraps the shared response envelope', api.includes('response?.data?.data ?? response?.data'));
pass('provider search returns the shape consumed by the marketplace UI', discovery.includes('return { items, total, page: f.page') && provider.includes('searchEligibleProviders(filters)'));
// Automotive-services convergence: the price/rating sort controls were removed (ordering is distance -> verified capability -> name).
// What must still hold is that a price is only ever shown when a real provider-level starting price is stored.
pass('provider starting price is real and null-safe (never invented)', discovery.includes('p.starting_price == null ? null') && migration.includes('starting_price NUMERIC'));
pass('provider starting price stays synchronized with active packages', migration.includes('trg_inspection_package_starting_price'));
pass('provider search does not query a nonexistent deleted_at column', !provider.includes('deleted_at: null'));
pass('marketplace is reachable from the main inspection view',
  app.includes("activeNav === 'inspection-marketplace'") && inspectionsView.includes('onOpenInspectionMarketplace'));
pass('provider card uses an in-app selection callback instead of a dead href',
  card.includes('onSelect?:') && card.includes('onClick={() => onSelect?.(provider)}'));
pass('fake marketplace headline stats were removed',
  !page.includes('5,000+') && !page.includes("East Africa's largest vehicle inspection marketplace"));
pass('public provider search defaults to verified profiles', discovery.includes(".eq('verification_status', 'verified')") && discovery.includes(".eq('lifecycle_stage', 'ACTIVE')") && discovery.includes(".eq('status', 'active')"));
pass('public provider profile rejects inactive or unverified providers', provider.includes("provider.status !== 'active'") && provider.includes("provider.verification_status !== 'verified'"));
pass('marketplace selection opens provider profile before booking', page.includes('ProviderProfilePage') && page.includes('onBook={() => setBookingProvider(selectedProvider)}'));
pass('booking request has no client discount authority', !api.includes('discount?: number'));
pass('booking total is derived only from canonical package price plus server mobile fee', booking.includes('const basePrice = Number(pkg.price);') && booking.includes('const totalPrice = basePrice + mobileFee;'));
pass('stored booking discount is server-controlled', booking.includes('discount: 0'));
pass('payment initiation derives amount from stored booking', controller.includes('amount: Number(booking.total_price)'));
pass('booking route validates customer input before service execution', routes.includes("validate(inspectionBookingSchema), controller.createBooking"));
pass('booking schema excludes client-controlled monetary fields', !read('backend/validation/phase22.schema.js').includes('discount:') && !read('backend/validation/phase22.schema.js').includes('totalPrice:'));
pass('booking requires active verified provider', booking.includes("provider.status !== 'active' || provider.verification_status !== 'verified'"));
pass('mobile booking respects provider mobile capability', booking.includes("bookingData.isMobile && !provider.offers_mobile"));
pass('workshop booking respects provider workshop capability', booking.includes("bookingData.isMobile === false && !provider.has_workshop"));
pass('booking rejects invalid canonical package price', booking.includes('Number.isFinite(basePrice) || basePrice < 0'));
pass('booking UI surfaces payment or booking errors', page.includes('errorMessage') || read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('errorMessage'));
pass('booking UI treats displayed total as a pre-booking estimate', read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('pre-booking estimate only'));
pass('booking date generation avoids UTC rollover', read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('date.getFullYear()'));


let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
  if (!c.ok) failed++;
}
console.log(`\nInspection marketplace validation: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
