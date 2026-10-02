import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["registration migration", "supabase/migrations/20261002193000_auction_bidder_registration_eligibility.sql", [/CREATE TABLE IF NOT EXISTS auction_registrations/, /UNIQUE\(auction_id, bidder_id\)/, /auction_registration_events/, /ROW LEVEL SECURITY/, /WITH CHECK \(false\)/]],
  ["registration service", "backend/services/auctionRegistration.service.js", [/registerForAuction/, /initiateRegistrationCommitment/, /finalizeCommitmentRegistration/, /assertBidderAuthorized/, /pending_commitment/, /termsVersion/]],
  ["registration routes", "backend/routes/auctionRegistrationRoutes.js", [/router\.post/, /registration\/commitment/, /authorization/]],
  ["bid gate", "backend/controllers/bidController.js", [/assertBidderAuthorized/]],
  ["payment convergence", "backend/services/bidSecurityService.js", [/finalizeCommitmentRegistration/, /auctionRegistrationId/, /recipientAccount/]],
  ["v1 mount", "backend/routes/v1.js", [/auctionRegistrationRoutes/, /router\.use\(\"\/auctions\", auctionRegistrationRoutes\)/]],
];
let failed=0;
for (const [name, rel, patterns] of checks) {
  const text=fs.readFileSync(path.join(root,rel),"utf8");
  const missing=patterns.filter(p=>!p.test(text));
  if(missing.length){ console.error(`FAIL ${name}: ${missing.length} contract(s) missing`); failed++; }
  else console.log(`PASS ${name}`);
}
process.exitCode=failed?1:0;
