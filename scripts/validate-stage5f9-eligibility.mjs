import fs from 'node:fs';
const checks = [
 ['shared evaluator exists', 'backend/services/privateSellerAuctionEligibility.service.js', 'evaluatePrivateSellerAuctionEligibility'],
 ['publish setup imports gate', 'backend/services/auctionSetup.service.js', 'assertPrivateSellerAuctionEligible'],
 ['canonical lifecycle imports gate', 'backend/services/auctionLifecycle.service.js', 'assertPrivateSellerAuctionEligible'],
 ['manual bid controller imports gate', 'backend/controllers/bidController.js', 'assertPrivateSellerAuctionEligible'],
 ['persistence contract migration exists', 'supabase/migrations/20261020160000_private_seller_auction_custody_contract.sql', 'private_seller_auction_proposals'],
]; let failed=0;
for (const [label,file,needle] of checks) { const ok=fs.existsSync(file)&&fs.readFileSync(file,'utf8').includes(needle); console.log(`${ok?'PASS':'FAIL'} ${label}`); if(!ok) failed++; }
const sqlDir='supabase/migrations';
const sql=fs.readdirSync(sqlDir).filter(f=>f.endsWith('.sql')).map(f=>fs.readFileSync(`${sqlDir}/${f}`,'utf8')).join('\n');
for (const rpc of ['kayad_place_bid_atomic','kayad_auto_bid_atomic','kayad_start_auction_atomic','kayad_start_scheduled_auction_atomic']) { const ok=sql.includes(rpc); console.log(`${ok?'FOUND':'MISSING'} atomic RPC source ${rpc}; enforcement body not verified by this validator`); }
console.log(`${checks.length-failed}/${checks.length} source integration checks passed`); if(failed) process.exitCode=1;
