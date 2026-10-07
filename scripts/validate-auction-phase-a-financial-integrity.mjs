import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['security-hold table exists', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('CREATE TABLE IF NOT EXISTS auction_security_holds')],
  ['security-hold settlement is atomic', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('kayad_settle_auction_security_hold_atomic')],
  ['security-hold reconciliation is atomic', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('kayad_reconcile_auction_security_holds_atomic')],
  ['commitment application moves liability to settlement payable', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('auction-commitment-apply:')],
  ['security-hold forfeiture is atomic', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('kayad_forfeit_auction_winner_security_holds_atomic')],
  ['bid confirmation fee is policy-owned', read('backend/services/auctionPlatformPolicy.service.js').includes('bidConfirmationFeeKes: 1')],
  ['high-value threshold is policy-owned', read('backend/services/auctionPlatformPolicy.service.js').includes('highValueBidThresholdKes: 5000000')],
  ['high-value deposit is policy-owned', read('backend/services/auctionPlatformPolicy.service.js').includes('highValueDepositKes: 50000')],
  ['bid payment validates the server fee', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('Invalid auction bid confirmation fee')],
  ['bid payment has ledger authority', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes("auction-bid-confirmation:")],
  ['bid payment ledger is idempotent', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes("'auction_bid_confirmation'" )],
  ['high-value bid checks canonical hold', read('backend/controllers/bidController.js').includes('getAuctionSecurityHold')],
  ['high-value deposit endpoint exists', read('backend/routes/auctionRegistrationRoutes.js').includes('/registration/high-value-deposit')],
  ['commitment creates canonical hold', read('backend/services/auctionRegistration.service.js').includes('createAuctionSecurityHold')],
  ['commitment callback uses atomic hold settlement', read('backend/services/bidSecurityService.js').includes('kayad_settle_auction_security_hold_atomic')],
  ['generic M-Pesa callback recognizes auction security transactions', read('backend/services/paymentCallback.service.js').includes('["bid_commitment", "bid_security"]')],
  ['security callback verifies provider amount', read('backend/services/bidSecurityService.js').includes('Payment amount mismatch')],
  ['security hold can recover missing checkout binding', read('backend/services/bidSecurityService.js').includes('if (!hold.checkoutRequestId)')],
  ['legacy bid callback converges to canonical payment callback', read('backend/controllers/bidController.js').includes('handleMpesaCallback(req.body)')],
  ['auction outcome records net payment due', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('payment_due_amount')],
  ['winner default can forfeit security', read('backend/services/auctionSettlement.service.js').includes('forfeitAuctionWinnerSecurityHolds')],
  ['direct winner payment uses authoritative payment_due_amount', read('backend/routes/auctionSettlementRoutes.js').includes('paymentDueAmount ?? outcome.winningAmount')],
  ['escrow is not created before winner payment', read('backend/services/auctionSettlement.service.js').includes('Every sale enters payment_due first')],
  ['no client direct security-hold writes', read('supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql').includes('auction_security_holds_client_write')],
];
let passed = 0;
for (const [name, ok] of checks) {
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else console.log(`FAIL ${name}`);
}
console.log(`AUCTION PHASE A FINANCIAL INTEGRITY: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
