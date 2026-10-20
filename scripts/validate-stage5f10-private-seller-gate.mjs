#!/usr/bin/env node
// Static contract validator for Stage 5F.10. It proves the *wiring* exists (the behavioural proof is test:pg:stage5f10 and test:http:stage5f10).
import { readFileSync, existsSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const MIG = 'supabase/migrations/20261020170000_private_seller_auction_gate_enforcement.sql';
const mig = read(MIG);
const checks = [];
const ok = (name, cond) => checks.push([name, !!cond]);

for (const fn of ['kayad_place_bid_atomic', 'kayad_auto_bid_atomic', 'kayad_start_auction_atomic', 'kayad_start_scheduled_auction_atomic', 'kayad_settle_bid_payment_atomic']) {
  const m = new RegExp(`CREATE OR REPLACE FUNCTION ${fn}\\([\\s\\S]*?\\n\\$\\$;`).exec(mig);
  ok(`${fn} re-created in migration`, m);
  ok(`${fn} evaluates the gate inside its transaction`, m && /kayad_private_seller_(assert_eligible|gate)\(/.test(m[0]));
  ok(`${fn} locks the car before the gate`, m && m[0].search(/FOR UPDATE/) !== -1 && m[0].search(/FOR UPDATE/) < m[0].search(/kayad_private_seller_(assert_eligible|gate)\(/));
}
ok('cars backstop trigger', /trg_cars_private_seller_backstop/.test(mig));
ok('auction_setups publish backstop trigger', /trg_auction_setups_private_seller_backstop/.test(mig));
ok('audit tables append-only', /append[-_ ]only/i.test(mig) && /BEFORE UPDATE OR DELETE|BEFORE UPDATE OR DELETE OR TRUNCATE|TRUNCATE/.test(mig));
ok('RLS enabled on proposal tables', (mig.match(/ENABLE ROW LEVEL SECURITY/g) || []).length >= 4);
ok('gate functions not executable by anon/authenticated', /REVOKE ALL ON FUNCTION kayad_private_seller_gate\(uuid, boolean\) FROM PUBLIC/.test(mig) && !/GRANT EXECUTE ON FUNCTION kayad_private_seller_gate\(uuid, boolean\) TO (anon|authenticated)/.test(mig));
ok('rollback runbook exists and is non-destructive', existsSync(new URL('../runbooks/stage5f10-private-seller-custody-20261020/rollback_20261020170000.sql', import.meta.url)) && !/DROP TABLE|TRUNCATE\s+TABLE|DELETE FROM private_seller/i.test(read('runbooks/stage5f10-private-seller-custody-20261020/rollback_20261020170000.sql')));

const svc = read('backend/services/privateSellerAuctionEligibility.service.js');
ok('service calls the DB gate', /kayad_private_seller_gate/.test(svc) && /kayad_private_seller_gate_batch/.test(svc));
ok('service has no "no proposal => eligible" shortcut', !/not_private_seller_proposal/.test(svc) && !/findOne\(/.test(svc));
ok('service fails closed with 503', /ELIGIBILITY_UNAVAILABLE/.test(svc) && /status: 503/.test(svc));

const atomic = read('backend/utils/atomicTransactions.js');
for (const f of ['atomicPlaceBid', 'atomicAutoBid', 'atomicStartAuction', 'atomicStartScheduledAuction', 'atomicSettleBidPayment']) {
  const b = new RegExp(`export async function ${f}\\([\\s\\S]*?\\n}\\n`).exec(atomic);
  ok(`${f} maps the gate refusal to 409`, b && /throwMapped\(error\)/.test(b[0]));
}
const bid = read('backend/controllers/bidController.js');
{ const a = bid.indexOf('await assertPrivateSellerAuctionEligible('), b = bid.indexOf('await initiatePayment('); ok('bid pre-check runs before payment is initiated', a !== -1 && b !== -1 && a < b); }
for (const [file, token] of [
  ['backend/controllers/auctionController.js', 'gateOpenAuctions'], ['backend/controllers/carController.js', 'evaluateEligibilityBatch'], ['backend/services/auctionRoom.service.js', 'evaluatePrivateSellerAuctionEligibility'],
  ['backend/services/sitemapService.js', 'evaluateEligibilityBatch'], ['backend/services/leadService.js', 'evaluateEligibilityBatch'], ['backend/services/auctionReminderCron.js', 'evaluateEligibilityBatch'], ['backend/services/reminderAutomationService.js', 'evaluateEligibilityBatch'], ['backend/services/auctionLifecycle.service.js', 'assertPrivateSellerAuctionEligible'], ['backend/services/auctionSetup.service.js', 'assertPrivateSellerAuctionEligible'],
]) ok(`${file} uses the DB-backed gate`, read(file).includes(token));
ok('proposal router mounted', /\/api\/private-seller-auctions/.test(read('backend/server.js')));
const routes = read('backend/routes/privateSellerAuctionRoutes.js');
ok('admin routes require admin role AND permission', (routes.match(/requireRole\("admin", "superadmin"\), requirePermission/g) || []).length >= 4);
ok('mutations require Idempotency-Key', /requireIdempotencyKey/.test(routes));
ok('seller UI is inside PrivateSellerPlatform (no second dashboard)', /AuctionVerificationSection/.test(read('src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx')));
ok('admin UI mounted in AdminView', /AdminAuctionVerification/.test(read('src/features/AdminView.tsx')));

let fail = 0;
for (const [name, pass] of checks) { if (!pass) fail++; console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); }
console.log(`stage5f10 gate contract: ${checks.length - fail}/${checks.length} passed`);
process.exit(fail ? 1 : 0);
