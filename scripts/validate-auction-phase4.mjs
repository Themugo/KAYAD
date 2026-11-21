import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeAuctionSetup, validateConfig, vehicleReadiness } from '../backend/services/auctionSetup.contract.js';

const base = normalizeAuctionSetup({
  startingBid: 100000,
  bidIncrement: 5000,
  reservePrice: 150000,
  reserveMode: 'soft',
  startsAt: '2026-10-10T10:00:00.000Z',
  endsAt: '2026-10-12T10:00:00.000Z',
  registrationDeadline: '2026-10-10T09:00:00.000Z',
  termsAccepted: true,
  winnerFulfilment: { collectionLocation: 'Nairobi', collectionInstructions: 'Collect with ID' },
});
assert.equal(validateConfig(base).length, 0, 'valid setup must pass config validation');
assert.ok(validateConfig({ ...base, bidIncrement: 0 }).includes('Bid increment must be greater than zero'));
assert.ok(validateConfig({ ...base, reservePrice: 90000 }).includes('Reserve price must be >= starting bid'));
assert.ok(validateConfig({ ...base, endsAt: '2026-10-10T20:00:00.000Z' }).includes('Auction duration must be at least 24 hours'));

const readyCar = {
  vin: 'VIN123', registration_number: 'KDA123A', logbook_verified: true, ntsa_verified: true,
  inspection_status: 'passed', images: Array.from({ length: 6 }, (_, i) => ({ url: `https://img/${i}` })),
  title: 'Toyota Hilux', description: 'Complete condition disclosure', location_city: 'Nairobi',
};
assert.equal(vehicleReadiness(readyCar, base).publishable, true);
const blocked = vehicleReadiness({ ...readyCar, inspection_status: 'pending', images: [] }, base);
assert.equal(blocked.publishable, false);
assert.ok(blocked.blockers.some((x) => x.includes('inspection')));
assert.ok(blocked.blockers.some((x) => x.includes('6 vehicle photos')));

const migration = fs.readFileSync('supabase/migrations/20261002190000_auction_setup_publication_contract.sql', 'utf8');
for (const marker of ['CREATE TABLE IF NOT EXISTS auction_setups', 'auction_setup_amendments', 'trg_lock_published_auction_setup', 'Published auction setup is immutable']) assert.ok(migration.includes(marker), marker);

const routes = fs.readFileSync('backend/routes/auctionSetupRoutes.js', 'utf8');
for (const marker of ['/cars/:id/auction/setup', '/cars/:id/auction/publish', '/cars/:id/auction/amendments']) assert.ok(routes.includes(marker), marker);

const wizard = fs.readFileSync('src/pages/dealer/DealerAuctionSetupWizard.jsx', 'utf8');
for (const marker of ['Economics', 'Schedule & Rules', 'Winner & Default', 'Preview & Publish', 'Save & Publish']) assert.ok(wizard.includes(marker), marker);

console.log('PHASE 4 AUCTION SETUP/PUBLICATION: PASS');
console.log('Checks: config validation, readiness gate, schema contract, immutable publication trigger, routes, wizard');
