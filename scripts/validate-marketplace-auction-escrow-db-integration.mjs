import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const migrations = fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
const allSql = migrations.map(f=>read(`supabase/migrations/${f}`)).join('\n');
const server = read('backend/server.js');
const v1 = read('backend/routes/v1.js');
const atomic = read('backend/utils/atomicTransactions.js');
const callback = read('backend/services/paymentCallback.service.js');
const escrowService = read('backend/services/escrow.service.js');
const marketplace = read('backend/services/marketplaceFulfilment.service.js');
const auctionSettlement = read('backend/services/auctionSettlement.service.js');
const auctionFulfilment = read('backend/services/auctionFulfilment.service.js');

let pass=0, fail=0;
function check(label, ok){ if(ok){console.log(`PASS ${label}`);pass++;} else {console.error(`FAIL ${label}`);fail++;} }

const requiredTables = ['public.payments','public.escrows','public.purchase_outcomes','public.auction_outcomes','public.cars'];
for (const t of requiredTables) check(`DB table contract exists: ${t}`, new RegExp(`CREATE TABLE(?: IF NOT EXISTS)?\\s+(?:public\\.)?${t.split('.')[1]}`, 'i').test(allSql) || new RegExp(`ALTER TABLE\\s+(?:public\\.)?${t.split('.')[1]}`, 'i').test(allSql));

for (const fn of ['kayad_settle_purchase_payment_atomic','kayad_transition_purchase_outcome_atomic','kayad_transition_escrow_atomic','kayad_resolve_dispute_atomic']) {
  check(`DB atomic function contract exists: ${fn}`, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\b`, 'i').test(allSql));
}

check('Marketplace outcome has payment uniqueness', /purchase_outcomes_payment_uidx/i.test(allSql));
check('Marketplace pending purchase race is DB-constrained', /uq_pending_marketplace_purchase_per_car/i.test(allSql));
check('Auction outcome is unique per vehicle', /car_id UUID NOT NULL UNIQUE REFERENCES cars\(id\)/i.test(allSql) || /CREATE UNIQUE INDEX[^\n]*auction_outcomes[^\n]*car_id/i.test(allSql));
check('Escrow transitions sync Marketplace purchase outcomes', /syncPurchaseOutcomeFromEscrow/.test(escrowService));
check('Purchase payment callback enters canonical DB settlement', /atomicSettlePurchasePayment\(payment\.id, receipt\)/.test(callback));
check('Purchase settlement wrapper calls canonical RPC', /kayad_settle_purchase_payment_atomic/.test(atomic));
check('Purchase fulfilment uses canonical ownership service', /ownershipService\.addVehicleToGarage/.test(marketplace));
check('Auction fulfilment uses canonical ownership service', /ownershipService\.addVehicleToGarage/.test(auctionFulfilment));
check('Auction settlement does not create a second escrow engine', !/INSERT INTO .*escrow|create.*escrow.*new/i.test(auctionSettlement));
check('Escrow service remains canonical for auction release', /escrowService|releaseEscrow|transitionEscrow/i.test(auctionFulfilment));

// Transport: both compatibility versioned and canonical unversioned mounts must exist.
check('Unversioned canonical Auction read route is mounted', /app\.use\("\/api\/auctions", auctionRoutes\)/.test(server));
check('Versioned canonical Auction read route is mounted', /router\.use\("\/auctions", auctionRoutes\)/.test(v1));
check('Unversioned Marketplace fulfilment route is mounted', /app\.use\("\/api\/marketplace\/purchases", marketplaceFulfilmentRoutes\)/.test(server));
check('Versioned Marketplace fulfilment route is mounted', /router\.use\("\/marketplace\/purchases", marketplaceFulfilmentRoutes\)/.test(v1));
check('Unversioned Escrow route is mounted once', (server.match(/app\.use\("\/api\/escrow"/g)||[]).length===1);
check('Versioned Escrow route is mounted once', (v1.match(/router\.use\("\/escrow"/g)||[]).length===1);
check('Unversioned Auction settlement/fulfilment mounts are unique', (server.match(/app\.use\("\/api\/auctions", auction(?:Settlement|Fulfilment)Routes\)/g)||[]).length===2);

// No duplicate route modules for the new Marketplace purchase boundary.
const routeFiles = fs.readdirSync(path.join(root,'backend/routes')).filter(f=>/marketplace.*fulfilment/i.test(f));
check('Only one Marketplace purchase fulfilment route module exists', routeFiles.length===1 && routeFiles[0]==='marketplaceFulfilmentRoutes.js');

// Migration hygiene remains a hard contract.
const versions = migrations.map(f=>f.split('_')[0]);
check('Migration versions are unique', new Set(versions).size===versions.length);
check('No exact duplicate migration bodies', (()=>{const hashes=new Set(); for(const f of migrations){const s=read(`supabase/migrations/${f}`).replace(/^--.*$/gm,'').replace(/\s+/g,' ').trim(); const h=s; if(h && hashes.has(h)) return false; hashes.add(h);} return true;})());

console.log(`\nMarketplace + Auction + Escrow DB integration audit: ${pass} PASS, ${fail} FAIL`);
if(fail) process.exit(1);
