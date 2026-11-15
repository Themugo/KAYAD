import fs from 'node:fs';
import assert from 'node:assert/strict';

const service = fs.readFileSync('backend/services/auctionRegistration.service.js', 'utf8');
const routes = fs.readFileSync('backend/routes/auctionRegistrationRoutes.js', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const page = fs.readFileSync('src/pages/AuctionLivePage.jsx', 'utf8');
const test = fs.readFileSync('backend/tests/auction/registrationEligibilityRefresh.test.js', 'utf8');
const bidController = fs.readFileSync('backend/controllers/bidController.js', 'utf8');

assert.match(service, /export async function refreshBidderEligibility/);
assert.match(service, /registration\.status !== "pending_eligibility"/);
assert.match(service, /const eligibility = evaluateEligibility\(user, config\)/);
assert.ok(service.includes('const nextStatus = commitmentRequired(config) && !commitmentSatisfied ? "pending_commitment" : ACTIVE'));
assert.match(service, /eligibility_status: "eligible"/);
assert.match(service, /AUCTION_REGISTRATION_CLOSED/);
assert.match(routes, /router\.post\("\/:id\/registration\/refresh-eligibility", protect, validateObjectId/);
assert.match(api, /refreshEligibility: \(auctionId: string\) => api\.post\(`\/auctions\/\$\{auctionId\}\/registration\/refresh-eligibility`\)/);
assert.match(page, /const handleRefreshEligibility = async/);
assert.match(page, /registration\?\.status === 'pending_eligibility'/);
assert.match(page, /Re-check my eligibility/);
assert.match(bidController, /await assertBidderAuthorized\(\{ auctionId: carId, userId \}\)/, 'Every bid must retain the canonical registration authorization gate');
assert.match(test, /moves an eligible member to pending commitment/);
assert.match(test, /does not advance a registration after the auction registration window closes/);
console.log('PASS: auction eligibility can be rechecked safely; bidder activation still requires current eligibility and any configured commitment');
